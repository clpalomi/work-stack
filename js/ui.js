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
   menuMy: document.getElementById('menu-my'),
   menuSignin: document.getElementById('menu-signin'),
   menuSignout: document.getElementById('menu-signout'),
   menuAbout: document.getElementById('menu-about'),
   about: document.getElementById('about'),
   aboutBackdrop: document.getElementById('about-backdrop'),
   aboutClose: document.getElementById('about-close'),
 };

export function setSignedOutUI() {
  els.who.textContent = '';
  els.menuSignin.hidden = false;
  els.menuSignout.hidden = true;
  setEmpty(APP.emptySignedOut);
  els.count.textContent = '0 entries';
}

export function setSignedInUI(email) {
  els.who.textContent = email || 'Signed in';
  els.menuSignin.hidden = true;
  els.menuSignout.hidden = false;
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
