// js/config.js
export const SUPABASE_URL = 'https://YOUR-PROJECT-ref.supabase.co';
export const SUPABASE_ANON_KEY = 'YOUR-ANON-KEY';

// Optional: OAuth redirect back to this page
export const OAUTH_REDIRECT_TO = `${location.origin}${location.pathname}`;

// App copy / flags
export const APP = {
  title: 'Study Log',
  bottomCtaSignedOut: 'Sign in with Google',
  bottomCtaSignedIn: 'Sign out',
  emptySignedOut: 'Sign in to load your log…',
  emptyNoData: 'No entries yet. Start your first session!',
  tableLimit: 100,
};
