# Plan: Performance, Ambient Scene Tuning, and Theme Controls

## Goals
1. Make the site feel less empty and noticeably faster.
2. Tone down the desktop 3D scene so it stays in the background.
3. Add UI controls to switch ambient themes / orb intensity, persisted across pages.
4. Fix functional regressions surfaced by recent overhauls (auth refresh error, dialog a11y warnings, route loading flashes).

## What changes

### 1. Ambient background — perf + subtlety
- Reduce `FloatingScene` cost: drop particle count (80 → 30), remove one ring + one torus, lower `dpr` cap to `[1, 1.25]`, switch `Environment preset` to a cheaper lighting setup (single ambient + 2 directional, no HDR), and gate the canvas behind `prefers-reduced-motion` + `matchMedia('(min-width: 1280px)')` (was `lg`).
- Lower default opacity of the 3D layer from `opacity-40` to `opacity-20` and add a soft mask so it fades near content.
- Pause the canvas when the tab is hidden (`frameloop="demand"` + visibility listener) to stop background CPU/GPU use.
- Orbs: reduce from 3 large blobs to 2, slightly smaller, with lower opacity by default.

### 2. Ambient Theme Controls (new)
- New `AmbientThemeProvider` (Context + `localStorage` for UI preference only — not user data) exposing:
  - `theme`: `aurora | mono | warm | minimal`
  - `intensity`: `off | subtle | normal | vivid` (controls orb opacity, 3D opacity, particle count)
- New `AmbientThemeSwitcher` component: a small floating glass control (bottom-right) with a popover containing theme swatches + intensity slider + "Disable 3D" toggle.
- `AmbientBackground` consumes the context and renders accordingly. `intensity: off` skips the 3D canvas entirely.

### 3. "Empty" feel on Home
- Add 2 lightweight content bands to Home (only if missing): a "Live activity" strip (recent public projects/posts via existing hooks) and a "Featured collaborators" rail. Both use existing `GlassPanel` + `ScrollReveal`. No new business logic.
- Tighten vertical rhythm so above-the-fold has a clear focal point (headline + CTA + 3D peek) instead of large empty gutters.

### 4. Performance fixes (cross-cutting)
- Add `React.lazy` for heavy routes already imported eagerly in `App.tsx` (CollaborationRoom, Editor, VibeCode, Community, ProjectDetail, News). Keep `Suspense` fallback.
- Memoize Navigation items and avoid re-rendering on every route change.
- Reduce `SmoothCursor` cost: skip on `prefers-reduced-motion`, throttle mousemove via `requestAnimationFrame`.
- `TopLoadingBar`: replace 50ms interval ticking with a single CSS transition driven by route changes.

### 5. Functional fixes
- `useAuth`: swallow `refresh_token_not_found` gracefully (sign out silently, no console error).
- Add `DialogDescription` (or `aria-describedby={undefined}` explicit) to dialogs missing it — current warnings come from CreatePostModal / GroupSettingsModal / etc. Add the description prop where missing.
- Verify Portfolio + UsernameSetup redirect logic still behaves after the recent transparent-bg changes (no regressions expected; just smoke-test).

## Files

- New: `src/contexts/AmbientThemeContext.tsx`, `src/components/AmbientThemeSwitcher.tsx`
- Edit: `src/components/animations/AmbientBackground.tsx`, `src/components/three/FloatingScene.tsx`, `src/components/animations/FluidBackground.tsx` (SmoothCursor), `src/App.tsx` (provider + lazy routes + switcher mount), `src/components/TopLoadingBar.tsx`, `src/hooks/useAuth.tsx`, `src/pages/Home.tsx`, a few Dialog components for a11y.

## Out of scope
- Backend/schema changes.
- Redesign of individual feature pages beyond Home rhythm tweaks.
- Replacing the 3D library.

## Technical notes
- `frameloop="demand"` + `invalidate()` on resize/theme-change keeps the canvas idle most of the time.
- Theme preference is UI-only state, so `localStorage` is acceptable (per project rule, only *user data* must hit Supabase).
- Lazy-loaded routes keep initial JS smaller; the homepage no longer ships Monaco/three-heavy code on first paint.
