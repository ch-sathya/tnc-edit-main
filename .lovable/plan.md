# Bugs + Chrome Polish — LinkedIn/Glassdoor Hybrid

Scope: fix routing, page titles, kill janky animations, and make group/community creation work properly. Keep dark ambient theme (subtle), but tighten chrome to feel professional. No page-content redesigns this round.

## 1. Routing & dead links

- Audit every `navigate(...)` and `<Link>` target against the route table in `src/App.tsx`. Replace broken/missing destinations with valid routes or remove the link.
- Add explicit redirects where users land wrong:
  - `/profile` → `/portfolio`
  - `/groups`, `/groups/:id` → `/community`
  - `/messages` → `/connections`
- Add a real `NotFound` page with a "Back to Home" CTA and a search suggestion (already exists — wire it to log unknown paths so we can spot more).
- Fix `ProfileDropdown`, `MobileNav`, `Footer`, and `Navigation` so every link resolves. Remove links to pages that don't exist yet (e.g. "Help", "Docs" if not implemented).
- Editor/Collab back-buttons: ensure `/editor/:projectId` and `/collaborate/:roomId` always have a working back nav, even if `history.length === 1` (fallback to `/portfolio` or `/collaborate`).

## 2. Page titles & SEO meta

- Install `react-helmet-async`, wrap `<App />` in `<HelmetProvider>` once in `src/main.tsx`.
- Remove `<link rel="canonical">` and the verbose `<title>` from `index.html`; keep only sitewide defaults.
- Add a tiny `<PageHead title description path />` wrapper component and drop it into every route component:
  - Home, Portfolio, Projects, Project detail, Editor, Collaborate, Collaboration room, Community, Connections, News, News article, Auth, Settings, Notifications, Pricing, VibeCode, UserProfile, JoinRoom, SharedSnippet, UsernameSetup, NotFound.
- Each title follows: `{Page} — The Night Club` (<60 chars). Descriptions <160 chars.

## 3. Animations — kill the noise

- Remove global `SmoothCursor` (custom cursor feels gimmicky and hurts perf).
- Remove blur+y route transition in `App.tsx`; replace with a 150ms opacity-only fade.
- `TopLoadingBar`: keep, but only show after 200ms delay so instant routes don't flash it.
- Ambient: default `intensity` to `subtle`, default `enable3D` to `false`. Users can opt-in via the theme switcher (already built).
- Trim per-page entrance animations: keep `ScrollReveal` only on Home hero sections; remove from list/feed items where it causes stagger jank.
- Navigation: drop the spring layoutId underline and `whileHover scale` on the brand title — replace with a static underline on active route.
- Remove the parallax/float on cards that lag on scroll (audit `Home.tsx`, `Portfolio.tsx`).

## 4. Community: group/post creation flow

- Audit `CreateGroupModal` + `CreatePostModal` so:
  - Required fields validated (name, slug, description) before submit.
  - Slug auto-derived from name with collision check.
  - Group create returns the new group and routes to `/community?group=<slug>` (or whatever the page expects).
  - Post create requires a selected group; show an inline group picker if none selected.
- Fix `Community.tsx` empty/loading/error states so users see a clear "Create your first group" CTA when the list is empty (instead of a blank panel).
- Ensure `GroupSidebar` highlights the active group and persists selection across reloads via URL param (not localStorage).
- Verify RLS via `is_group_member` helper still allows group owners to insert posts; no schema changes planned unless we find a missing policy during QA.

## 5. Collab room residual bugs

- Active/inactive presence: confirm `usePresenceManager` heartbeat fires every 30s and stale users (>3m no heartbeat) flip to `away`, >10m to `offline`. Fix any timer leak on unmount.
- File explorer: ensure newly created files appear without refresh (subscribe to inserts on `room_files`).
- Chat input: prevent send-on-Enter from also inserting a newline.
- Room not-found: redirect to `/collaborate` with a toast instead of blank screen.

## 6. Chrome polish (LinkedIn/Glassdoor cues)

- Tighten `Navigation`: reduce height to 56px, use a denser nav row, add a divider under nav.
- Standardize page container: `max-w-6xl mx-auto px-4 md:px-6 py-8` wrapper component used by every page (kills inconsistent paddings).
- Card density: reduce default card padding, use subtle borders (`border-border/60`) instead of heavy glass on list items.
- Buttons: use `size="sm"` defaults in lists; reserve `lg` for hero CTAs.
- Typography: ensure h1=text-3xl, h2=text-xl, body=text-sm leading-relaxed (LinkedIn-like density). Do not change the font family.

## Out of scope

- Page redesigns (Home/Portfolio/Community layout rewrites).
- New features (job board, endorsements, etc.).
- Backend schema changes beyond fixing missing RLS if found.
- Replacing the 3D library or removing ambient theme system entirely.

## Technical notes

- New files: `src/components/PageHead.tsx`, `src/components/layout/PageContainer.tsx`.
- Edited: `src/main.tsx`, `src/App.tsx`, `src/index.html`, all `src/pages/*.tsx` (Helmet + container), `src/components/Navigation.tsx`, `src/components/Footer.tsx`, `src/components/MobileNav.tsx`, `src/components/ProfileDropdown.tsx`, `src/components/animations/FluidBackground.tsx` (drop SmoothCursor export usage), `src/contexts/AmbientThemeContext.tsx` (defaults), `src/components/community/CreateGroupModal*`, `CreatePostModal.tsx`, `src/pages/Community.tsx`, `src/pages/CollaborationRoom.tsx`, `src/hooks/usePresenceManager.ts`.
- Dependency: `react-helmet-async`.
- QA checklist: click every nav item, every footer link, every profile-menu item; reload each route directly; create a group; create a post in that group; join a collab room; verify titles on 5+ routes in browser tab.
