# Plan: Production Readiness for The Night Club

## Goal
Make every feature work reliably for real users, update live without refreshing, and keep News populated automatically with current tech news.

## Phase 1: Signed-in end-to-end check
- Sign in as a real account and go through every main flow: sign up and sign in, password reset, username setup, editing the portfolio (photo, banner, experience, education), sharing `/in/username/`, projects with GitHub links, collaboration rooms (create, invite, join, edit, chat, run code), communities (create, post, vote, comment, chat, moderate), connections, messages, notifications, settings, and account deletion.
- Fix every error found, on desktop and phone sizes.

## Phase 2: Live updates everywhere
- Collaboration rooms: live editing, cursors, presence (Online/Away/Offline), chat, file changes, and participant list, with automatic reconnect and a visible "Reconnecting" state.
- Communities: new posts, votes, comments, and group chat appear live; member counts and role changes update live.
- Messages and notifications: new messages, unread counts, and the notification bell update live.
- Profiles: new followers, endorsements, and connection requests appear live.
- Every live connection closes when the user leaves the page, so connections don't pile up.

## Phase 3: News that keeps itself up to date
- Add a scheduled job that pulls tech news from public free sources (Hacker News, Dev.to, and RSS feeds) every hour, removes duplicates, and saves it as published articles. No API key is needed.
- News page: category filters, search, featured story, article pages with source links, live arrival of new stories, and loading and empty states.
- Admin-only option to post, feature, or hide stories, using a secure roles table.

## Phase 4: Security and data integrity
- Run the security scan and fix findings that belong to the app. List the settings that can only be changed in the Supabase dashboard (leaked-password protection, sign-in code expiry, database update) with steps.
- Re-check access rules so private groups, rooms, messages, and drafts can't be read by others, and public profiles stay readable without signing in.
- Fix the home page stats request that fails for signed-out visitors.
- Add limits on spammy actions (posting, messaging, code runs) and length checks on all forms.

## Phase 5: Performance and polish
- Reduce the always-running background animation, and turn it off on editor and room screens.
- Fix page exit transitions and remove unused animation and theme code.
- Load heavy screens (code editor, rooms) only when opened, and speed up the first page load.
- Every page gets proper loading, empty, and error states, plus a friendly crash screen.

## Phase 6: Launch readiness
- Accurate page titles, descriptions, and share previews on every page, plus a sitemap and robots file.
- Basic error tracking through Supabase logs, and checks that backend functions have the secrets they need.
- Remove the leftover separate socket server, since live features run on Supabase.
- Run the full test suite, then a final signed-out and signed-in check on desktop and phone.
- Publish.

## Technical details
- Live updates use Supabase Realtime: subscribe inside `useEffect`, call `removeChannel` on cleanup, and enable the publication plus `REPLICA IDENTITY` on `posts`, `post_votes`, `post_comments`, `group_messages`, `direct_messages`, `notifications`, `user_connections`, and `news`.
- News ingest: a `fetch-news` edge function run hourly by `pg_cron` and `pg_net`. Add a `source_url` column with a unique index to prevent duplicates, and a `source` column. The service role writes the rows; the public can only read published rows.
- Admin roles: an `app_role` enum, a `user_roles` table, and a `has_role()` security-definer function, following the project's RLS helper rule.
- Rate limits: database triggers that count a user's recent rows per table.
- Delete the `server/` directory and the `socket-service`/`useSocket` code once no code uses them.
- Every new table gets grants, RLS, and policies in the same migration.
