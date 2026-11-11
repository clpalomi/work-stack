import test from 'node:test';
import assert from 'node:assert/strict';
import { sessionEndingAt } from '../js/session-time.js';

test('subtracts duration from the clicked end time', () => {
  assert.deepEqual(sessionEndingAt(new Date(2026, 10, 11, 15, 30), 90), {
    dateISO: '2026-11-11', startTime: '14:00',
  });
});
test('uses the previous start date across midnight and a year boundary', () => {
  assert.deepEqual(sessionEndingAt(new Date(2026, 0, 1, 0, 15), 45), {
    dateISO: '2025-12-31', startTime: '23:30',
  });
});
test('retains a fixed end instant when duration changes, including 24-hour sessions', () => {
  const end = new Date(2026, 10, 11, 12, 0);
  assert.equal(sessionEndingAt(end, 30).startTime, '11:30');
  assert.equal(sessionEndingAt(end, 60).startTime, '11:00');
  assert.deepEqual(sessionEndingAt(end, 1440), { dateISO: '2026-11-10', startTime: '12:00' });
  assert.equal(end.getHours(), 12);
});
test('rejects absent, fractional, and excessive durations and invalid end dates', () => {
  for (const minutes of [0, -1, NaN, 1.5, 1441]) assert.throws(() => sessionEndingAt(new Date(), minutes), RangeError);
  assert.throws(() => sessionEndingAt(new Date('invalid'), 30), RangeError);
});
