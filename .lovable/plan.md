# Complete the Project — Phases B–F

Phase A (stabilization) is done. This plan finishes everything else in sequenced, verifiable phases. Each phase ends in a working state before the next begins.

## Phase B — Public Profile & Sharing Polish

- Install `react-helmet-async`; wrap app in `HelmetProvider` in `src/main.tsx`.
- Add per-route `<Helmet>` to `UserProfile` (`/@:username`): title, description, canonical, `og:*`, `twitter:*` derived from profile.
- Add JSON-LD `Person` schema on public profiles (name, headline, url, image, sameAs from social links).
- Replace the plain toast on Share with a modal: copy link, QR code (via `qrcode.react`), and native share fallback. Same modal reused in `Portfolio` and `UserProfile`.
- Consistent "Sign in to connect" CTAs for anonymous viewers on profile/community/project pages.
- Update sitewide `index.html` head defaults (title/description/OG) to real brand copy.

## Phase C — Repositories v2 (GitHub-like)

- Migration: extend existing `repositories` and `repository_files`; add `repository_issues`, `issue_comments`. GRANTs + RLS + `REPLICA IDENTITY FULL` in the same migration.
- New page `/repo/:owner/:name` with tabs: **Code**, **Issues**, **Stars**, **Activity**.
- Code tab: file tree from `repository_files`, README auto-render via `react-markdown` + `rehype-highlight` + `remark-gfm`.
- Issues tab: create/list/detail with threaded `issue_comments`, open/closed status, realtime updates.
- Wire pinned repositories on profile to these real repo pages.
- Star button uses existing `repository_stars` + trigger.

## Phase D — Collaboration v2 (Yjs CRDT)

- Add `yjs`, `y-monaco`, and a Supabase awareness/persistence provider (custom thin wrapper over broadcast + `collaboration_files.content` snapshot).
- Replace debounced overwrite sync in `CollaborationRoom` with Yjs doc bound to Monaco; keep DB snapshot every N seconds for persistence.
- Multi-cursor colors from presence; keep existing `useRealtimeCursors` styling but drive from Yjs awareness.
- Keep `execute-code` edge function and stdin support unchanged.
- Preserve room chat, participants, and file list realtime behavior verified in Phase A.

## Phase E — Social Feed & Notifications

- Home feed: posts from followed users + joined groups, infinite scroll (react-query `useInfiniteQuery`), skeletons.
- Notification center page already exists — add: mark-as-read, mark-all-read, filter tabs (mentions/follows/votes/messages), realtime badge count in `NotificationBell`.
- Ensure DB triggers write notifications on: new follower, post upvote milestone, comment reply, DM, group invite.

## Phase F — Final Polish & Publish

- Accessibility: focus rings, aria-labels on icon buttons, keyboard nav on modals, color-contrast pass.
- Loading skeletons everywhere still using spinners (Portfolio, UserProfile, Community, Repo pages).
- Mobile responsiveness sweep: Community, CollaborationRoom, Repo pages.
- Lighthouse target ≥ 90 on Home, Portfolio, UserProfile.
- Re-run security scan; resolve new findings.
- Publish to `the-night-club.lovable.app`.

## Verification per Phase

- `tsgo` + build clean.
- Playwright script per phase under `/tmp/browser/phase-<x>/` capturing screenshots of the new/changed flows.
- Manual signals: console + network snapshot showing zero errors on the touched routes.

## Technical Notes

- New deps: `react-helmet-async`, `qrcode.react`, `react-markdown`, `rehype-highlight`, `remark-gfm`, `yjs`, `y-monaco`.
- All schema changes via `supabase--migration` with GRANTs, RLS, and `REPLICA IDENTITY FULL` in the same migration.
- No changes to auth flow, existing RLS helper functions, or the black/white glass aesthetic.
- Phases ship sequentially; each is independently revertible.

## What Happens Next

On approval I start **Phase B** immediately, verify, and report back. Phases C–F follow in order without re-approval unless a phase requires a scope decision (e.g., Yjs provider choice) — I'll ask then.
