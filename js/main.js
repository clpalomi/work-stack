// js/main.js

import { OAUTH_REDIRECT_TO } from './config.js';
import { supabase, getUser, fetchLog, signInWithGoogle, signOut } from './client.js';
import { els, setSignedOutUI, setSignedInUI, setLoading, setEmpty, renderRows } from './ui.js';

async function refreshUI() {
  const user = await getUser();
  if (!user) return setSignedOutUI();
  setSignedInUI(user.email);
  try {
    setLoading();
    const data = await fetchLog();
    if (!data.length) return setEmpty('No entries yet. Start your first session!');
    renderRows(data);
  } catch (err) {
    console.error(err);
    setEmpty('Could not load your log. Check RLS/policies.');
  }
}

// Menu helpers
function openMenu() {
  els.menu.setAttribute('aria-hidden', 'false');
  els.menuBtn.setAttribute('aria-expanded', 'true');
  els.menuBackdrop.hidden = false;
}
function closeMenu() {
  els.menu.setAttribute('aria-hidden', 'true');
  els.menuBtn.setAttribute('aria-expanded', 'false');
  els.menuBackdrop.hidden = true;
}
function toggleMenu() {
  const open = els.menu.getAttribute('aria-hidden') === 'false';
  open ? closeMenu() : openMenu();
}

supabase.auth.onAuthStateChange((evt) => {
  if (evt === 'SIGNED_IN' || evt === 'SIGNED_OUT') refreshUI();
});


// Open/close menu
els.menuBtn.addEventListener('click', toggleMenu);
els.menuBackdrop.addEventListener('click', closeMenu);
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMenu(); });

// My entries ⇒ scroll to table
els.menuMy.addEventListener('click', () => {
  document.getElementById('log-title')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  closeMenu();
});

// Sign in
els.menuSignin.addEventListener('click', async () => {
  els.menuSignin.disabled = true;
  try { await signInWithGoogle(OAUTH_REDIRECT_TO); }
  catch (e) { console.error(e); alert('Auth failed. Check keys/redirect URLs.'); }
  finally { els.menuSignin.disabled = false; closeMenu(); }
});

// Sign out
els.menuSignout.addEventListener('click', async () => {
  els.menuSignout.disabled = true;
  try { await signOut(); }
  catch (e) { console.error(e); alert('Sign out failed.'); }
  finally { els.menuSignout.disabled = false; closeMenu(); }
});

// About modal
function openAbout(){ els.about.setAttribute('aria-hidden','false'); els.aboutBackdrop.hidden = false; }
function closeAbout(){ els.about.setAttribute('aria-hidden','true'); els.aboutBackdrop.hidden = true; }
els.menuAbout.addEventListener('click', () => { openAbout(); closeMenu(); });
els.aboutBackdrop.addEventListener('click', closeAbout);
els.aboutClose.addEventListener('click', closeAbout);
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeAbout(); });

refreshUI();
