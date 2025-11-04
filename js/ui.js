// js/ui.js
import { APP } from './config.js';

export const els = {
  who:        document.getElementById('who'),
  rows:       document.getElementById('rows'),           // legacy (not used by new table)
  count:      document.getElementById('count'),
  menuBtn:    document.getElementById('menu-btn'),
  menu:       document.getElementById('menu'),
  menuBackdrop: document.getElementById('menu-backdrop'),
  menuMy: document.getElementById('menu-my'),
  menuSignin: document.getElementById('menu-signin'),
  menuSignout: document.getElementById('menu-signout'),
  menuAbout: document.getElementById('menu-about'),
  about: document.getElementById('about'),
  aboutBackdrop: document.getElementById('about-backdrop'),
  aboutClose: document.getElementById('about-close'),

  // New UI elements
  toolbar: document.getElementById('toolbar'),
  btnAdd: document.getElementById('btnAdd'),
  chkNotes: document.getElementById('chkNotes'),
  btnDownloadCsv: document.getElementById('btnDownloadCsv'),
  btnDownloadXlsx: document.getElementById('btnDownloadXlsx'),
  tableWrap: document.getElementById('tableWrap'),
  projectsWrap: document.getElementById('projectsWrap'),
  entryDialog: document.getElementById('entryDialog'),
  entryForm: document.getElementById('entryForm'),
  fTask: document.getElementById('fTask'),
  fProject: document.getElementById('fProject'),
  fMinutes: document.getElementById('fMinutes'),
  fDate: document.getElementById('fDate'),
  btnToday: document.getElementById('btnToday'),
  fNotes: document.getElementById('fNotes'),
};

export function setSignedOutUI() {
  if (els.toolbar) els.toolbar.hidden = true;
  if (els.tableWrap) els.tableWrap.innerHTML = '';
  if (els.projectsWrap) els.projectsWrap.innerHTML = '';
  if (els.count) els.count.textContent = '0 entries';

  // menu state
  if (els.menuSignin) els.menuSignin.hidden = false;
  if (els.menuSignout) els.menuSignout.hidden = true;
  if (els.who) els.who.textContent = '';
}

// Show/hide toolbars when signed in/out
export function setSignedInUI(email) {
  if (els.toolbar) els.toolbar.hidden = false;

  // menu state
  if (els.menuSignin) els.menuSignin.hidden = true;
  if (els.menuSignout) els.menuSignout.hidden = false;
  if (els.who) els.who.textContent = email || '';
}

export function setLoading() {
  if (els.tableWrap) els.tableWrap.innerHTML = '<p>Loading…</p>';
  if (els.projectsWrap) els.projectsWrap.innerHTML = '';
}

export function setEmpty(msg='No entries yet.') {
  if (els.tableWrap) els.tableWrap.innerHTML = `<p>${msg}</p>`;
  if (els.projectsWrap) els.projectsWrap.innerHTML = '';
  if (els.count) els.count.textContent = '0 entries';
}

// =====================
// Date helpers
// =====================
export function toISO(dmy) {
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec((dmy || '').trim());
  if (!m) return null;
  const [_, dd, mm, yyyy] = m;
  const d = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
  if (isNaN(d)) return null;
  const iso = d.toISOString().slice(0, 10);
  // Check round-trip to guard against invalids like 31/02/2025
  const back = new Date(iso);
  if (back.getDate() !== Number(dd) || back.getMonth() !== Number(mm) - 1) return null;
  return iso;
}

export function todayISO() {
  const d = new Date();
  // force local midnight to avoid TZ drift
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).toISOString().slice(0, 10);
}

export function isoToDMY(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

// =====================
// Table render (Task, Project, Minutes, Date, Notes?)
// =====================
export function renderRows(rows, showNotes = false) {
  if (!rows?.length) {
    setEmpty();
    return;
  }

  const head = `
    <thead><tr>
      <th>Task</th>
      <th>Project</th>
      <th>Minutes</th>
      <th>Date</th>
      ${showNotes ? '<th>Notes</th>' : ''}
    </tr></thead>`;

  const body = rows.map(r => `
    <tr>
      <td>${escapeHtml(r.task ?? '')}</td>
      <td>${escapeHtml(r.project ?? '')}</td>
      <td>${Number(r.minutes) || 0}</td>
      <td>${r.date ? isoToDMY(r.date) : ''}</td>
      ${showNotes ? `<td>${escapeHtml(r.notes ?? '')}</td>` : ''}
    </tr>`).join('');

  if (els.tableWrap) {
    els.tableWrap.innerHTML = `<table class="table">${head}<tbody>${body}</tbody></table>`;
  }
  if (els.count) {
    const n = rows.length;
    els.count.textContent = `${n} entr${n === 1 ? 'y' : 'ies'}`;
  }
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[c]));
}

// =====================
// Project lanes
// =====================
export function renderProjects(rows) {
  if (!els.projectsWrap) return;
  if (!rows?.length) { els.projectsWrap.innerHTML = ''; return; }

  // group minutes by project -> by task
  const byProject = new Map();
  for (const r of rows) {
    const proj = (r.project ?? '').trim() || '(no project)';
    const task = (r.task ?? '').trim() || '(untitled)';
    const mins = Number(r.minutes) || 0;
    if (!byProject.has(proj)) byProject.set(proj, new Map());
    const m = byProject.get(proj);
    m.set(task, (m.get(task) || 0) + mins);
  }
  const projects = Array.from(byProject.entries())
    .map(([project, tasks]) => ({
      project,
      tasks: Array.from(tasks.entries()).map(([task, mins]) => ({ task, mins }))
    }))
    .sort((a, b) => a.project.localeCompare(b.project));

  const maxShow = 1; // show one lane by default (whether 1 or many)
  const extra = Math.min(4, Math.max(0, projects.length - maxShow)); // up to 5 total

  const makeLane = (p) => {
    const pxPerMin = 0.5;                 // 60 mins -> 30px tall
    const step = Math.max(6, Math.round(30 * pxPerMin)); // coin step for 30 min
    const bars = p.tasks
      .sort((a, b) => b.mins - a.mins)
      .map(t => {
        const h = Math.max(8, Math.round(t.mins * pxPerMin));
        return `
          <div class="task-card">
            <div class="bar" style="height:${h}px; --step:${step}px;"></div>
            <div class="label" title="${escapeHtml(t.task)}">${escapeHtml(truncate(t.task, 12))}</div>
            <div class="mins">${t.mins}m</div>
          </div>`;
      }).join('');
    const total = p.tasks.reduce((s, t) => s + t.mins, 0);
    return `
      <div class="project-lane">
        <h4><span>${escapeHtml(p.project)}</span><span>${total} min</span></h4>
        <div class="task-bar-row">${bars}</div>
      </div>`;
  };

  let html = makeLane(projects[0] ?? { project:'', tasks:[] });
  if (extra > 0) {
    html += `<div><button id="btnMoreProjects">Show more projects (${extra})</button></div>`;
  }
  els.projectsWrap.innerHTML = html;

  // Reveal up to five lanes total
  const btnMore = document.getElementById('btnMoreProjects');
  if (btnMore) {
    btnMore.addEventListener('click', () => {
      const more = projects.slice(1, 1 + Math.min(4, projects.length - 1))
                           .map(makeLane).join('');
      els.projectsWrap.innerHTML = makeLane(projects[0]) + more;
    }, { once: true });
  }
}

function truncate(s, n) {
  return (s && s.length > n) ? s.slice(0, n - 1) + '…' : s;
}

// =====================
// Date picker init
// =====================
export function initDatePicker(inputEl) {
  if (!window.flatpickr) return null;
  const fp = window.flatpickr(inputEl, {
    dateFormat: 'd/m/Y',
    altInput: true,
    altFormat: 'd/m/Y',
    allowInput: true,
    defaultDate: null,             // let us control it
    monthSelectorType: 'dropdown',
    wrap: false,
    appendTo: document.body,       // <— renders above dialog
    disableMobile: false
  });
  return fp;
}
