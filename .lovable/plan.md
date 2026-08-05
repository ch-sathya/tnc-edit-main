# Product Scope — Collaborative Development Platform

The Night Club is a lightweight collaborative coding and professional portfolio platform. It does **not** host or manage repositories and does not reproduce GitHub features such as repository creation, stars, forks, issues, pull requests, or repository administration.

## Core Workflow

1. A user securely connects a supported Git provider.
2. The user imports an existing repository by URL and chooses a branch.
3. The platform creates a temporary collaborative workspace containing the imported files.
4. Teammates edit together with realtime text sync, presence, cursors, chat, file awareness, and execution tools.
5. An authorized user reviews the changed-file summary, writes a commit message, and pushes changes back to the original repository.
6. The original Git provider remains the source of truth. The platform stores only workspace state and recovery snapshots required for collaboration.

## Phase 1 — Product Simplification & UX Foundation

- Remove repository-hosting language, metrics, navigation, pinned repositories, and repository-management roadmap items.
- Reframe Projects as portfolio case studies only; source links remain outbound references.
- Make Collaboration the primary navigation action and home-page value proposition.
- Redesign the authenticated portfolio as an editorial profile control center: identity preview, completion, featured work, collaboration activity, network, and clear editing/sharing actions.
- Apply the selected Charcoal & Ember palette, Space Grotesk/DM Sans typography, and consistent compact glass surfaces across core screens.
- Fix hero content visibility and reduce ornamental motion that delays or obscures content.

## Phase 2 — Repository Import

- Add secure Git-provider OAuth; never expose or persist provider tokens in browser storage.
- Accept canonical HTTPS repository links, validate provider/owner/name, and reject malformed or unsupported URLs.
- Let users select an accessible branch and import the file tree into a collaboration room.
- Record source provider, owner, repository, branch, and base commit on the room—not as a hosted repository record.
- Handle private repositories, large files, binary files, rate limits, deleted branches, and permission failures explicitly.

## Phase 3 — Realtime Collaboration Reliability

- Use Yjs CRDT with Monaco for conflict-safe multi-user editing.
- Broadcast active file, cursor selection, display name, and online/away/offline state through awareness.
- Keep room messages, members, files, and presence current without refresh.
- Persist periodic file snapshots for recovery while the imported provider remains the source of truth.
- Add reconnect state, unsynced-change indicators, collaborator permissions, and session recovery.

## Phase 4 — Review & Push Back

- Compare workspace files against the imported base commit and show added, modified, deleted, and renamed files.
- Provide a reviewable diff, commit message, target branch, and push authorization check.
- Push through a secure server-side provider integration using the connected user's permissions.
- Detect remote divergence before push and require refresh/rebase or a new branch instead of overwriting upstream work.
- Record push status and provider commit URL in room activity; do not create an internal commit-hosting system.

## Phase 5 — Team Workflow

- Add room roles, invitations, focused review comments, mentions, and actionable notifications.
- Add shareable session summaries and clear ownership/permission controls.
- Keep community and professional networking features secondary to collaboration.

## Phase 6 — Final Quality

- Accessibility, responsive layouts, keyboard navigation, loading/error/empty states, and contrast review.
- Performance and reliability testing for Home, Portfolio, Collaborate, and Collaboration Room.
- Security scan focused on OAuth tokens, repository permissions, workspace RLS, and edge-function authorization.
- End-to-end verification: connect provider → import link → collaborate → review diff → push upstream.

## Non-Goals

- Repository hosting, discovery, stars, forks, issues, pull requests, releases, package registries, or repository administration.
- Storing Git credentials in `localStorage`, application tables, client bundles, or logs.
- Treating the platform database as the canonical Git history.

## Verification per Phase

- `tsgo` and focused tests clean.
- Playwright coverage for every changed critical flow at desktop and mobile widths.
- Zero relevant console and network errors on touched routes.
- Every schema change includes grants, RLS, and server-side authorization.
