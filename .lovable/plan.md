# Full Project Completion — Phased Plan

"Everything" is too big for one migration+edit pass, so I'll ship it as sequenced sub-plans. Each phase ends in a working, verifiable state before the next starts. I'll re-issue the next phase as its own `plan--create` when the previous one is approved.

## Phase A — Stabilization & Bug Audit (this plan)

Goal: zero runtime errors, all core flows verified end-to-end before adding scope.

1. **Runtime audit**
   - Read console + network logs on Home, Auth, Portfolio, UserProfile, Community, CollaborationRoom, Settings.
   - Drive Playwright through: sign-in → /portfolio, share link (anon view), create community post + comment + vote, create room + join via code + edit file with 2 tabs (verify realtime cursors/messages/participants without refresh).
   - Log every failure with file:line.

2. **Fix categories** (each fixed at the category level, not the instance):
   - Auth/redirect edge cases (session refresh, `/setup-username` skip persistence).
   - Realtime subscription leaks / missing cleanup in collab room, chat, presence.
   - Broken empty states (profile-not-found, no-posts, no-rooms).
   - Mobile layout breakage on Community, Portfolio, CollaborationRoom.
   - Loading flicker (skeletons for Portfolio, UserProfile, Community feed).

3. **Verification**
   - `tsgo` clean, build clean, Playwright screenshots for each flow saved under `/tmp/browser/`.

## Phase B — Public Profile & Sharing polish

- SEO: per-profile `<title>` / `<meta description>` / OG tags via react-helmet-async on `/@:username`.
- JSON-LD `Person` schema on public profiles.
- Copy-link toast + QR modal for share button.
- Ensure fully anon-viewable (RLS already public where `is_public=true`); add "Sign in to connect" CTA consistency.

## Phase C — Repositories v2 (GitHub-like)

- Schema: `repository_branches`, `repository_issues`, `issue_comments`, `repository_readme` (or use existing `repository_files` for `README.md`).
- UI: repo detail page with tabs Code / Issues / Stars / Activity, file tree, README render (react-markdown + rehype-highlight), issue create/comment.
- Pinned repos already exist — wire to real repo pages.

## Phase D — Collaboration v2 (Yjs CRDT)

- Add `yjs` + `y-monaco` + `y-supabase` (or custom Supabase awareness provider) for real CRDT sync instead of debounced overwrites.
- Multi-cursor with user color from presence.
- Terminal: keep `execute-code` edge fn; add stdin already noted in memory.

## Phase E — Social Feed & Notifications

- Home feed (following + joined groups) with infinite scroll.
- Notification center: mark-as-read, filter tabs, realtime badge.

## Phase F — Final polish & publish

- Accessibility pass (focus rings, aria-labels, keyboard nav).
- Lighthouse ≥ 90 on Home, Portfolio, UserProfile.
- Re-run security scan, resolve any new findings.
- Publish to `the-night-club.lovable.app`.

## What happens next

On approval I start **Phase A only**: run the audit, fix what I find, verify with Playwright, and report back. When Phase A is green I'll issue Phase B as a fresh plan for approval. This keeps each change reviewable instead of dumping a 20-file mega-diff.

## Technical notes

- No new deps in Phase A. Phases C–E add: `react-markdown`, `rehype-highlight`, `react-helmet-async`, `yjs`, `y-monaco`.
- All schema changes go through `supabase--migration` with GRANTs + RLS in the same migration.
- Realtime tables already have `REPLICA IDENTITY FULL` from previous work — new tables in Phase C/E will get the same treatment.
