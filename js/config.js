// js/config.js
export const SUPABASE_URL = 'https://jstkzbgypzwyjwxraioz.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpzdGt6Ymd5cHp3eWp3eHJhaW96Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA3MjI4NzEsImV4cCI6MjA3NjI5ODg3MX0.TyFHy_K2qYbk5HB20oFnDSpVoibfgJUHq9JyXPKsrF8';

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
