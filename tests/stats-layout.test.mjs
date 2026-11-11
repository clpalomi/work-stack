import test from 'node:test';
import assert from 'node:assert/strict';
import { buildWeekSchedule } from '../js/stats-layout.js';

const monday = new Date(2026, 10, 2);
const row = (date, start_time, minutes, task = 'Working') => ({ date, start_time, minutes, task, project: 'Demo' });

test('splits overnight work, including carryover into Monday and clipping at Sunday', () => {
  const days = buildWeekSchedule([
    row('2026-11-01', '23:30', 120),
    row('2026-11-03', '23:45', 60),
    row('2026-11-08', '23:30', 60),
  ], monday);
  assert.equal(days[0].slots[0].start, 0);
  assert.equal(days[0].minutes, 90);
  assert.equal(days[1].minutes, 15);
  assert.equal(days[2].minutes, 45);
  assert.equal(days[6].minutes, 30);
});

test('overlapping sessions use separate lanes; adjacent sessions can reuse a lane', () => {
  const day = buildWeekSchedule([
    row('2026-11-02', '09:00', 60),
    row('2026-11-02', '09:30', 60),
    row('2026-11-02', '10:00', 30),
  ], monday)[0];
  assert.equal(day.lanes, 2);
  assert.notEqual(day.slots[0].lane, day.slots[1].lane);
  assert.equal(day.slots[0].lane, day.slots[2].lane);
});

test('unknown times stay untimed; old and invalid-duration records do not become slots', () => {
  const days = buildWeekSchedule([
    row('2026-11-02', null, 45), row('2026-11-02', undefined, 30),
    row('2026-10-31', null, 500), row('2026-11-02', '12:00', -1),
  ], monday);
  assert.equal(days[0].untimed.length, 2);
  assert.equal(days[0].minutes, 75);
  assert.equal(days[0].slots.length, 0);
});

test('calendar weeks and midnight work across a year boundary', () => {
  const days = buildWeekSchedule([row('2025-12-31', '00:00:00', 60)], new Date(2026, 0, 4));
  assert.equal(days[0].date, '2025-12-29');
  assert.equal(days[6].date, '2026-01-04');
  assert.equal(days[2].slots[0].start, 0);
});
