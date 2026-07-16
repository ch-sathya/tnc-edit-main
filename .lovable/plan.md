
# Plan: Theme Refinement, Public Profiles & Error Sweep

## 1. Rework the 3D / ambient layer (B&W glassmorphism)

The current `FloatingScene` (spheres + torus + wobble/distort + `night` environment) reads as generic and colored. Replace it with a restrained, monochrome, glass-forward scene aligned with fluid.glass / claygarden references.

- `src/components/three/FloatingScene.tsx`
  - Remove `MeshDistortMaterial` / `MeshWobbleMaterial` and the `night` env preset.
  - Use `MeshPhysicalMaterial` with `transmission: 1`, `thickness: 1.2`, `roughness: 0.15`, `ior: 1.4`, `clearcoat: 1`, pure white/greyscale tints only.
  - Replace icosahedrons/torus with 3–4 large, slow-drifting rounded glass shapes (rounded box + sphere) + a thin wireframe ring. Fewer objects, bigger, slower.
  - Lighting: soft ambient + one key directional + one rim light, all white. Use `Environment preset="studio"` (greyscale) instead of `night`.
  - Drop the particle field (adds noise, feels dated).
  - Cap DPR at `[1, 1.25]`, add `frameloop="demand"` fallback for reduced-motion.
- `src/components/animations/AmbientBackground.tsx`
  - Lower 3D layer opacity further (`opacity-25`) and gate behind `prefers-reduced-motion`.
  - Keep grid + gradient orbs but ensure orbs use only `--foreground` (already the case).

## 2. Public profile viewing (no login required)

Goal: anyone with a link like `/@username` or `/user/:userId` can view a public profile. Login is only required to create/edit/interact.

- **Data access (Supabase RLS)** — new migration:
  - `profiles`: allow anonymous `SELECT` **only when `is_public = true`**. Keep existing authenticated policies for self-update.
  - `user_experience`, `pinned_repositories`, `skill_endorsements`, `repositories` (public ones), `projects` (public ones): add `SELECT` policy for `anon` scoped to rows whose owning profile `is_public = true` (or row-level `visibility = 'public'` where applicable).
  - Add `GRANT SELECT ... TO anon` for each of those tables.
  - Default new profiles to `is_public = true` (already the case) so existing users are viewable.

- **Routing / auth gating**:
  - `src/App.tsx` — `/@:username` and `/user/:userId` remain public routes (already are). No change needed to route table.
  - `src/pages/UserProfile.tsx` and `src/pages/Portfolio.tsx` (when rendering `/@username`):
    - Do NOT redirect unauthenticated users. Load profile via anon Supabase client.
    - If profile `is_public === false` AND viewer is not the owner → show existing "Private Profile" locked card (with "Sign in" CTA only if it might help — otherwise just "This profile is private").
    - Hide owner-only affordances (Edit, Settings, Follow button becomes "Sign in to follow") for anon viewers.
  - Any action buttons (Follow, Endorse, Message, Star, Fork) for anon users → open `/auth?redirect=<current>` instead of failing silently.

- **Navigation for anon**:
  - `Navigation.tsx` already tolerates `!user`. Ensure profile links, share buttons, and OG meta work when signed out.
  - Add `<meta>` og:title / og:description on `UserProfile` using the loaded profile (helps link sharing).

## 3. Error sweep

Fix issues likely surfaced during Phase 1 rollout and theme rework:

- **Types**: after the new migration, regenerated `types.ts` will include new anon-readable policies. Ensure `useProfile`, `UserProfile.tsx`, and Portfolio queries don't assume `user` is present.
- **Console/runtime**:
  - Guard all `supabase.auth.getUser()` usages that currently throw when null on public pages.
  - `ProfileCompleteness`, `EndorsableSkills`, `PinnedRepositories` — render read-only variants when `viewer !== owner` or `!user`.
  - Ensure `NotificationBell` and other user-gated components don't mount for anon.
- **404 / not found**: If a username doesn't exist, show a clean "Profile not found" state instead of an error toast loop.
- **Realtime**: don't subscribe to presence channels on anon profile views.

## 4. Out of scope (explicitly)

- No changes to Phase 2 (repos), collab room internals, monetization, or job board.
- No new pages.

## Technical notes

- RLS policy pattern for anon read:
  ```sql
  CREATE POLICY "Public profiles are viewable by anyone"
    ON public.profiles FOR SELECT
    TO anon, authenticated
    USING (is_public = true OR auth.uid() = id);
  GRANT SELECT ON public.profiles TO anon;
  ```
  Repeat for child tables joining on `profiles.is_public`.
- Reduced-motion 3D:
  ```tsx
  const reduced = useReducedMotion();
  if (reduced) return null;
  ```
- Glass material tokens live in `index.css` (`--glass-bg`, `--glass-border`, `--shadow-glass`) — reuse, don't hardcode.

## Deliverables

1. Rewritten `FloatingScene.tsx` + tuned `AmbientBackground.tsx`.
2. One Supabase migration opening anon SELECT on public profile data.
3. `UserProfile.tsx` / `Portfolio.tsx` updates for anon-safe rendering + auth-gated CTAs.
4. Small guards across profile subcomponents and hooks.
