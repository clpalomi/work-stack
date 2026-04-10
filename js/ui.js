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

  // add-entry form controls
  date: document.getElementById('date'),
  dateToday: document.getElementById('date-today'),
  task: document.getElementById('task'),
  project: document.getElementById('project'),
  minutes: document.getElementById('minutes'),
  save: document.getElementById('save'),
  cancel: document.getElementById('cancel'),
};

let SHOW_ALL_SESSIONS = false;
const DEFAULT_VISIBLE_SESSIONS = 5;

export function setSignedOutUI() {
  const login = document.getElementById('menu-login');
  if (login) {
    login.dataset.state = 'signed-out';
    login.textContent = 'Sign in with Google';
  }
  // hide “My entries” etc. if you want
}

export function setSignedInUI(email) {
  const who = document.getElementById('who');
  if (who) who.textContent = email || '';
  const login = document.getElementById('menu-login');
  if (login) {
    login.dataset.state = 'signed-in';
    login.textContent = 'Sign out';
  }
}

export function setLoading() {
  if (els.tableWrap) els.tableWrap.innerHTML = '<p>Loading…</p>';
  if (els.projectsWrap) els.projectsWrap.innerHTML = '';
}

export function setEmpty(msg='No entries yet.') {
@@ -114,122 +117,142 @@ export function isoToDMY(value) {
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
export function renderRows(rows /*, showNotes = false (ignored) */) {
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
      </tr>`;
  }).join('');

  if (els.tableWrap) {
    const remaining = Math.max(0, totalRows - DEFAULT_VISIBLE_SESSIONS);
    const toggleBtn = totalRows > DEFAULT_VISIBLE_SESSIONS
      ? `<div style="padding:10px 12px;">
           <button id="btnToggleSessions" type="button">
             ${SHOW_ALL_SESSIONS ? 'Show fewer sessions' : `Show all sessions (+${remaining})`}
           </button>
         </div>`
      : '';
    els.tableWrap.innerHTML = `<table class="table">${head}<tbody>${body}</tbody></table>${toggleBtn}`;

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

    const btnToggleSessions = document.getElementById('btnToggleSessions');
    if (btnToggleSessions) {
      btnToggleSessions.addEventListener('click', () => {
        SHOW_ALL_SESSIONS = !SHOW_ALL_SESSIONS;
        renderRows(rows);
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
