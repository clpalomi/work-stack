// js/ui.js
import { APP } from './config.js';

 export const els = {
   who:        document.getElementById('who'),
   rows:       document.getElementById('rows'),
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
  els.tableWrap.innerHTML = '';
  els.projectsWrap.innerHTML = '';
}

// Show/hide toolbars when signed in/out
export function setSignedInUI(email) {
  // your existing header updates...
  if (els.toolbar) els.toolbar.hidden = false;
}

export function setLoading() {
  els.tableWrap.innerHTML = '<p>Loading…</p>';
  els.projectsWrap.innerHTML = '';
}

export function setEmpty(msg='No entries yet.') {
  els.tableWrap.innerHTML = `<p>${msg}</p>`;
  els.projectsWrap.innerHTML = '';
}

export function renderRows(data) {
  els.rows.innerHTML = '';
  for (const row of data) {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${fmtDate(row.date)}</td>
      <td>${row.task ?? ''}</td>
      <td>${row.project ?? ''}</td>
      <td class="right">${Number(row.minutes ?? 0)}</td>
      <td>${row.notes ?? ''}</td>
    `;
    els.rows.appendChild(tr);
  }
  els.count.textContent = `${data.length} entr${data.length === 1 ? 'y' : 'ies'}`;
}

function fmtDate(d) {
  try {
    const dt = new Date(d);
    return new Intl.DateTimeFormat(undefined, { year:'numeric', month:'short', day:'2-digit' }).format(dt);
  } catch { return d; }
}

// dd/mm/yyyy -> ISO
export function toISO(dmy) {
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(dmy.trim());
  if (!m) return null;
  const [_, dd, mm, yyyy] = m;
  const d = new Date(Number(yyyy), Number(mm)-1, Number(dd));
  if (isNaN(d)) return null;
  const iso = d.toISOString().slice(0,10);
  // sanity: keep same day/month after normalization
  const back = new Date(iso);
  if (back.getDate() !== Number(dd) || back.getMonth() !== Number(mm)-1) return null;
  return iso;
}
export function todayISO() {
  const d = new Date();
  const iso = new Date(d.getFullYear(), d.getMonth(), d.getDate()).toISOString().slice(0,10);
  return iso;
}
export function isoToDMY(iso) {
  const [y,m,d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

// Table render (Task, Project, Minutes, Date, (Notes optional))
export function renderRows(rows, showNotes=false) {
  if (!rows?.length) return setEmpty();

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

  els.tableWrap.innerHTML = `<table class="table">${head}<tbody>${body}</tbody></table>`;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
}

// Project lanes: show 1 lane if one project; otherwise first + "show more" up to 5.
export function renderProjects(rows) {
  if (!rows?.length) { els.projectsWrap.innerHTML=''; return; }

  // group minutes by project -> by task
  const byProject = new Map();
  for (const r of rows) {
    const proj = (r.project ?? '').trim() || '(no project)';
    const task = (r.task ?? '').trim() || '(untitled)';
    const mins = Number(r.minutes)||0;
    if (!byProject.has(proj)) byProject.set(proj, new Map());
    const m = byProject.get(proj);
    m.set(task, (m.get(task)||0) + mins);
  }
  const projects = Array.from(byProject.entries()) // [proj, Map(task->mins)]
    .map(([proj, tasks]) => ({ project: proj, tasks: Array.from(tasks.entries()).map(([task,mins])=>({task, mins})) }))
    .sort((a,b)=> a.project.localeCompare(b.project));

  // Build lanes
  const maxShow = projects.length === 1 ? 1 : 1; // show one by default
  const extra = Math.min(4, Math.max(0, projects.length - maxShow)); // can expand up to 5 total

  const makeLane = (p) => {
    // scale: 1px per 2 minutes (adjust if tall); step for 30 min
    const pxPerMin = 0.5; // 60 mins -> 30px
    const step = Math.max(6, Math.round(30 * pxPerMin)); // min 6px visual
    const bars = p.tasks
      .sort((a,b)=> b.mins - a.mins)
      .map(t => {
        const h = Math.max(8, Math.round(t.mins * pxPerMin));
        return `
        <div class="task-card">
          <div class="bar" style="height:${h}px; --step:${step}px;"></div>
          <div class="label" title="${escapeHtml(t.task)}">${escapeHtml(truncate(t.task, 12))}</div>
          <div class="mins">${t.mins}m</div>
        </div>`;
      }).join('');
    const total = p.tasks.reduce((s,t)=>s+t.mins,0);
    return `
    <div class="project-lane">
      <h4><span>${escapeHtml(p.project)}</span><span>${total} min</span></h4>
      <div class="task-bar-row">${bars}</div>
    </div>`;
  };

  let html = makeLane(projects[0] ?? []);
  if (extra > 0) {
    html += `<div><button id="btnMoreProjects">Show more projects (${extra})</button></div>`;
  }
  els.projectsWrap.innerHTML = html;

  // Wire the "Show more" to reveal up to 5 lanes total
  const btnMore = document.getElementById('btnMoreProjects');
  if (btnMore) {
    btnMore.addEventListener('click', () => {
      const more = projects.slice(1, 1 + Math.min(4, projects.length-1))
                           .map(makeLane).join('');
      els.projectsWrap.innerHTML = makeLane(projects[0]) + more;
    }, { once: true });
  }
}

function truncate(s, n) {
  if (s.length <= n) return s;
  return s.slice(0, n-1) + '…';
}

export function initDatePicker(inputEl) {
  if (window.flatpickr) {
    window.flatpickr(inputEl, {
      dateFormat: "d/m/Y",
      altInput: true,
      altFormat: "d/m/Y",
      allowInput: true,
      defaultDate: new Date(),
      // compact, with easy year navigation:
      monthSelectorType: 'dropdown',   // month dropdown
      wrap: false,
      disableMobile: false
    });
  } else {
    // Fallback: native <input type="date"> look-and-feel is not used
    // (we keep text + parsing), but nothing else to do
  }
}
