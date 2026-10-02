# Plan: Stabilize and Refine The Night Club

## Goal
Repair the visible broken flows, simplify the product around collaborative coding and professional portfolios, and deliver a polished monochrome glass experience without advertising unavailable functionality.

## Phase 1 — Product cleanup and navigation
- Remove Vibe Code from desktop/mobile navigation, routing, footer, pricing copy, and user-facing calls to action.
- Remove its unused page and AI chat integration only after confirming no remaining feature depends on them; retain shared subscription data where Pricing still uses it.
- Keep the Projects/Showcase area, but define GitHub support honestly as **link only**: users can attach a validated GitHub repository or folder URL to a project and open it externally. No import, sync, commit, or push claims.
- Replace inaccurate repository import/push metadata and marketing copy across the home page, project forms, metadata, and empty states.

## Phase 2 — Broken-flow audit and repairs
- Exercise signed-out and signed-in primary flows: home, authentication, portfolio editing/sharing, projects, collaboration rooms, community groups, settings, and public portfolio links.
- Fix confirmed runtime, loading, navigation, empty-state, and mobile layout failures found during those checks.
- Preserve the strict public profile format `/in/username/` and verify it without authentication.

## Phase 3 — Monochrome glass design refinement
- Consolidate the visual system around black, white, neutral glass surfaces, restrained warm highlights, and varied morphism treatments such as frosted panels, soft refraction, and layered translucent controls.
- Improve page transitions and section entrances with purposeful motion; repair exit transitions and honor reduced-motion preferences.
- Reduce expensive always-running effects on editor/collaboration screens and remove duplicate or unused animation code.
- Refine public profiles and the owner portfolio for clearer hierarchy, mobile section ordering, readable empty states, and consistent professional presentation.
- Fix navigation accessibility, keyboard behavior, labels, and responsive control sizing.

## Phase 4 — GitHub-linked projects
- Validate and normalize GitHub repository/folder URLs when users create or edit a project.
- Clearly label the field as an external source link and display the linked repository/folder consistently on project cards, details, owner portfolio, and public profile.
- Do not add OAuth, repository importing, file synchronization, or push-back behavior in this phase.

## Phase 5 — Community hybrid model
- Keep Reddit-style communities, post feeds, voting, threaded comments, flair, pinning, locking, rules, and sorting.
- Keep member-only realtime group chat with replies/reactions where supported, giving each group a clear Posts/Chat switch.
- Wire owner, admin, moderator, and member roles consistently into visible controls and server-enforced permissions.
- Refine group settings for member management, role changes, rules, privacy, ownership transfer, and destructive actions.
- Add clear mobile controls for joining/leaving, members, chat, and settings; verify realtime updates and cleanup of subscriptions.

## Phase 6 — Quick user guide
- Replace the fragile screen-positioned tour with a reliable guided checklist/help panel tied to elements that actually exist.
- Cover profile setup, adding work, linking GitHub, starting/joining collaboration, and using community posts/chat.
- Persist completion in Supabase rather than browser storage, and provide a visible “Restart guide” control in Settings.

## Phase 7 — Profile education
- Use the existing `user_experience` model, which already supports `work`, `education`, and `certification` entries.
- Improve the editor labels and validation for education-specific details, and present Education as its own professional section on public profiles instead of combining it ambiguously with work history.
- Add helpful owner-only empty states and verify create, edit, and delete behavior.

## Phase 8 — Brand and legal pages
- Derive a lightweight custom favicon from the existing favicon/brand asset, wire it explicitly, and remove the default fallback asset if replaced.
- Remove visible “Made with AI,” Lovable badges, and other generator branding while preserving required preview/auth infrastructure that is not user-facing.
- Add responsive Privacy Policy and Terms & Conditions pages for **TNC**, using **cheela.sathya@gmail.com** and **Telangana, India**, with clear effective dates and a legal-review disclaimer.
- Link both pages from the footer and relevant authentication/settings surfaces.

## Verification
- Run targeted tests for changed forms, role controls, and URL validation, then the project test suite.
- Check the latest build/runtime/console/network logs and resolve all errors related to this scope.
- Verify desktop and mobile layouts, reduced motion, keyboard navigation, signed-in workflows, realtime community behavior, and anonymous public portfolio access.

## Technical notes
- Any new persisted guide state or community permission changes will use Supabase migrations with explicit grants and row-level security.
- Community moderation remains enforced by database policies/functions; UI role checks will not be treated as security.
- No repository hosting or management will be introduced. GitHub remains an external link only.
- Legal copy will be a practical product template, not legal advice, and should receive professional review before launch.
