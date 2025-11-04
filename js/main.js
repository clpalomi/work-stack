// js/main.js
import { supabase, getUser, fetchLog, signInWithGoogle, signOut, fetchAllForUser, insertLog } from './client.js';
import { els, setSignedOutUI, setSignedInUI, setLoading, setEmpty, renderRows, renderProjects,
         toISO, todayISO, isoToDMY, initDatePicker } from './ui.js';
import { OAUTH_REDIRECT_TO } from './config.js'; // <-- make sure this exists

let CACHE_ROWS = [];
let SHOW_NOTES = false;

// tiny helper so addEventListener never crashes if an element is missing
const on = (el, evt, fn) => el && el.addEventListener(evt, fn);

.toolbar {
  display:flex; gap:.75rem; align-items:center; margin: .75rem 0;
}
.toolbar .download { display:flex; gap:.5rem; margin-left:auto; }
.notes-toggle { display:flex; gap:.4rem; align-items:center; }

.table {
  width:100%; border-collapse: collapse; font-size: 0.95rem;
}
.table th, .table td { border-bottom: 1px solid var(--border,#ddd); padding:.5rem .6rem; }
.table th { text-align: left; font-weight:600; }

#projectsWrap { margin-top: 1rem; display:flex; flex-direction:column; gap:1rem; }

.project-lane {
  border:1px solid var(--border,#ddd); border-radius:12px; padding:.75rem;
}
.project-lane h4 { margin:0 0 .5rem; font-size:1rem; display:flex; justify-content:space-between; }

.task-bar-row {
  display:flex; gap:.75rem; overflow-x:auto; padding-bottom:.25rem;
}
.task-card {
  flex: 0 0 auto;
  width: 72px;                 /* narrow, scrolls horizontally when many */
  display:flex; flex-direction:column; align-items:center; gap:.35rem;
}
.task-card .bar {
  width: 100%;
  border-radius: 10px;
  background: var(--bar,#7aa7ff);
  position: relative;
  /* “gold coin” 30-min indentations using repeating gradient */
  background-image: repeating-linear-gradient(
    to bottom,
    rgba(255,255,255,.18) 0,
    rgba(255,255,255,.18) calc(var(--step,8px) - 1px),
    transparent calc(var(--step,8px) - 1px),
    transparent var(--step,8px)
  );
  box-shadow: inset 0 0 0 1px rgba(0,0,0,.06);
}
.task-card .label { text-align:center; font-size:.8rem; line-height:1.1; }
.task-card .mins { font-size:.75rem; color:#666; }


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
if (els.btnAdd) {
  els.btnAdd.addEventListener('click', () => {
    els.entryForm.reset();
    // Pre-fill date as today (dd/mm/yyyy)
    const iso = todayISO();
    const dmy = isoToDMY(iso);
    els.fDate.value = dmy;
    if (els.entryDialog?.showModal) els.entryDialog.showModal();
  });
}
if (els.chkNotes) {
  els.chkNotes.addEventListener('change', () => {
    SHOW_NOTES = !!els.chkNotes.checked;
    renderRows(CACHE_ROWS, SHOW_NOTES);
  });
}
if (els.btnDownloadCsv) {
  els.btnDownloadCsv.addEventListener('click', () => downloadCSV(CACHE_ROWS));
}
if (els.btnDownloadXlsx) {
  els.btnDownloadXlsx.addEventListener('click', () => downloadXLSX(CACHE_ROWS));
}

// ===== Modal wiring =====
if (els.btnToday) {
  els.btnToday.addEventListener('click', () => {
    const iso = todayISO();
    els.fDate.value = isoToDMY(iso);
  });
}
if (els.fDate) {
  // Initialize compact calendar if Flatpickr loaded
  initDatePicker(els.fDate);
}

if (els.entryForm) {
  els.entryForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      const task = els.fTask.value.trim();
      const project = els.fProject.value.trim();
      const minutes = Number(els.fMinutes.value);
      const dateISO = toISO(els.fDate.value.trim() || '');
      const notes = els.fNotes.value.trim();

      if (!task || !project || !minutes || !dateISO) {
        alert('Please fill Task, Project, Minutes, and a valid Date (dd/mm/yyyy).');
        return;
      }
      await insertLog({ task, project, minutes, dateISO, notes });
      els.entryDialog?.close();
      await refreshUI();
    } catch (err) {
      console.error(err);
      alert('Failed to save. Please check your input and that you are signed in.');
    }
  });
}

// ===== Downloads =====
function downloadCSV(rows) {
  if (!rows?.length) { alert('No data to download.'); return; }
  const header = ['Task','Project','Minutes','Date','Notes'];
  const esc = s => `"${String(s??'').replace(/"/g,'""')}"`;
  const csv = [
    header.join(','),
    ...rows.map(r => [
      esc(r.task), esc(r.project), r.minutes, isoToDMY(r.date||''), esc(r.notes||'')
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
    Minutes: Number(r.minutes)||0,
    Date: r.date ? isoToDMY(r.date) : '',
    Notes: r.notes ?? ''
  }));
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(data);
  XLSX.utils.book_append_sheet(wb, ws, 'Work Log');
  XLSX.writeFile(wb, 'work_log.xlsx');
}



// Menu helpers
function openMenu() {
  if (!els.menu || !els.menuBtn || !els.menuBackdrop) return;
  els.menu.setAttribute('aria-hidden', 'false');
  els.menuBtn.setAttribute('aria-expanded', 'true');
  els.menuBackdrop.hidden = false;
}
function closeMenu() {
  if (!els.menu || !els.menuBtn || !els.menuBackdrop) return;
  els.menu.setAttribute('aria-hidden', 'true');
  els.menuBtn.setAttribute('aria-expanded', 'false');
  els.menuBackdrop.hidden = true;
}
function toggleMenu() {
  if (!els.menu) return;
  const open = els.menu.getAttribute('aria-hidden') === 'false';
  open ? closeMenu() : openMenu();
}

// Keep UI in sync with auth
supabase.auth.onAuthStateChange((evt) => {
  if (evt === 'SIGNED_IN' || evt === 'SIGNED_OUT') refreshUI();
});

// Bind events (safely)
on(els.menuBtn, 'click', toggleMenu);
on(els.menuBackdrop, 'click', closeMenu);
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { closeMenu(); } });

on(els.menuMy, 'click', () => {
  document.getElementById('log-title')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  closeMenu();
});

// Sign in
on(els.menuSignin, 'click', async () => {
  if (!els.menuSignin) return;
  els.menuSignin.disabled = true;
  try {
    // remember where we were to come back after callback.html
    sessionStorage.setItem('post_auth_redirect', location.href);
    await signInWithGoogle(OAUTH_REDIRECT_TO);
  } catch (e) {
    console.error(e);
    alert('Authentication failed. Confirm keys and redirect URLs in Supabase.');
  } finally {
    els.menuSignin.disabled = false;
    closeMenu();
  }
});

// Sign out
on(els.menuSignout, 'click', async () => {
  if (!els.menuSignout) return;
  els.menuSignout.disabled = true;
  try {
    await signOut(); // your client.js wrapper calls supabase.auth.signOut()
    sessionStorage.removeItem('post_auth_redirect');
  } catch (e) {
    console.error(e);
    alert('Sign out failed.');
  } finally {
    els.menuSignout.disabled = false;
    closeMenu();
  }
});

// About modal
function openAbout(){ if (!els.about || !els.aboutBackdrop) return; els.about.setAttribute('aria-hidden','false'); els.aboutBackdrop.hidden = false; }
function closeAbout(){ if (!els.about || !els.aboutBackdrop) return; els.about.setAttribute('aria-hidden','true'); els.aboutBackdrop.hidden = true; }
on(els.menuAbout, 'click', () => { openAbout(); closeMenu(); });
on(els.aboutBackdrop, 'click', closeAbout);
on(els.aboutClose, 'click', closeAbout);
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeAbout(); });

// Initial paint
refreshUI();

