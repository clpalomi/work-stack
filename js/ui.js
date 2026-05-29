// js/ui.js
import { APP } from './config.js';

export const els = {
  who:        document.getElementById('who'),
  rows:       document.getElementById('rows'),           // legacy (not used by new table)
  count:      document.getElementById('count'),
  menuBtn:    document.getElementById('menu-btn'),
  menu:       document.getElementById('menu'),
  menuBackdrop: document.getElementById('menu-backdrop'),
  menuLogin: document.getElementById('menu-login'),
  menuMy: document.getElementById('menu-my'),
  menuProjects: document.getElementById('menu-projects'),
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
  btnCalendar: document.getElementById('btnCalendar'),
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

  // add-entry form controls
  date: document.getElementById('date'),
  dateToday: document.getElementById('date-today'),
  task: document.getElementById('task'),
  project: document.getElementById('project'),
  minutes: document.getElementById('minutes'),
  save: document.getElementById('save'),
  cancel: document.getElementById('cancel'),
  deleteEntry: document.getElementById('delete-entry'),
};

let SHOW_ALL_SESSIONS = false;
let PROJECTS_PANEL_OPEN = false;
let SHOW_ALL_PROJECTS = false;
let ACTIVE_PROJECT_KEY = '';
const DEFAULT_VISIBLE_SESSIONS = 5;
const SHOW_ALL_VISIBLE_ROWS = 10;
const MAX_MENU_PROJECTS = 5;
const LIGHT_PROJECT_TOKEN_MINUTES = 30;
const DARK_PROJECT_TOKEN_MINUTES = 300;
const PARTIAL_PROJECT_TOKEN_STEP_MINUTES = LIGHT_PROJECT_TOKEN_MINUTES / 3;

export function setSignedOutUI() {
  PROJECTS_PANEL_OPEN = false;
  SHOW_ALL_PROJECTS = false;
  ACTIVE_PROJECT_KEY = '';
  const login = document.getElementById('menu-login');
  if (login) {
    login.dataset.state = 'signed-out';
    login.textContent = 'Sign in with Google';
  }
  if (els.toolbar) els.toolbar.hidden = true;
  // hide “My entries” etc.
}

export function setSignedInUI(email) {
  const who = document.getElementById('who');
  if (who) who.textContent = email || '';
  const login = document.getElementById('menu-login');
  if (login) {
    login.dataset.state = 'signed-in';
    login.textContent = 'Sign out';
  }
  if (els.toolbar) els.toolbar.hidden = false;
}

export function setLoading() {
  if (els.tableWrap) els.tableWrap.innerHTML = '<p>Loading…</p>';
  if (els.projectsWrap) {
    els.projectsWrap.innerHTML = '';
    els.projectsWrap.hidden = true;
  }
}

export function setEmpty(msg='No entries yet.') {
  if (els.tableWrap) els.tableWrap.innerHTML = `<p>${msg}</p>`;
  if (els.projectsWrap) {
    els.projectsWrap.innerHTML = '';
    els.projectsWrap.hidden = true;
  }
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

// Robust dd/mm/yyyy formatter for ISO strings, YYYY-MM-DD, Date objects, or already dd/mm/yyyy
export function isoToDMY(value) {
  if (!value) return '';
  if (typeof value === 'string' && /^\d{2}\/\d{2}\/\d{4}$/.test(value)) return value;

  let d;
  if (value instanceof Date) {
    d = value;
  } else if (typeof value === 'string') {
    // ISO / YYYY-MM-DD first
    if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
      d = new Date(value);
    } else {
      // Try dd/mm/yyyy -> Date
      const m = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
      if (m) d = new Date(+m[3], +m[2] - 1, +m[1]);
      else d = new Date(value);
    }
  } else {
    d = new Date(value);
  }

  if (!(d instanceof Date) || Number.isNaN(d.getTime())) return '';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}


// =====================
// Table render (Task, Project, Minutes, Date, Notes?)
// =====================
export function renderRows(rows, _showNotes = false, handlers = {}) {
  if (!rows?.length) {
    setEmpty();
    return;
  }

  const totalRows = rows.length;
  if (totalRows <= DEFAULT_VISIBLE_SESSIONS) SHOW_ALL_SESSIONS = false;
  const visibleRows = SHOW_ALL_SESSIONS ? rows : rows.slice(0, DEFAULT_VISIBLE_SESSIONS);

  const head = `
    <thead><tr>
      <th>Task</th>
      <th>Project</th>
      <th>Minutes</th>
      <th>Date</th>
      <th class="actions-col"> </th>
    </tr></thead>`;

const body = visibleRows.map(r => {
    const hasNote = !!(r.notes && String(r.notes).trim());
    const preview = hasNote ? notePreview(r.notes) : '';
    const full = hasNote ? String(r.notes).trim() : '';

    return `
      <tr
        ${hasNote ? `class="has-note" data-note-preview="${escapeAttr(preview)}" data-note-full="${escapeAttr(full)}" data-has-more="${full.length > NOTE_PREVIEW_MAX ? '1' : '0'}"` : ''}
      >
        <td>${escapeHtml(r.task ?? '')}</td>
        <td>${escapeHtml(r.project ?? '')}</td>
        <td>${Number(r.minutes) || 0}</td>
        <td>${r.date ? isoToDMY(r.date) : ''}</td>
        <td class="actions-col">
          <button type="button" class="icon-btn" data-edit-id="${escapeAttr(r.id ?? '')}" aria-label="Edit row">✏️</button>
        </td>
      </tr>`;
  }).join('');

  if (els.tableWrap) {
    const remaining = Math.max(0, totalRows - DEFAULT_VISIBLE_SESSIONS);
    const summary = totalRows > DEFAULT_VISIBLE_SESSIONS
      ? `<div style="padding:10px 12px 0; color: var(--muted); font-size: .85rem;">
           ${SHOW_ALL_SESSIONS ? `Showing all ${totalRows} sessions` : `Showing latest ${DEFAULT_VISIBLE_SESSIONS} of ${totalRows} sessions`}
         </div>`
      : '';
    const toggleBtn = totalRows > DEFAULT_VISIBLE_SESSIONS
      ? `<div style="padding:10px 12px;">
           <button id="btnToggleSessions" class="inline-toggle-btn" type="button">
             ${SHOW_ALL_SESSIONS ? 'Show fewer sessions' : `Show all sessions (+${remaining})`}
           </button>
         </div>`
      : '';
    const tableClass = SHOW_ALL_SESSIONS ? 'table-scroll' : '';
    els.tableWrap.innerHTML = `${summary}<div class="${tableClass}"><table class="table">${head}<tbody>${body}</tbody></table></div>${toggleBtn}`;
    if (SHOW_ALL_SESSIONS) {
      const wrap = els.tableWrap.querySelector('.table-scroll');
      const table = wrap?.querySelector('table');
      const headRow = table?.querySelector('thead tr');
      const rowsToMeasure = Array.from(table?.querySelectorAll('tbody tr') || []).slice(0, SHOW_ALL_VISIBLE_ROWS);
      if (wrap && headRow && rowsToMeasure.length) {
        const totalRowsHeight = rowsToMeasure.reduce((sum, tr) => sum + tr.getBoundingClientRect().height, 0);
        const headHeight = headRow.getBoundingClientRect().height;
        wrap.style.maxHeight = `${Math.ceil(totalRowsHeight + headHeight + 2)}px`;
      }
    }

    const noteRows = els.tableWrap.querySelectorAll('tbody tr.has-note');

let noteEl = null;
function showNote(text) {
  removeNote();
  noteEl = document.createElement('div');
  noteEl.className = 'note-pop';
  noteEl.textContent = text;
  document.body.appendChild(noteEl);
}
function moveNote(x, y) {
  if (!noteEl) return;
  const margin = 12; // offset from cursor
  const rect = noteEl.getBoundingClientRect();
  let left = x + margin;
  let top  = y + margin;
  // keep on screen
  const vw = window.innerWidth, vh = window.innerHeight;
  if (left + rect.width > vw - 8) left = vw - rect.width - 8;
  if (top + rect.height > vh - 8) top = vh - rect.height - 8;
  noteEl.style.left = left + 'px';
  noteEl.style.top  = top  + 'px';
}
function removeNote() {
  if (noteEl && noteEl.parentNode) noteEl.parentNode.removeChild(noteEl);
  noteEl = null;
}

noteRows.forEach(tr => {
  tr.addEventListener('mouseenter', () => {
    const preview = tr.dataset.notePreview || '';
    if (preview) showNote(preview);
  });
  tr.addEventListener('mousemove', (e) => moveNote(e.clientX, e.clientY));
  tr.addEventListener('mouseleave', removeNote);

  // Click to expand only if truncated
  tr.addEventListener('click', (e) => {
    if (e.target.closest('button, a, input, textarea, select')) return;
    if (tr.dataset.hasMore === '1') alert(tr.dataset.noteFull);
  });
});

// Safety: remove tooltip if table updates or window scrolls
window.addEventListener('scroll', removeNote, { passive:true });
    els.tableWrap.querySelectorAll('button[data-edit-id]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = String(btn.dataset.editId || '').trim();
        const row = rows.find((item) => String(item.id) === id);
        if (row && typeof handlers.onEdit === 'function') handlers.onEdit(row);
      });
    });
    
    const btnToggleSessions = document.getElementById('btnToggleSessions');
    if (btnToggleSessions) {
      btnToggleSessions.addEventListener('click', () => {
        SHOW_ALL_SESSIONS = !SHOW_ALL_SESSIONS;
        renderRows(rows, _showNotes, handlers);
      });
    }
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

const NOTE_PREVIEW_MAX = 160;

function notePreview(text) {
  if (!text) return '';
  const clean = String(text).trim();
  if (clean.length <= NOTE_PREVIEW_MAX) return clean;
  return clean.slice(0, NOTE_PREVIEW_MAX) + ' … read more';
}

// For data-* attributes we reuse escapeHtml (it also escapes quotes)
const escapeAttr = escapeHtml;
// =====================
// Project summary shown from the hamburger menu
// =====================
export function renderProjects(rows) {
  if (!els.projectsWrap) return;

  const allProjects = getLatestProjects(rows);
  if (!allProjects.some((project) => project.key === ACTIVE_PROJECT_KEY)) {
    ACTIVE_PROJECT_KEY = '';
  }
  const projects = SHOW_ALL_PROJECTS ? allProjects : allProjects.slice(0, MAX_MENU_PROJECTS);

  if (!PROJECTS_PANEL_OPEN) {
    els.projectsWrap.hidden = true;
    els.projectsWrap.innerHTML = '';
    return;
  }

  els.projectsWrap.hidden = false;

  if (!allProjects.length) {
    els.projectsWrap.innerHTML = `
      <section class="projects-card" aria-labelledby="projects-title">
        <div class="projects-card-h">
          <h2 id="projects-title">My projects</h2>
        </div>
        <p class="projects-empty">No projects yet. Add a work session to see your latest projects here.</p>
      </section>`;
    return;
  }

  const items = projects.map((project) => {
    const isActive = project.key === ACTIVE_PROJECT_KEY;
    const taskBreakdown = isActive ? renderProjectTaskBreakdown(rows, project) : '';
    return `
      <li class="project-summary-item${isActive ? ' is-active' : ''}">
        <div class="project-summary-main">
          <button type="button" class="project-name-btn" data-project-key="${escapeAttr(project.key)}" aria-expanded="${isActive ? 'true' : 'false'}">
            ${escapeHtml(project.name)}
          </button>
          <small>Latest activity ${escapeHtml(isoToDMY(project.latestISO))}</small>
        </div>
        <span class="project-summary-time">${escapeHtml(formatDuration(project.minutes))}</span>
        ${taskBreakdown}
      </li>
    `;
  }).join('');

  const hiddenCount = Math.max(0, allProjects.length - MAX_MENU_PROJECTS);
  const showAllControl = hiddenCount > 0
    ? `<div class="projects-card-actions">
         <button id="btnToggleProjects" class="inline-toggle-btn" type="button">
           ${SHOW_ALL_PROJECTS ? 'Show recent projects' : `Show all projects (+${hiddenCount})`}
         </button>
       </div>`
    : '';
  const badgeLabel = SHOW_ALL_PROJECTS
    ? `All ${allProjects.length}`
    : `Latest ${projects.length}`;

  els.projectsWrap.innerHTML = `
    <section class="projects-card" aria-labelledby="projects-title">
      <div class="projects-card-h">
        <h2 id="projects-title">My projects</h2>
        <span class="badge">${escapeHtml(badgeLabel)}</span>
      </div>
      <ol class="project-summary-list">${items}</ol>
      ${showAllControl}
    </section>`;

  els.projectsWrap.querySelectorAll('button[data-project-key]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const key = String(btn.dataset.projectKey || '').trim();
      ACTIVE_PROJECT_KEY = ACTIVE_PROJECT_KEY === key ? '' : key;
      renderProjects(rows);
    });
  });

  const btnToggleProjects = document.getElementById('btnToggleProjects');
  if (btnToggleProjects) {
    btnToggleProjects.addEventListener('click', () => {
      SHOW_ALL_PROJECTS = !SHOW_ALL_PROJECTS;
      renderProjects(rows);
    });
  }
}

export function showProjects(rows) {
  PROJECTS_PANEL_OPEN = true;
  renderProjects(rows);
  els.projectsWrap?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function getLatestProjects(rows, limit = Infinity) {
  const byProject = new Map();
  for (const row of (rows || [])) {
    const name = String(row.project || '').trim();
    if (!name) continue;

    const key = name.toLowerCase();
    const minutes = Number(row.minutes) || 0;
    const dateValue = String(row.date || '').slice(0, 10);
    const latest = Date.parse(dateValue) || 0;

    if (!byProject.has(key)) {
      byProject.set(key, { key, name, minutes: 0, latest: 0, latestISO: dateValue });
    }
    
    const project = byProject.get(key);
    project.minutes += minutes;
    if (latest >= project.latest) {
      project.latest = latest;
      project.latestISO = dateValue;
    }
  }

  return Array.from(byProject.values())
    .sort((a, b) => (b.latest - a.latest) || a.name.localeCompare(b.name))
    .slice(0, limit);
}

function renderProjectTaskBreakdown(rows, project) {
  const tasks = getProjectTasks(rows, project.key);
  if (!tasks.length) {
    return '<div class="project-task-breakdown"><p class="projects-empty">No tasks logged for this project yet.</p></div>';
  }

  const taskCards = tasks.map((task) => {
    const units = renderProjectTimeTokens(task.minutes);

    return `
      <article class="task-card" title="${escapeAttr(`${task.name}: ${formatDuration(task.minutes)}`)}">
        <div class="task-card-meta">
          <div class="label">${escapeHtml(task.name)}</div>
          <div class="mins">${escapeHtml(formatDuration(task.minutes))}</div>
        </div>
        <div class="bar" aria-label="${escapeAttr(`${formatDuration(task.minutes)} represented as vertical project tokens`)}">${units}</div>
      </article>
    `;
  }).join('');

  return `
    <div class="project-task-breakdown" aria-label="Blue token accumulation by task for ${escapeAttr(project.name)}">
      <div class="task-bar-row">${taskCards}</div>
    </div>
  `;
}

function renderProjectTimeTokens(totalMinutes) {
  const minutes = Math.max(0, Math.round(Number(totalMinutes) || 0));
  const darkTokens = Math.floor(minutes / DARK_PROJECT_TOKEN_MINUTES);
  let remainder = minutes % DARK_PROJECT_TOKEN_MINUTES;
  const lightTokens = Math.floor(remainder / LIGHT_PROJECT_TOKEN_MINUTES);
  remainder %= LIGHT_PROJECT_TOKEN_MINUTES;

  const tokens = [
    ...Array.from({ length: darkTokens }, () => '<span class="unit dark" aria-label="5 hours"></span>'),
    ...Array.from({ length: lightTokens }, () => '<span class="unit light" aria-label="30 minutes"></span>'),
  ];

  if (remainder > 0) {
    const thirds = Math.min(3, Math.max(1, Math.ceil(remainder / PARTIAL_PROJECT_TOKEN_STEP_MINUTES)));
    const fill = `${(thirds / 3) * 100}%`;
    tokens.push(`<span class="unit light partial partial-${thirds}" style="--fill:${fill}" aria-label="about ${thirds}/3 of 30 minutes"></span>`);
  }

  if (!tokens.length) {
    tokens.push('<span class="unit light partial partial-1" style="--fill:33.333%" aria-label="less than 30 minutes"></span>');
  }

  return tokens.join('');
}

function getProjectTasks(rows, projectKey) {
  const byTask = new Map();
  for (const row of (rows || [])) {
    if (String(row.project || '').trim().toLowerCase() !== projectKey) continue;

    const name = String(row.task || 'Untitled task').trim() || 'Untitled task';
    const key = name.toLowerCase();
    const minutes = Number(row.minutes) || 0;
    const dateValue = String(row.date || '').slice(0, 10);
    const latest = Date.parse(dateValue) || 0;

    if (!byTask.has(key)) {
      byTask.set(key, { name, minutes: 0, latest });
    }

    const task = byTask.get(key);
    task.minutes += minutes;
    task.latest = Math.max(task.latest, latest);
  }

  return Array.from(byTask.values())
    .sort((a, b) => (b.latest - a.latest) || b.minutes - a.minutes || a.name.localeCompare(b.name));
}

function formatDuration(totalMinutes) {
  const minutes = Math.max(0, Math.round(Number(totalMinutes) || 0));
  if (minutes < 60) return `${minutes} min`;

  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  const hourLabel = `${hours} hr${hours === 1 ? '' : 's'}`;
  return remaining ? `${hourLabel} ${remaining} min` : hourLabel;
}

// =====================
// Date picker init
// =====================
export function initDatePicker(inputEl, { onPick } = {}) {
  // inputEl: the <input> for date (dd/mm/yyyy)
  // onPick(dateISO) is called when a date is chosen

  // Create a single popover container once
  let pop = document.querySelector('#datepicker-popover');
  if (!pop) {
    pop = document.createElement('div');
    pop.id = 'datepicker-popover';
    pop.className = 'datepicker-popover';
    pop.hidden = true;
    document.body.appendChild(pop);
  }

  // --- your calendar widget/markup (keep whatever you already use) ---
  // For illustration we create a very simple calendar host element:
  let cal = pop.querySelector('.calendar-host');
  if (!cal) {
    cal = document.createElement('div');
    cal.className = 'calendar-host';
    pop.appendChild(cal);
    // TODO: mount your existing calendar into `cal`
    // e.g., renderCalendar(cal, { onSelect: (dateISO) => pick(dateISO) })
  }

  let currentAnchor = null;

  function placePopover(anchor) {
    const r = anchor.getBoundingClientRect();
    const margin = 8;
    const popW = pop.offsetWidth || 280;
    const popH = pop.offsetHeight || 320;

    // Default below the input
    let left = r.left;
    let top = r.bottom + margin;

    // If overflowing right, align to right edge of input
    const overflowRight = left + popW > window.innerWidth - 8;
    if (overflowRight) left = Math.max(8, r.right - popW);

    // If not enough space below, flip above
    const belowSpace = window.innerHeight - r.bottom;
    const needFlip = belowSpace < popH + margin && r.top > popH + margin;
    if (needFlip) {
      top = r.top - popH - margin;
      // move arrow
      pop.style.setProperty('--arrow-top', `${popH - 4}px`);
      pop.style.setProperty('--arrow-rotate', '225deg');
      pop.style.setProperty('--arrow-border', '1px solid var(--border)');
      pop.style.setProperty('--arrow-left', `${Math.min(24, Math.max(12, r.width/2 - 8))}px`);
    } else {
      pop.style.setProperty('--arrow-top', `-6px`);
      pop.style.setProperty('--arrow-rotate', '45deg');
      pop.style.setProperty('--arrow-left', `16px`);
    }

    // Apply
    pop.style.left = `${Math.round(left)}px`;
    pop.style.top = `${Math.round(top)}px`;
  }

  function open() {
    currentAnchor = inputEl;
    pop.hidden = false;
    // Give it one frame so it has size for correct placement
    requestAnimationFrame(() => {
      placePopover(inputEl);
    });
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onResize, { passive: true });
    document.addEventListener('pointerdown', onDocDown);
  }

  function close() {
    pop.hidden = true;
    currentAnchor = null;
    window.removeEventListener('scroll', onScroll, true);
    window.removeEventListener('resize', onResize);
    document.removeEventListener('pointerdown', onDocDown);
  }

  function onScroll() { if (!pop.hidden && currentAnchor) placePopover(currentAnchor); }
  function onResize() { if (!pop.hidden && currentAnchor) placePopover(currentAnchor); }

  function onDocDown(e) {
    // close if clicking outside input and popover
    if (e.target === inputEl || pop.contains(e.target)) return;
    close();
  }

  // Hook input
  inputEl.addEventListener('focus', open);
  inputEl.addEventListener('click', open);

  // When a date is chosen in your calendar, call:
  function pick(dateISO) {
    // Format dd/mm/yyyy for your UI if needed:
    const [y, m, d] = dateISO.split('-');
    inputEl.value = `${d}/${m}/${y}`;
    onPick && onPick(dateISO);
    close();
  }

  // Expose a minimal API if needed elsewhere
  return { open, close, pick, popover: pop };
}
