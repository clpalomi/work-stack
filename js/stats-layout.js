import { summarizeWeek } from './weekly.js';

export const iso = date => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
export const parseDate = value => new Date(`${value}T12:00:00`);
export const shift = (date, days) => { const result = new Date(date); result.setDate(result.getDate() + days); return result; };

// Split overnight entries across calendar days; keep untimed history out of the time grid.
export function buildWeekSchedule(rows, selected = new Date()) {
  const days = summarizeWeek([], selected).days.map(day => ({ ...day, slots: [], untimed: [] }));
  for (const row of rows) {
    const minutes = Number(row.minutes);
    if (!Number.isFinite(minutes) || minutes <= 0) continue;
    const date = String(row.date || '').slice(0, 10);
    const time = /^(\d{2}):(\d{2})/.exec(row.start_time || '');
    if (!time || +time[1] > 23 || +time[2] > 59) {
      days.find(day => day.date === date)?.untimed.push(row);
      continue;
    }
    const base = parseDate(date);
    if (Number.isNaN(base.getTime())) continue;
    let remaining = minutes;
    let start = +time[1] * 60 + +time[2];
    // Timed durations are constrained to 24 hours in the form and database.
    for (let offset = 0; remaining > 0 && offset < 2; offset++) {
      const duration = Math.min(remaining, 1440 - start);
      const day = days.find(day => day.date === iso(shift(base, offset)));
      if (day) day.slots.push({ row, start, end: start + duration, duration });
      remaining -= duration;
      start = 0;
    }
  }
  for (const day of days) {
    const lanes = [];
    day.slots.sort((a, b) => a.start - b.start || a.end - b.end);
    for (const slot of day.slots) {
      let lane = lanes.findIndex(end => end <= slot.start);
      if (lane === -1) lane = lanes.length;
      lanes[lane] = slot.end;
      slot.lane = lane;
    }
    day.lanes = Math.max(1, lanes.length);
    day.minutes = day.slots.reduce((sum, slot) => sum + slot.duration, 0)
      + day.untimed.reduce((sum, row) => sum + Number(row.minutes), 0);
  }
  return days;
}

