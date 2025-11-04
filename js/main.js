// js/main.js
import { supabase, getUser, fetchLog, signInWithGoogle, signOut } from './client.js';
import { els, setSignedOutUI, setSignedInUI, setLoading, setEmpty, renderRows } from './ui.js';
import { OAUTH_REDIRECT_TO } from './config.js'; // <-- make sure this exists

// tiny helper so addEventListener never crashes if an element is missing
const on = (el, evt, fn) => el && el.addEventListener(evt, fn);

async function refreshUI() {
  try {
    const user = await getUser();
    if (!user) return setSignedOutUI();
    setSignedInUI(user.email);
    setLoading();
    const data = await fetchLog();
    if (!data?.length) return setEmpty('No entries yet. Start your first session!');
    renderRows(data);
  } catch (err) {
    console.error(err);
    setEmpty('Could not load your log. Check RLS/policies.');
  }
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

