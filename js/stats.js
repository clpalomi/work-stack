import { fetchEntriesBetween, getSessionUser } from './client.js';
import { summarizeWeek } from './weekly.js';

import { buildWeekSchedule, iso, parseDate, shift } from './stats-layout.js';
const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const clock = minutes => `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
const color = project => {
  let hash = 0;
  for (const character of String(project || 'No project')) hash = (hash * 31 + character.codePointAt(0)) | 0;
  return `hsl(${(hash >>> 0) % 360} 55% 38%)`;
};


let selectedWeek;
let request = 0;
let initialized = false;

function renderSchedule(rows) {
  const days = buildWeekSchedule(rows, selectedWeek);
  const content = document.getElementById('statsContent');
  const label = (row, timing) => `${row.project || 'No project'} · ${row.task || 'Untitled task'} · ${timing}`;
  const hasEntries = days.some(day => day.slots.length || day.untimed.length);
  const hasUntimed = days.some(day => day.untimed.length);
  const slotMarkup = (slot, day) => {
    const text = label(slot.row, `${day.date} ${clock(slot.start)}–${clock(slot.end)} (${slot.duration} min)`);
    return `<button type="button" class="stats-slot" title="${escape(text)}" aria-label="${escape(text)}" style="top:${slot.start / 2}px;height:${slot.duration / 2}px;left:${slot.lane / day.lanes * 100}%;width:${100 / day.lanes}%;background:${color(slot.row.project)}"></button>`;
  };
  content.innerHTML = `${hasEntries ? '' : '<p>No work logged this week.</p>'}<div class="stats-scroll" tabindex="0" role="region" aria-label="Weekly work timeline"><div class="stats-grid">
    <div></div>${days.map(day => `<div class="stats-day-heading">${escape(day.label)} ${day.date.slice(5)}<span>${day.minutes} min</span></div>`).join('')}
    <div class="stats-axis">${Array.from({length:24}, (_, hour) => `<span style="top:${hour * 30}px">${clock(hour * 60)}</span>`).join('')}</div>
    ${days.map(day => `<div class="stats-day" role="group" aria-label="${day.date}">${day.slots.map(slot => slotMarkup(slot, day)).join('')}</div>`).join('')}
    ${hasUntimed ? `<div class="stats-untimed-label">Time not recorded</div><div></div>${days.map(day => `<div class="stats-untimed">${day.untimed.map(row => {
      const text = label(row, `${day.date}, ${row.minutes} min · start time not recorded`);
      return `<button type="button" title="${escape(text)}" aria-label="${escape(text)}" style="background:${color(row.project)}">${escape(row.project)} · ${escape(row.task)} (${Number(row.minutes)} min)</button>`;
    }).join('')}</div>`).join('')}` : ''}
    </div></div>`;
  content.querySelectorAll('button[title]').forEach(button => {
    const show = () => { document.getElementById('statsDetails').textContent = button.title; };
    button.addEventListener('mouseenter', show);
    button.addEventListener('focus', show);
    button.addEventListener('click', show);
  });
}

async function loadWeek() {
  const token = ++request;
  const content = document.getElementById('statsContent');
  const days = summarizeWeek([], selectedWeek).days;
  document.getElementById('statsDate').value = days[0].date;
  document.getElementById('statsNext').disabled = days[0].date >= summarizeWeek([]).days[0].date;
  document.getElementById('statsRange').textContent = `${days[0].date} – ${days[6].date}`;
  document.getElementById('statsDetails').textContent = 'Hover, focus, or tap a work slot for details.';
  content.textContent = 'Loading…';
  content.setAttribute('aria-busy', 'true');
  try {
    const user = await getSessionUser();
    if (token !== request || !document.getElementById('statsDialog').open) return;
    if (!user) { content.textContent = 'Sign in to see your weekly stats.'; return; }
    // Include Sunday to carry sessions that cross into Monday into the selected week.
    const rows = await fetchEntriesBetween(user.id, iso(shift(parseDate(days[0].date), -1)), days[6].date);
    if (token === request && document.getElementById('statsDialog').open) renderSchedule(rows);
  } catch (error) {
    console.error(error);
    if (token === request) content.textContent = 'Could not load this week. Try selecting the week again.';
  } finally {
    if (token === request) content.removeAttribute('aria-busy');
  }
}

export function openWeeklyStats() {
  const dialog = document.getElementById('statsDialog');
  if (!initialized) {
    initialized = true;
    document.getElementById('statsClose').addEventListener('click', () => dialog.close());
    dialog.addEventListener('close', () => {
      ++request;
      document.getElementById('statsContent').replaceChildren();
      document.getElementById('statsDetails').textContent = '';
    });
    document.getElementById('statsPrevious').addEventListener('click', () => { selectedWeek = shift(selectedWeek, -7); loadWeek(); });
    document.getElementById('statsNext').addEventListener('click', () => { selectedWeek = shift(selectedWeek, 7); loadWeek(); });
    document.getElementById('statsDate').addEventListener('change', event => {
      if (!event.target.value || !event.target.validity.valid) return;
      selectedWeek = parseDate(summarizeWeek([], parseDate(event.target.value)).days[0].date);
      loadWeek();
    });
  }
  document.getElementById('statsDate').max = iso(new Date());
  selectedWeek = shift(parseDate(summarizeWeek([]).days[0].date), -7);
  dialog.showModal();
  loadWeek();
}
