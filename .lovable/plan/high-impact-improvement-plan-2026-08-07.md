# High-Impact Improvement Plan

## Goal

Make the current product trustworthy, reliable, and internally consistent before expanding it: secure unsafe execution paths, stabilize collaborative editing, align visible promises with working features, and remove navigation/UX regressions.

## Phase 1 — Security and Product Safety

- Replace the current unauthenticated `execute-code` path. The Edge Function currently has JWT verification disabled and evaluates submitted JavaScript inside the function process; a Promise timeout cannot stop synchronous infinite loops. Require a valid user, enforce request/body/output limits and rate limits, and route execution through a genuinely isolated runtime—or disable Run until that runtime exists.
- Re-run the Supabase linter after the previous hardening. It currently still reports GraphQL exposure warnings, long OTP expiry, leaked-password protection disabled, and an available Postgres security upgrade. Verify the effective grants before changing them so public portfolio reads remain available while private tables stay undiscoverable.
- Add focused authorization tests for room access, invitations, file mutation, profile visibility, and code execution.

## Phase 2 — Collaboration Reliability

- Replace the current debounced whole-file last-write-wins updates with a conflict-safe document model (Yjs/CRDT with Monaco awareness), while keeping Supabase for authenticated room access, snapshots, chat, and durable metadata.
- Unify presence, cursor, active-file, selection, typing, and reconnect state into one awareness channel. Remove or archive the parallel Socket.IO presence implementation that points to a non-persistent localhost server and is separate from the active Supabase room flow.
- Add explicit sync states: connecting, synced, unsaved, reconnecting, conflicted, and failed. Preserve local edits during disconnects and replay/reconcile them after reconnection.
- Fix subscription and activity lifecycle details: stable presence keys, named visibility-change cleanup, channel error handling, cursor throttling, stale-awareness cleanup, and per-file typing state.
- Make room creation/join/delete atomic through database functions or cascade-backed operations instead of multi-request client sequences; enforce capacity, privacy, ownership, and invite consumption server-side.
- Add two-browser end-to-end tests for concurrent edits, cursor visibility, presence transitions, chat, member joins/leaves, file creation/deletion, reconnect recovery, and permission denial.

## Phase 3 — Honest Git Import Workflow

- Stop presenting repository import and push-back as available while “Connect Git provider” is disabled and no provider flow exists. Until implementation is complete, label these as upcoming and keep the primary action “Blank workspace.”
- Implement provider OAuth server-side, canonical repository URL validation, branch selection, import limits, binary/large-file handling, and temporary workspace snapshots without storing provider tokens in the browser or database.
- Add changed-file review, upstream divergence detection, commit message validation, target-branch confirmation, and authorized push-back through a server-side provider integration.
- Remove legacy repository-hosting surfaces and internal repository-management concepts from routes, navigation, portfolio metrics, and public profiles. Keep source links as outbound references attached to portfolio case studies.

## Phase 4 — Routing and Information Architecture

- Make `/portfolio` the authenticated portfolio control center and redirect `/dashboard` to it rather than rendering a duplicate route.
- Keep `/in/:username/` as the only public profile route. Remove legacy `/@:username`, `/user/:userId`, and broad `/:handle` rendering after adding canonical redirects where needed; ensure mistyped top-level paths go directly to the real 404 page.
- Consolidate desktop and mobile navigation into one route configuration and clarify labels: “My Portfolio” for the private control center and “Preview Public Profile” as a visible action.
- Remove dead footer links and generic social-domain links; render only real destinations. Keep the footer restricted to Home as required.

## Phase 5 — Core UX and Maintainability

- Split oversized pages into focused modules, beginning with `CollaborationRoom`, `UserProfile`, `Portfolio`, and `Collaborate`; replace unsafe `any` casts with generated Supabase and domain types.
- Replace native `confirm()` deletion with the existing confirmation dialog, and add persistent inline error/retry states instead of toast-only failures.
- Make profile uploads robust: validate type/size/dimensions, clean up replaced images, distinguish upload failure from “remove image,” and reset form state when a different profile or newly refreshed data opens.
- Use semantic design tokens throughout the IDE/chat instead of hardcoded colors, add labels to icon-only controls, and respect reduced motion in route transitions and cursor animation.
- Lazy-load route pages and Monaco, avoid N+1 room-list profile/count queries, and add pagination where lists can exceed Supabase’s default row limit.

## Phase 6 — Verification and Release Gate

- Add regression tests for canonical profile URLs, public/private profile access, auth redirects, profile editing/uploads, community voting/moderation, and portfolio deletion/retry states.
- Validate desktop and mobile layouts with Playwright, including keyboard-only navigation and reduced-motion mode.
- Require clean focused tests, type checks, dependency scan, Supabase linter review, and zero relevant console/network errors on Home, My Portfolio, public profiles, Community, Collaborate, and Collaboration Room.
- Final end-to-end acceptance path: sign in → create/import workspace → invite teammate → edit concurrently → reconnect → review changes → push upstream; plus signed-out `/in/username/` access.

## Technical Notes

- Database changes will use migrations with explicit grants, RLS, and server-derived ownership.
- Dashboard-only security settings (OTP expiry, leaked-password protection, Postgres upgrade) will be documented and verified separately from code changes.
- Public profile availability must be preserved while tightening GraphQL/table grants.
- No repository hosting, Git credential persistence, or client-side service-role access will be introduced.
