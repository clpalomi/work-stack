// Store the session's local start date/time; the clicked end instant stays fixed.
export function sessionEndingAt(end, minutes) {
  if (!(end instanceof Date) || !Number.isFinite(end.getTime())
      || !Number.isInteger(minutes) || minutes < 1 || minutes > 1440) {
    throw new RangeError('Enter a duration between 1 and 1440 whole minutes.');
  }
  const start = new Date(end.getTime() - minutes * 60_000);
  const pad = value => String(value).padStart(2, '0');
  return {
    dateISO: `${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(start.getDate())}`,
    startTime: `${pad(start.getHours())}:${pad(start.getMinutes())}`,
  };
}
