// js/main.js
import {
  supabase,
  getUser,
  fetchLog,
  signInWithGoogle,
  signOut,
  fetchAllForUser,
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
  toISO,
  todayISO,
  isoToDMY,
  initDatePicker
} from './ui.js';

import { OAUTH_REDIRECT_TO } from './config.js'; // make sure this exists

let CACHE_ROWS = [];
let SHOW_NOTES = false;

// tiny helper so addEventListener never crashes if an element is missing
const on = (el, evt, fn) => el && el.addEventListener(evt, fn);

// ====== MENU/ABOUT ELEMENTS (directly from DOM to avoid mismatches) ======

const menuBtn = document.getElementById('menu-btn');
const menu = document.getElementById('menu');
const menuBackdrop = document.getElementById('menu-backdrop');

const menuMy = document.getElementById('menu-my');
const menuSignin = document.getElementById('menu-signin');
const menuSignout = document.getElementById('menu-signout');
const menuAbout = document.getElementById('menu-about');

const about = document.getElementById('about');
const aboutBackdrop = document.getElementById('about-backdrop');
const aboutClose = document.getElementById('about-close');

// init date picker and keep a reference
let fp = null;
if (els.fDate) {
  fp = initDatePicker(els.fDate);
}

// ====== REFRESH UI ======
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

// ===== Toolbar events =====
on(els.btnAdd, 'click', () => {
  els.entryForm?.reset();
  // Pre-fill date as today (dd/mm/yyyy)
  const dmy = isoToDMY(todayISO());
  if (els.fDate) els.fDate.value = dmy;
  els.entryDialog?.showModal?.();
});

on(els.chkNotes, 'change', () => {
  SHOW_NOTES = !!els.chkNotes.checked;
  renderRows(CACHE_ROWS, SHOW_NOTES);
});

on(els.btnDownloadCsv, 'click', () => downloadCSV(CACHE_ROWS));
on(els.btnDownloadXlsx, 'click', () => downloadXLSX(CACHE_ROWS));

// ===== Modal wiring (Add entry) =====
// “Now” button — update flatpickr if present
on(els.btnToday, 'click', () => {
  const d = new Date();
  if (fp && fp.setDate) {
    fp.setDate(d, true); // true => update input value & trigger change
  } else {
    // fallback: manual dmy
    els.fDate.value = isoToDMY(todayISO());
    els.fDate.dispatchEvent(new Event('input', { bubbles: true }));
  }
});

if (els.fDate) {
  // Initialize compact calendar if Flatpickr loaded
  initDatePicker(els.fDate);
}

on(els.entryForm, 'submit', async (e) => {
  e.preventDefault();
  try {
    const task = (els.fTask?.value || '').trim();
    const project = (els.fProject?.value || '').trim();
    const minutesRaw = (els.fMinutes?.value || '').trim();
    const minutes = Number(minutesRaw);

    // if flatpickr is present, always read from its selected date
    let dmy = (els.fDate?.value || '').trim();
    if (fp && fp.selectedDates?.length) {
      const dd = fp.selectedDates[0];
      // normalize to dd/mm/yyyy for our toISO parser
      const pad = n => String(n).padStart(2, '0');
      dmy = `${pad(dd.getDate())}/${pad(dd.getMonth()+1)}/${dd.getFullYear()}`;
      // also reflect back into the textbox so user sees it
      els.fDate.value = dmy;
    }
    const dateISO = toISO(dmy);

    // Debug if something is off
    console.log('[save-check]', { task, project, minutesRaw, minutes, dmy, dateISO });

    if (!task || !project || !Number.isFinite(minutes) || minutes < 1 || !dateISO) {
      alert('Please fill Task, Project, Minutes, and a valid Date (dd/mm/yyyy).');
      return;
    }

    await insertLog({ task, project, minutes, dateISO, notes: (els.fNotes?.value || '').trim() });
    els.entryDialog?.close?.();
    await refreshUI();
  } catch (err) {
    console.error(err);
    alert('Failed to save. Please check your input and that you are signed in.');
  }
});

// ===== Downloads =====
function downloadCSV(rows) {
  if (!rows?.length) { alert('No data to download.'); return; }
  const header = ['Task','Project','Minutes','Date','Notes'];
  const esc = s => `"${String(s ?? '').replace(/"/g,'""')}"`;
  const csv = [
    header.join(','),
    ...rows.map(r => [
      esc(r.task), esc(r.project), r.minutes ?? 0, isoToDMY(r.date || ''), esc(r.notes || '')
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

// ===== Menu helpers (use DOM nodes above, not els) =====
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

// Keep UI in sync with auth
supabase.auth.onAuthStateChange((evt) => {
  if (evt === 'SIGNED_IN' || evt === 'SIGNED_OUT') refreshUI();
});

// Bind menu events
on(menuBtn, 'click', toggleMenu);
on(menuBackdrop, 'click', closeMenu);
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeMenu();
});

// "My entries"
on(menuMy, 'click', () => {
  document.getElementById('log-title')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  closeMenu();
});

// Sign in
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

// Sign out
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
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeAbout(); });
