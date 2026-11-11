import { weekRange } from './weekly.js';
// js/client.js
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { SUPABASE_URL, SUPABASE_ANON_KEY, APP } from './config.js';

// Use defaults: detectSessionInUrl:true, flowType:pkce (web)
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: true, detectSessionInUrl: true, autoRefreshToken: true }, //
});
window.supabase = supabase; // expose for debugging

// Parse auth callback once (PKCE or implicit), then clean URL noise.
// NOTE: Explicit code exchange is needed for some PKCE callback flows.
export const authReady = (async () => {
  try {
    if (/\bcode=/.test(location.search)) {
      const { error } = await supabase.auth.exchangeCodeForSession(window.location.href);
      if (!error) {
        history.replaceState({}, '', `${location.origin}${location.pathname}`);
      }
      return;
    }
    
    if (/\baccess_token=/.test(location.hash)) {
            const { error } = await supabase.auth.getSession();
      if (!error) {
        history.replaceState({}, '', `${location.origin}${location.pathname}`);
      }
      return;
    }

    await supabase.auth.getSession();
    } catch (e) {
      console.error('[auth:init] failed to parse callback session', e);
    }
})();


export async function getSessionUser() {
  await authReady;
  const { data: { session } } = await supabase.auth.getSession();
  return session?.user ?? null;
}

export async function getUser() {
  return getSessionUser();
}

export async function signInWithGoogle(redirectTo) {
  const options = redirectTo ? { redirectTo } : undefined;
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options,
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
    .from('work_log')
    .select('date, task, project, minutes, notes')
    .order('date', { ascending: false })
    .limit(APP.tableLimit);

  if (error) throw error;
  return data || [];
}

// client.js (append these)
export async function insertLog({ task, project, minutes, dateISO, notes, startTime }) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in');
  const payload = {
    user_id: user.id,
    task, project,
    minutes: Number(minutes),
    date: dateISO,       // 'YYYY-MM-DD'
    start_time: startTime || null,
    notes: notes || null
  };
  const { data, error } = await supabase.from('work_log').insert(payload).select().single();
  if (error) throw error;
  return data;
}

export async function fetchAllForUser(userId) {
  const resolvedUserId = userId || (await supabase.auth.getUser()).data.user?.id;
  if (!resolvedUserId) throw new Error('Not signed in');
  const { data, error } = await supabase
    .from('work_log')
    .select('*')
    .eq('user_id', resolvedUserId)
    .order('date', { ascending: false })
    .order('id', { ascending: false })
    .limit(APP.tableLimit);
  if (error) throw error;
  return data ?? [];
}

// Fetch both complete calendar weeks independently of the recent-entry table limit.
export async function fetchWeekEntries(userId, now = new Date()) {
  if (!userId) throw new Error('Not signed in');
  const { start, end } = weekRange(now);
  return fetchEntriesBetween(userId, start, end);
}

export async function fetchEntriesBetween(userId, start, end) {
  if (!userId) throw new Error('Not signed in');
  const rows = [];
  const pageSize = 500;
  while (true) {
    const { data, error, count } = await supabase
      .from('work_log')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .gte('date', start)
      .lte('date', end)
      .order('date', { ascending: false })
      .order('id', { ascending: false })
      .range(rows.length, rows.length + pageSize - 1);
    if (error) throw error;
    const page = data ?? [];
    rows.push(...page);
    if (count !== null && rows.length >= count) return rows;
    if (!page.length) {
      if (count > rows.length) throw new Error('Incomplete weekly entries response');
      return rows;
    }
  }
}

export async function updateLogEntry(id, { task, project, minutes, dateISO, notes, startTime }) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in');
  const payload = {
    task: String(task || '').trim(),
    project: String(project || '').trim(),
    minutes: Number(minutes),
    date: dateISO,
    start_time: startTime || null,
    notes: notes ? String(notes).trim() : null
  };
  const { data, error } = await supabase
    .from('work_log')
    .update(payload)
    .eq('id', id)
    .eq('user_id', user.id)
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export async function deleteLogEntry(id) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in');
  const { error } = await supabase
    .from('work_log')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);
  if (error) throw error;
}

// Backward-compatible alias for a previously mistyped import name.
// This prevents runtime breakage if a stale/cached bundle still imports updateLogEntryg.
export const updateLogEntryg = updateLogEntry;
