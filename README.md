# About
Use this space to gently record focused sessions: what you worked on, what you did, and how long you spent. Over time, these small entries form a quiet trace of your effort, supporting presence, consistency, and awareness of your progress. A minimal, privacy-friendly work tracker—sign in with Google to keep your log private to you.

# work-stack
Visual display of different stacks of work.

Production URL: https://workstack.claudiopalominos.com/

## Custom domain / deployment checklist

This repository is configured for GitHub Pages with the custom domain in `CNAME`:

```text
workstack.claudiopalominos.com
```

To serve this app as `workstack.claudiopalominos.com` instead of `claudiopalominos.com/work-stack/`:

1. In the repository Pages settings, set the custom domain to `workstack.claudiopalominos.com` and enable HTTPS once GitHub provisions the certificate.
2. In DNS for `claudiopalominos.com`, create a `CNAME` record for host `workstack` pointing to the GitHub Pages host for this repository/account, not to the apex website.
3. Keep all app URLs root-relative or generated from `window.location`; do not hard-code `https://clpalomi.github.io/work-stack/`.
4. In Supabase Authentication URL settings, add the production callback URL:
   - `https://workstack.claudiopalominos.com/callback.html`
5. If you keep the GitHub Pages project URL for testing, also add its callback URL in Supabase:
   - `https://clpalomi.github.io/work-stack/callback.html`

## To-do
- Colors for categories
- stats
