// js/client.js
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { SUPABASE_URL, SUPABASE_ANON_KEY, APP } from './config.js';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: true, detectSessionInUrl: true, autoRefreshToken: true },
});

export async function getUser() {
  const { data: { user } } = await supabase.auth.getUser();
  return user ?? null;
}

export async function signInWithGoogle(redirectTo) {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo },
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
    .select('date, language, minutes, notes')
    .order('date', { ascending: false })
    .limit(APP.tableLimit);

  if (error) throw error;
  return data || [];
}
