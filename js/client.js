// js/client.js
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { SUPABASE_URL, SUPABASE_ANON_KEY, APP } from './config.js';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: true, detectSessionInUrl: true, autoRefreshToken: true },
});

(async () => {
  console.log('[auth:init] href:', location.href);
  console.log('[auth:init] search:', location.search);
  console.log('[auth:init] hash:', location.hash);

  try {
    // PKCE return: ?code=...&state=...
    if (/\bcode=/.test(location.search)) {
      const { data, error } = await supabase.auth.exchangeCodeForSession(window.location.href);
      console.log('[auth:init] exchangeCodeForSession', { data, error });
      if (!error) history.replaceState({}, '', `${location.origin}${location.pathname}`);
      return;
    }

    // Implicit return: #access_token=...&state=...
    if (/\baccess_token=/.test(location.hash)) {
      const { data, error } = await supabase.auth.getSession();
      console.log('[auth:init] getSession (implicit)', { data, error });
      if (!error) history.replaceState({}, '', `${location.origin}${location.pathname}`);
      return;
    }

    // Normal load: no OAuth params
    await supabase.auth.getSession();
  } catch (e) {
    console.error('[auth:init] OAuth parse failed', e);
  }
})();


export async function getUser() {
  const { data: { user } } = await supabase.auth.getUser();
  return user ?? null;
}

export async function signInWithGoogle(redirectTo) {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google'
  });
  if (error) throw error;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function fetchLog() {
  // adjust table/columns if yours differ
  const { data, error } = await supabase
    .from('study_log')
    .select('date, task, project, minutes, notes')
    .order('date', { ascending: false })
    .limit(APP.tableLimit);

  if (error) throw error;
  return data || [];
}
