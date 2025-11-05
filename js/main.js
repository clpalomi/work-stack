// js/main.js
import {
  supabase,
  getUser,
  fetchAllForUser,
  signInWithGoogle,
  signOut,
  insertLog
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
  const user = await getUser();
  if (!user) {
    setSignedOutUI();
    return;
  }
  setSignedInUI(user.email);

  try {
    setLoading();
    const data = await fetchAllForUser();
    CACHE_ROWS = data;
    if (!data.length) {
      setEmpty('No entries yet. Start your first session!');
      return;
    }
    renderRows(data, SHOW_NOTES);
    renderProjects(data);
  } catch (err) {
    console.error(err);
    setEmpty('Could not load your log. Check RLS/policies.');
  }
}

window.addEventListener('load', refreshUI);

// Keep UI in sync with auth changes
supabase.auth.onAuthStateChange((evt) => {
  if (evt === 'SIGNED_IN' || evt === 'SIGNED_OUT') refreshUI();
});

// ---------------- Toolbar ----------------
on(els.btnAdd, 'click', () => {
  els.entryForm?.reset?.();

  // Pre-fill today's date
  if (els.date) {
    if (els.date.type === 'date') {
      els.date.value = todayISO();
    } else {
      els.date.value = isoToDMY(todayISO());
    }
  }

  els.entryDialog?.showModal?.();
});

on(els.chkNotes, 'change', () => {
  SHOW_NOTES = !!els.chkNotes.checked;
  renderRows(CACHE_ROWS, SHOW_NOTES);
});

on(els.btnDownloadCsv, 'click', () => downloadCSV(CACHE_ROWS));
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
    await insertLog({ task, project, minutes, dateISO, notes });

    els.entryDialog?.close?.();
    await refreshUI();

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
      await signInWithGoogle(OAUTH_REDIRECT_TO);
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
    await signInWithGoogle(OAUTH_REDIRECT_TO);
  } catch (e) {
    console.error(e);
    alert('Authentication failed. Confirm keys and redirect URLs in Supabase.');
  } finally {
    menuSignin.disabled = false;
    closeMenu();
  }
});

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
