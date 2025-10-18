// js/ui.js
import { APP } from './config.js';

export const els = {
  who:    document.getElementById('who'),
  rows:   document.getElementById('rows'),
  count:  document.getElementById('count'),
  login:  document.getElementById('login'),
  cta:    document.getElementById('cta'),
  hint:   document.getElementById('hint'),
};

export function setSignedOutUI() {
  els.who.textContent = '';
  els.cta.textContent = APP.bottomCtaSignedOut;
  els.hint.textContent = 'We’ll only use your email to keep your private log.';
  els.login.dataset.state = 'signed-out';
  setEmpty(APP.emptySignedOut);
  els.count.textContent = '0 entries';
}

export function setSignedInUI(email) {
  els.who.textContent = email || 'Signed in';
  els.cta.textContent = APP.bottomCtaSignedIn;
  els.hint.textContent = 'Signed in — loading your log…';
  els.login.dataset.state = 'signed-in';
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
      <td>${row.language ?? ''}</td>
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
