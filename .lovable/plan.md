# The Night Club — Phased Roadmap

Goal: evolve The Night Club into a polished **GitHub × LinkedIn × Realtime Collab** platform for developers — code hosting, professional identity/networking, and live multiplayer coding — all under the existing fluid-glass aesthetic.

The screenshots you shared are the current baseline (Home, Auth, Portfolio dashboard, Settings). The plan below treats those as Phase 0 (done) and layers new capability on top in shippable phases.

---

## Phase 0 — Baseline (already in place)
- Auth (email/password, reset, username setup)
- Portfolio dashboard, Projects, Editor, Collaboration room
- Community (Reddit-style posts), Connections, News, Notifications
- Fluid-glass theme, ambient 3D background, page transitions

Carry-over polish (small, done in Phase 1 alongside other work):
- Consistent glass nav across all pages
- Empty-state illustrations on dashboard/portfolio
- Mobile nav parity

---

## Phase 1 — Identity & Profile (the "LinkedIn" core)
Make every user a first-class developer profile that others want to visit.

- Rich public profile at `/@username`: avatar, banner, headline, bio, location, availability ("Open to work / collab / hire"), social links (GitHub, X, LinkedIn, website)
- Skills & tech stack tags (with endorsements from connections)
- Experience timeline (roles, education, certifications)
- Pinned projects / repositories (up to 6, drag to reorder)
- Contribution heatmap (commits + posts + collab sessions)
- Profile completeness meter on dashboard
- Public/private profile toggle, SEO meta per profile

Deliverable: a shareable dev profile that stands on its own.

---

## Phase 2 — Repositories & Code Hosting (the "GitHub" core)
Turn Projects into real repositories.

- Repository pages: README render, file tree, file viewer with syntax highlighting, language breakdown bar
- Commits, branches (lightweight), tags/releases
- Stars, forks, watchers
- Issues (labels, assignees, milestones, comments)
- Pull-request-style "Change Requests" between collaborators
- Repo settings: visibility, collaborators, default branch, topics
- Activity feed per repo

Deliverable: users can host, browse, and discuss code — not just link to it.

---

## Phase 3 — Real-time Collaboration v2 (the "Replit/VS Code Live Share" core)
Build on the existing collab room with reliability + depth.

- Rock-solid CRDT/OT sync (Yjs) replacing current debounced updates
- Live cursors, selections, follow-mode (jump to a teammate's viewport)
- Multi-file project workspace inside a room (not just one buffer)
- Integrated terminal (sandboxed exec, already partially wired) + shared output
- Voice/video huddle (WebRTC via Supabase Realtime signaling) — optional toggle
- Inline comments and review threads on code lines
- Room recording / session replay (text-only diff timeline)
- Persistent room → exportable as a repository

Deliverable: a room is a real coding environment, not a shared textarea.

---

## Phase 4 — Social Graph & Feed
Tie identity + code + collab together socially.

- Follow / connect (already partially done) — unify into one graph with "Follow" (one-way) and "Connect" (mutual)
- Home feed: posts, new repos from followed users, releases, stars, achievements
- Mentions (`@user`, `#repo`), rich link previews
- DMs upgraded: threads, file/code-snippet sharing, presence
- Endorsements & recommendations (LinkedIn-style)

---

## Phase 5 — Communities & Discovery
Scale the existing Reddit-style groups.

- Community pages with banner, rules, mods, flairs (already started — polish + moderation queue)
- Topic/tag pages aggregating repos + posts + people
- Trending: repos this week, rising devs, hot discussions
- Global search v2: people / repos / posts / snippets / rooms with filters
- Job/Gig board (lightweight) tied to "Open to work"

---

## Phase 6 — Monetization & Pro
- Pro tier: private repos beyond N, larger rooms, longer recordings, profile analytics
- Team workspaces with shared billing
- Tip / sponsor a developer (Stripe Connect)
- Existing Vibe-Code AI credits integrated into Pro

---

## Phase 7 — Polish, Performance, Trust
- Lighthouse pass, code-splitting audit, image optimization
- Accessibility audit (focus states, ARIA, keyboard for editor & rooms)
- Security: rate limits on edge functions, RLS audit, abuse reporting, block/mute
- Observability: error boundary telemetry, slow-query review
- Onboarding tour refresh covering all five pillars

---

## Suggested build order
Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5 → Phase 6 → Phase 7.
Phase 1 unlocks the most visible user value fastest and gives every later phase a profile to anchor to.

## Questions before we start Phase 1
1. Which phase do you want to start with? (default: Phase 1)
2. For repositories (Phase 2), do you want **real Git semantics** (branches/PRs, heavier build) or a **lightweight file-versioning model** (simpler, ships faster)?
3. For collab rooms (Phase 3), is **voice/video** in-scope or text+code only for now?
4. Any pillars you want to **drop** (e.g., skip job board, skip monetization)?
