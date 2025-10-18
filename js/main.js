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

supabase.auth.onAuthStateChange((evt) => {
  if (evt === 'SIGNED_IN' || evt === 'SIGNED_OUT') refreshUI();
});

els.login.addEventListener('click', async () => {
  const signedIn = els.login.dataset.state === 'signed-in';
  els.login.disabled = true;
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
    els.login.disabled = false;
  }
});

refreshUI();
