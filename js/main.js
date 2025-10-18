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



els.menuLogin.addEventListener('click', async () => {
  const signedIn = els.menuLogin.dataset.state === 'signed-in';
  els.menuLogin.disabled = true;
  try {
    if (signedIn) {
      await signOut();
    } else {
      await signInWithGoogle(OAUTH_REDIRECT_TO);
    }
  } catch (e) {
    console.error(e);
    alert('Authentication failed. Confirm your keys and redirect URLs in Supabase.');
  } finally {
    els.menuLogin.disabled = false;
    closeMenu();
  }
});

refreshUI();
