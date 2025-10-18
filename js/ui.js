// js/ui.js
import { APP } from './config.js';

 export const els = {
   who:        document.getElementById('who'),
   rows:       document.getElementById('rows'),
   count:      document.getElementById('count'),
   menuBtn:    document.getElementById('menu-btn'),
   menu:       document.getElementById('menu'),
   menuLogin:  document.getElementById('menu-login'),
   menuBackdrop: document.getElementById('menu-backdrop'),
 };

export function setSignedOutUI() {
  els.menuLogin.textContent = APP.bottomCtaSignedOut;
  els.menuLogin.dataset.state = 'signed-out';
  els.login.dataset.state = 'signed-out';
  setEmpty(APP.emptySignedOut);
  els.count.textContent = '0 entries';
}

export function setSignedInUI(email) {
  els.menuLogin.textContent = APP.bottomCtaSignedIn;
  els.menuLogin.dataset.state = 'signed-in';
}

export function setLoading() {
  setEmpty('Loading…');
}

export function setEmpty(msg) {
  els.rows.innerHTML = `<tr><td class="empty" colspan="4">${msg}</td></tr>`;
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
