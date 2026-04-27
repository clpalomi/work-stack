// js/main.js
import {
  supabase,
  getUser,
  fetchAllForUser,
  signInWithGoogle,
  signOut,
  insertLog,
  updateLogEntry,
  deleteLogEntry
} from './client.js';

import {
  els,
  setSignedOutUI,
  setSignedInUI,
  setLoading,
  setEmpty,
  renderRows,
  renderProjects,
  toISO,        // expects dd/mm/yyyy -> yyyy-mm-dd
  todayISO,     // returns yyyy-mm-dd (today)
  isoToDMY,     // yyyy-mm-dd -> dd/mm/yyyy
  initDatePicker
} from './ui.js';

import { OAUTH_REDIRECT_TO } from './config.js';

// ---------------- Utilities ----------------
const on = (el, evt, fn) => el && el.addEventListener(evt, fn);

let CACHE_ROWS = [];
let SHOW_NOTES = false;
const AUTH_REDIRECT_TO = getAuthRedirectUrl();
let CALENDAR_YEAR = new Date().getFullYear();
let CALENDAR_OPEN = false;
let EDITING_ID = null;
let REFRESHING = null;

function resetEntryDialog() {
  EDITING_ID = null;
  const title = els.entryDialog?.querySelector('h3');
  if (title) title.textContent = 'Add work log';
  if (els.save) els.save.textContent = 'Save';
  if (els.cancel) els.cancel.textContent = 'Cancel';
  if (els.deleteEntry) els.deleteEntry.hidden = true;
}

// Robust date reading: supports native <input type="date"> and dd/mm/yyyy text
function readISODateFromInput(inputEl) {
  if (!inputEl) return '';
  const v = String(inputEl.value || '').trim();

  // Native date input gives ISO already (yyyy-mm-dd)
  if (inputEl.type === 'date' && /^\d{4}-\d{2}-\d{2}$/.test(v)) {
    return v;
  }

  // Otherwise expect dd/mm/yyyy (but accept dd-mm-yyyy, dd.mm.yyyy)
  const m = v.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/);
  if (m) return toISO(`${m[1].padStart(2,'0')}/${m[2].padStart(2,'0')}/${m[3]}`);

  return '';
}

// ---------------- Auth state -> UI ----------------
async function refreshUI() {
  if (REFRESHING) return REFRESHING;
  REFRESHING = (async () => {
  const user = await getUser();
  if (!user) {
    setSignedOutUI();
    return null;
  }
  setSignedInUI(user.email);

  try {
    setLoading();
    const data = await fetchAllForUser();
    CACHE_ROWS = data;
    if (!data.length) {
      setEmpty('No entries yet. Start your first session!');
      return null;
    }
    renderRows(data, SHOW_NOTES, { onEdit: openEditDialog });
    renderProjects(data);
    if (CALENDAR_OPEN) renderCalendar(CACHE_ROWS, CALENDAR_YEAR);
  } catch (err) {
    console.error(err);
    setEmpty('Could not load your log. Check RLS/policies.');
  }
  return null;
  })();
  try {
    await REFRESHING;
  } finally {
    REFRESHING = null;
  }
}

window.addEventListener('load', refreshUI);

// Keep UI in sync with auth changes
supabase.auth.onAuthStateChange((evt) => {
  if (evt === 'SIGNED_IN' || evt === 'SIGNED_OUT') refreshUI();
});

// ---------------- Toolbar ----------------
on(els.btnAdd, 'click', () => {
  resetEntryDialog();
  els.entryForm?.reset?.();
  
  const topProjects = getTopProjects(CACHE_ROWS, 5);
  populateProjectSuggestions(topProjects);

  // Pre-fill today's date
  if (els.date) {
    if (els.date.type === 'date') {
      els.date.value = todayISO();
    } else {
      els.date.value = isoToDMY(todayISO());
    }
  }

  if (els.task) els.task.value = 'working';
  refreshTaskSuggestions(els.project?.value || '');
  
  els.entryDialog?.showModal?.();
  els.project?.focus?.();
});

on(els.chkNotes, 'change', () => {
  SHOW_NOTES = !!els.chkNotes.checked;
  renderRows(CACHE_ROWS, SHOW_NOTES, { onEdit: openEditDialog });
});

on(els.btnDownloadCsv, 'click', () => downloadCSV(CACHE_ROWS));
on(els.btnCalendar, 'click', () => {
  if (CALENDAR_OPEN) {
    closeCalendar();
    return;
  }
  CALENDAR_OPEN = true;
  CALENDAR_YEAR = new Date().getFullYear();
  openCalendar();
  renderCalendar(CACHE_ROWS, CALENDAR_YEAR);
});
on(els.btnDownloadXlsx, 'click', () => downloadXLSX(CACHE_ROWS));

// ---------------- Date picker (optional) ----------------
// If ui.js exposes a Flatpickr initializer, attach it (no-op if not included)
if (els.date) {
  try { initDatePicker(els.date); } catch { /* ignore if not loaded */ }
}

// Today button
on(els.dateToday, 'click', () => {
  if (!els.date) return;
  const iso = todayISO();
  if (els.date.type === 'date') {
    els.date.value = iso;
  } else {
    els.date.value = isoToDMY(iso);
  }
  els.date.dispatchEvent(new Event('input', { bubbles: true }));
  els.date.dispatchEvent(new Event('change', { bubbles: true }));
});

on(els.project, 'change', () => {
  refreshTaskSuggestions(els.project?.value || '');
  if (els.task && !String(els.task.value || '').trim()) {
    els.task.value = 'working';
  }
});

on(els.task, 'keydown', (e) => {
  if (e.key !== 'Tab' || e.shiftKey || e.altKey || e.ctrlKey || e.metaKey) return;
  const tasks = getTasksForProject(els.project?.value || '');
  const current = String(els.task?.value || '').trim().toLowerCase();
  const match = tasks.find((task) => task.toLowerCase().startsWith(current || ''));
  if (!match || match.toLowerCase() === current) return;
  e.preventDefault();
  els.task.value = match;
});

const calendarPanel = document.getElementById('calendarPanel');
const calendarGrid = document.getElementById('calendarGrid');
const calendarLegend = document.getElementById('calendarLegend');
const calendarYearLabel = document.getElementById('calendarYearLabel');
const calendarPrevYear = document.getElementById('calendarPrevYear');
const calendarNextYear = document.getElementById('calendarNextYear');
const calendarClose = document.getElementById('calendarClose');

on(calendarClose, 'click', closeCalendar);
on(calendarPrevYear, 'click', () => {
  CALENDAR_YEAR -= 1;
  renderCalendar(CACHE_ROWS, CALENDAR_YEAR);
});
on(calendarNextYear, 'click', () => {
  CALENDAR_YEAR += 1;
  renderCalendar(CACHE_ROWS, CALENDAR_YEAR);
});


// ---------------- Form submit (single source of truth) ----------------
on(els.entryForm, 'submit', async (e) => {
  e.preventDefault();

  try {
    const task    = (els.task?.value || '').trim();
    const project = (els.project?.value || '').trim();
    const minutes = Number((els.minutes?.value || '').trim());
    const notes   = (els.fNotes?.value || '').trim();

    const dateISO = readISODateFromInput(els.date);

    // Debug (comment out if noisy)
    // console.log('[submit]', { task, project, minutes, dateISO });

    if (!task || !project || !Number.isFinite(minutes) || minutes < 1 || !dateISO) {
      alert('Please fill Task, Project, Minutes, and a valid Date (dd/mm/yyyy).');
      return;
    }

    // IMPORTANT: insertLog expects { ... , dateISO }
    if (EDITING_ID) {
      await updateLogEntry(EDITING_ID, { task, project, minutes, dateISO, notes });
    } else {
      await insertLog({ task, project, minutes, dateISO, notes });
    }

    els.entryDialog?.close?.();
    await refreshUI();
    resetEntryDialog();

    // Clear fields for next use
    if (els.task) els.task.value = '';
    if (els.project) els.project.value = '';
    if (els.minutes) els.minutes.value = '';
    if (els.date) els.date.value = '';
    if (els.fNotes) els.fNotes.value = '';

  } catch (err) {
    console.error(err);
    alert('Failed to save. Please check your input and that you are signed in.');
  }
});

// Save button simply submits the form
on(els.save, 'click', () => {
  if (els.entryForm?.requestSubmit) els.entryForm.requestSubmit();
  else els.entryForm?.dispatchEvent?.(new Event('submit', { cancelable: true, bubbles: true }));
});

// Cancel button clears / closes
on(els.cancel, 'click', () => {
  els.entryForm?.reset?.();
  els.entryDialog?.close?.();
  resetEntryDialog();
});

on(els.deleteEntry, 'click', async () => {
  if (!EDITING_ID) return;
  if (!confirm('Delete this entry? This cannot be undone.')) return;

  try {
    await deleteLogEntry(EDITING_ID);
    els.entryDialog?.close?.();
    await refreshUI();
    resetEntryDialog();
  } catch (err) {
    console.error(err);
    alert('Failed to delete this entry. Please try again.');
  }
});

// ---------------- Downloads ----------------
function downloadCSV(rows) {
  if (!rows?.length) { alert('No data to download.'); return; }
  const header = ['Task','Project','Minutes','Date','Notes'];
  const esc = s => `"${String(s ?? '').replace(/"/g,'""')}"`;
  const csv = [
    header.join(','),
    ...rows.map(r => [
      esc(r.task),
      esc(r.project),
      Number(r.minutes) || 0,
      r.date ? isoToDMY(r.date) : '',
      esc(r.notes || '')
    ].join(','))
  ].join('\r\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'work_log.csv';
  a.click();
  URL.revokeObjectURL(url);
}

function downloadXLSX(rows) {
  if (!rows?.length) { alert('No data to download.'); return; }
  if (!window.XLSX) { alert('XLSX library not loaded.'); return; }
  const data = rows.map(r => ({
    Task: r.task ?? '',
    Project: r.project ?? '',
    Minutes: Number(r.minutes) || 0,
    Date: r.date ? isoToDMY(r.date) : '',
    Notes: r.notes ?? ''
  }));
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(data);
  XLSX.utils.book_append_sheet(wb, ws, 'Work Log');
  XLSX.writeFile(wb, 'work_log.xlsx');
}

function openCalendar() {
  if (!calendarPanel) return;
  calendarPanel.hidden = false;
}

function closeCalendar() {
  CALENDAR_OPEN = false;
  if (!calendarPanel) return;
  calendarPanel.hidden = true;
}

function renderCalendar(rows, year) {
  if (!calendarGrid || !calendarYearLabel) return;
  calendarYearLabel.textContent = `Calendar ${year}`;
  const minutesByDate = new Map();

  for (const row of (rows || [])) {
    if (!row?.date || !String(row.date).startsWith(`${year}-`)) continue;
    const key = String(row.date).slice(0, 10);
    minutesByDate.set(key, (minutesByDate.get(key) || 0) + (Number(row.minutes) || 0));
  }

  let maxMinutes = 0;
  for (const mins of minutesByDate.values()) maxMinutes = Math.max(maxMinutes, mins);

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const today = new Date();
  const isCurrentYear = today.getFullYear() === year;

  calendarGrid.innerHTML = monthNames.map((name, monthIdx) => {
    const daysInMonth = new Date(year, monthIdx + 1, 0).getDate();
    const cells = Array.from({ length: 31 }, (_, i) => {
      const day = i + 1;
      if (day > daysInMonth) return '<div class="day-cell is-empty"></div>';
      const iso = `${year}-${String(monthIdx + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const mins = minutesByDate.get(iso) || 0;
      const level = calcLevel(mins, maxMinutes);
      return `<div class="day-cell" data-level="${level}" title="${iso}: ${mins} min"></div>`;
    }).join('');

    return `<div class="month-col" ${isCurrentYear && monthIdx === today.getMonth() ? 'id="calendarCurrentMonth"' : ''}>
      <div class="month-name">${name}</div>
      ${cells}
    </div>`;
  }).join('');

  if (calendarLegend) {
    calendarLegend.innerHTML = `
      <span>Less</span>
      <span class="legend-box day-cell" data-level="0"></span>
      <span class="legend-box day-cell" data-level="1"></span>
      <span class="legend-box day-cell" data-level="2"></span>
      <span class="legend-box day-cell" data-level="3"></span>
      <span class="legend-box day-cell" data-level="4"></span>
      <span>More</span>
    `;
  }

  if (isCurrentYear) {
    document.getElementById('calendarCurrentMonth')?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }
}

function calcLevel(minutes, maxMinutes) {
  if (!minutes || !maxMinutes) return 0;
  const ratio = minutes / maxMinutes;
  if (ratio <= 0.25) return 1;
  if (ratio <= 0.5) return 2;
  if (ratio <= 0.75) return 3;
  return 4;
}

function getTopProjects(rows, limit = 5) {
  if (!rows?.length) return [];
  const freq = new Map();
  for (const row of rows) {
    const project = String(row.project || '').trim();
    if (!project) continue;
    freq.set(project, (freq.get(project) || 0) + 1);
  }
  return Array.from(freq.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([project]) => project);
}

function populateProjectSuggestions(projects) {
  const datalist = document.getElementById('projectSuggestions');
  const quickPicks = document.getElementById('projectQuickPicks');
  if (!datalist) return;
  datalist.innerHTML = projects.map((project) => `<option value="${escapeHtml(project)}"></option>`).join('');

  if (!quickPicks) return;
  if (!projects.length) {
    quickPicks.innerHTML = '<div class="quick-picks-empty">No recent projects yet.</div>';
    return;
  }

  quickPicks.innerHTML = projects.map((project) =>
    `<button type="button" data-project="${escapeHtml(project)}">${escapeHtml(project)}</button>`
  ).join('');

  quickPicks.querySelectorAll('button[data-project]').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (els.project) {
        els.project.value = btn.dataset.project || '';
        els.project.dispatchEvent(new Event('input', { bubbles: true }));
        els.project.dispatchEvent(new Event('change', { bubbles: true }));
      }
      if (els.task && !String(els.task.value || '').trim()) {
        els.task.value = 'working';
      }
    });
  });
}

function getTasksForProject(projectName) {
  const key = String(projectName || '').trim().toLowerCase();
  if (!key) return [];
  const seen = new Set();
  const tasks = [];
  for (const row of CACHE_ROWS) {
    if (String(row.project || '').trim().toLowerCase() !== key) continue;
    const task = String(row.task || '').trim();
    if (!task) continue;
    const normalized = task.toLowerCase();
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    tasks.push(task);
  }
  return tasks;
}

function refreshTaskSuggestions(projectName) {
  const datalist = document.getElementById('taskSuggestions');
  if (!datalist) return;
  const tasks = getTasksForProject(projectName);
  datalist.innerHTML = tasks.map((task) => `<option value="${escapeHtml(task)}"></option>`).join('');
}

function openEditDialog(row) {
  if (!row) return;
  EDITING_ID = row.id;
  if (els.project) els.project.value = row.project || '';
  if (els.task) els.task.value = row.task || '';
  if (els.minutes) els.minutes.value = Number(row.minutes) || '';
  if (els.fNotes) els.fNotes.value = row.notes || '';
  if (els.date) {
    if (els.date.type === 'date') els.date.value = row.date || '';
    else els.date.value = isoToDMY(row.date || '');
  }
  refreshTaskSuggestions(row.project || '');
  const title = els.entryDialog?.querySelector('h3');
  if (title) title.textContent = 'Edit work log';
  if (els.save) els.save.textContent = 'Save changes';
  if (els.cancel) els.cancel.textContent = 'Discard';
  if (els.deleteEntry) els.deleteEntry.hidden = false;
  els.entryDialog?.showModal?.();
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, c => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[c]));
}


// ---------------- Menu & About ----------------
// Support both patterns: a single #menu-login toggle, or #menu-signin and #menu-signout
const menuBtn       = document.getElementById('menu-btn');
const menu          = document.getElementById('menu');
const menuBackdrop  = document.getElementById('menu-backdrop');
const menuMy        = document.getElementById('menu-my');
const menuAbout     = document.getElementById('menu-about');
const about         = document.getElementById('about');
const aboutBackdrop = document.getElementById('about-backdrop');
const aboutClose    = document.getElementById('about-close');

const menuLogin  = document.getElementById('menu-login');   // optional: single toggle
const menuSignin = document.getElementById('menu-signin');  // optional: separate
const menuSignout= document.getElementById('menu-signout'); // optional: separate

function openMenu() {
  if (!menu || !menuBtn || !menuBackdrop) return;
  menu.setAttribute('aria-hidden', 'false');
  menuBtn.setAttribute('aria-expanded', 'true');
  menuBackdrop.hidden = false;
}
function closeMenu() {
  if (!menu || !menuBtn || !menuBackdrop) return;
  menu.setAttribute('aria-hidden', 'true');
  menuBtn.setAttribute('aria-expanded', 'false');
  menuBackdrop.hidden = true;
}
function toggleMenu() {
  if (!menu) return;
  const isHidden = menu.getAttribute('aria-hidden') !== 'false';
  isHidden ? openMenu() : closeMenu();
}

on(menuBtn, 'click', toggleMenu);
on(menuBackdrop, 'click', closeMenu);
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeMenu();
    closeAbout();
  }
});

on(menuMy, 'click', () => {
  document.getElementById('log-title')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  closeMenu();
});

// Single toggle button
on(menuLogin, 'click', async () => {
  const user = await getUser();
  menuLogin.disabled = true;
  try {
    if (user) {
      await signOut();
    } else {
      sessionStorage.setItem('post_auth_redirect', location.href);
      await signInWithGoogle(AUTH_REDIRECT_TO);
    }
  } catch (e) {
    console.error(e);
    alert('Authentication failed. Confirm keys and redirect URLs in Supabase.');
  } finally {
    menuLogin.disabled = false;
    closeMenu();
  }
});

// Separate buttons (if present)
on(menuSignin, 'click', async () => {
  menuSignin.disabled = true;
  try {
    sessionStorage.setItem('post_auth_redirect', location.href);
    await signInWithGoogle(AUTH_REDIRECT_TO);
  } catch (e) {
    console.error(e);
    alert('Authentication failed. Confirm keys and redirect URLs in Supabase.');
  } finally {
    menuSignin.disabled = false;
    closeMenu();
  }
});

function getAuthRedirectUrl() {
  if (typeof window !== 'undefined' && window.location) {
    return new URL('./callback.html', window.location.href).href;
  }
  return OAUTH_REDIRECT_TO;
}


on(menuSignout, 'click', async () => {
  menuSignout.disabled = true;
  try {
    await signOut();
    sessionStorage.removeItem('post_auth_redirect');
  } catch (e) {
    console.error(e);
    alert('Sign out failed.');
  } finally {
    menuSignout.disabled = false;
    closeMenu();
  }
});

// About modal
function openAbout(){
  if (!about || !aboutBackdrop) return;
  about.setAttribute('aria-hidden','false');
  aboutBackdrop.hidden = false;
}
function closeAbout(){
  if (!about || !aboutBackdrop) return;
  about.setAttribute('aria-hidden','true');
  aboutBackdrop.hidden = true;
}
on(menuAbout, 'click', () => { openAbout(); closeMenu(); });
on(aboutBackdrop, 'click', closeAbout);
on(aboutClose, 'click', closeAbout);
