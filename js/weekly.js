// Calendar weeks start on Monday, using the viewer's local date.
export function summarizeWeek(rows, now = new Date()) {
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  monday.setDate(monday.getDate() - (monday.getDay() + 6) % 7);
  const iso = date => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  const days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(monday);
    date.setDate(date.getDate() + i);
    return { date: iso(date), label: date.toLocaleDateString(undefined, { weekday: 'short' }), minutes: 0 };
  });
  const previous = new Date(monday);
  previous.setDate(previous.getDate() - 7);
  const start = iso(previous);
  let previousMinutes = 0;
  for (const row of rows) {
    const date = String(row.date || '').slice(0, 10);
    const minutes = Number(row.minutes);
    if (!Number.isFinite(minutes) || minutes < 0) continue;
    const day = days.find(day => day.date === date);
    if (day) day.minutes += minutes;
    else if (date >= start && date < days[0].date) previousMinutes += minutes;
  }
  return { days, minutes: days.reduce((sum, day) => sum + day.minutes, 0), previousMinutes };
}

export function renderWeeklySummary(rows, selectedDate, onSelect) {
  const root = document.getElementById('weeklySummary');
  const { days, minutes, previousMinutes } = summarizeWeek(rows);
  const hours = value => `${(value / 60).toLocaleString(undefined, { maximumFractionDigits: 1 })} hr`;
  const difference = minutes - previousMinutes;
  const change = previousMinutes === 0
    ? (minutes ? 'First hours across these two weeks' : 'No hours across these two weeks')
    : `${difference > 0 ? '+' : difference < 0 ? '−' : ''}${hours(Math.abs(difference))} vs last week`;
  const max = Math.max(1, ...days.map(day => day.minutes));
  root.hidden = false;
  root.innerHTML = `
    <div class="week-heading"><div><h2>This week</h2><strong>${hours(minutes)}</strong><p>${change}</p></div>
    <button type="button" id="clearWeekFilter" ${selectedDate ? '' : 'hidden'}>Show all entries</button></div>
    <div class="week-chart" role="group" aria-label="Daily hours, Monday to Sunday. Select a day to filter entries.">
      ${days.map(day => `<button type="button" class="week-day" data-date="${day.date}" aria-pressed="${selectedDate === day.date}" aria-label="${day.date}: ${hours(day.minutes)}. Filter entries.">
        <span class="week-value">${hours(day.minutes)}</span><span class="week-track" aria-hidden="true"><span style="height:${day.minutes / max * 100}%"></span></span><span>${day.label}</span>
      </button>`).join('')}
    </div><p class="week-note">Monday–Sunday · Based on your latest 100 entries · Select a day to filter</p>
    <p class="week-filter" aria-live="polite">${selectedDate ? `Showing entries for ${selectedDate}` : 'Showing all entries'}</p>`;
  root.querySelectorAll('[data-date]').forEach(button => button.addEventListener('click', () => onSelect(button.dataset.date === selectedDate ? null : button.dataset.date)));
  root.querySelector('#clearWeekFilter').addEventListener('click', () => onSelect(null));
}
