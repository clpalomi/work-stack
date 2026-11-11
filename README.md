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

## Task start times and weekly stats

Before using task times, run [`supabase/task-times.sql`](supabase/task-times.sql)
in **Supabase Dashboard → SQL Editor**. This adds a nullable `start_time` column
of type `time without time zone` to `public.work_log` and validates timed durations
(up to 24 hours). Existing `date` and `minutes` store the day and duration; no
end-time column is needed. Existing RLS policies continue to protect the same rows.

Enter **Start time** when adding or editing a session. Times represent the local
clock time on the recorded date, and do not shift when viewing from another time
zone. Leave unknown historical times blank; they appear under **Time not recorded**.
Do not backfill old entries with the current time. To record multiple separated
slots of work, create one entry per slot.

Open **Weekly stats** from the right-hand menu. It starts at last week; use the
arrows or date picker to browse another week. Colors identify projects; hover,
focus, or tap a slot for its project, task, time range, and duration. Overlapping
slots appear side by side, and sessions crossing midnight continue on the next day.
The query retrieves all entries for the selected week, including carryover from
the preceding Sunday, independently of the recent table's 100-entry limit.

Apply the SQL before deploying this version: reads tolerate old entries without
start times, but saving entries requires the new column. No new credentials or
RLS policy changes are needed. The SQL is provided for you to run; it is not
applied automatically by the app.

Run the timeline layout tests with `node --test tests/*.test.mjs` (Node 22+).
