# The Night Club — production readiness and enterprise roadmap

## Goal
Turn The Night Club into a dependable developer community where people can present real work, meet collaborators, build together live, and keep up with relevant technology and AI news. Treat “enterprise-ready” as a verified outcome, not a visual claim: no launch gate passes without evidence from real user flows, security checks, and failure/recovery tests.

## Product direction
- **Why The Night Club:** a developer’s work should be more than a static profile. The differentiator is a connected path from public portfolio and peer discovery to communities and a shared coding room, with collaboration visible as it happens.
- **Visual language:** borrow the constellation-led storytelling of Maserati, the restraint and black editorial look of BH, and the project-led motion of Jordi Garreta. Translate these into a readable monochrome night-sky identity with subtle star/map details and purposeful transitions—not 3D scenes or motion that competes with code. Respect reduced-motion settings.
- **Scope guardrail:** GitHub remains a link on a project, not repository hosting, importing, OAuth, syncing, or push-back. Keep the existing external Supabase project; do not add a separate backend.

## Phases

### 0. Establish an honest baseline
- Inventory every route and visible tab, then check signed-out, signed-in, loading, empty, error, mobile, and permission-denied states.
- Cover Home, Auth/username setup, Portfolio, public profiles, Showcase/project details, Collaborate/join/room/editor, Community/group/posts/chat/settings, Connections/direct messages, Notifications, News/article, Settings, Pricing, and legal pages.
- Run current tests and lint/build checks; reproduce existing failures before changing behavior. Create an end-to-end flow matrix and record which checks need a safe signed-in test account.
- **Gate:** no route is marked “working” solely because it renders; every main action has a result and error/retry path.

### 1. Close security and data-integrity risks
- Compare applied database grants/RLS with migration history before acting. Review the broad authenticated table grant in the repository and whether users can alter their own plan or credits; enforce entitlements and credit changes only through trusted server-side paths.
- Make AI usage charging atomic and error-checked; validate request size, conversation length, permitted models, concurrency, and spend limits. Preserve auth checks and never expose provider secrets in the browser.
- Bound every code-execution path, including Python work/output; authorize every socket action against server-side room membership, not just the initial join.
- Review Realtime authorization, private-message/group membership boundaries, public-profile visibility, uploads, admin/moderator permissions, and rate limits. Keep admin roles separate from editable profile metadata.
- **Gate:** unauthorized users cannot read or change private data, grant themselves entitlements, overload execution, or inject events into rooms; negative tests prove each boundary.

### 2. Make the core user journeys reliable
- Test signup/sign-in/sign-out/password recovery and username routing; verify profile edits, banner/avatar, work history, education, public sharing, and privacy settings persist and display correctly.
- Test project create/edit/delete and link-only GitHub behavior; group discovery/join/leave, posts, votes, comments, chat, member roles and moderation; connection requests, acceptance/removal, direct-message routing, notifications and unread state.
- Test room creation/invites, files, editor changes, save/reopen, code execution, chat and settings. Repair broken loading, empty, retry, navigation and mobile states found by the matrix.
- **Gate:** browser end-to-end tests exercise create → persist → reload/read-back and permission-denied paths with two safe test accounts where collaboration requires two people.

### 3. Prove realtime collaboration and recovery
- Verify room membership/presence, named cursors, concurrent edits, file changes, room chat, group chat/posts, direct messages, notifications and profile/community updates across two independent sessions without refresh.
- Test slow/disconnected/reconnected clients, duplicate subscriptions, simultaneous edits, stale snapshots, channel authorization failures, tab close and recovery. Confirm there is no lost saved work and that channels/timers are cleaned up.
- Instrument sync state and actionable failures without logging private message or source-code contents.
- **Gate:** repeatable two-user tests pass for live update, reconnect and durable read-back; documented limitations remain visible rather than silently showing stale “online” states.

### 4. Make News dependable and fresh
- Keep the current public Hacker News, DEV and RSS ingestion in the existing `fetch-news` Edge Function; validate source feeds and provide source-level health, last-success time and clear partial-failure reporting.
- Verify the actual production scheduler before claiming hourly freshness—the checked-in migrations currently do not show a schedule. Add a protected, monitored scheduled refresh with deduplication and safe retries; keep the public refresh button for reloading stored stories, not exposing a privileged ingestion trigger.
- Ensure new stories appear through Realtime, categories and article links remain correct, older articles can be opened, and source updates/deletions are handled deliberately. Start at a measured cadence (hourly is the current roadmap target); public feeds do not provide guaranteed instant push delivery.
- **Gate:** observe a scheduled successful run, a partial source outage, duplicate feed items, and a new story arriving in the UI; verify the deployed schedule and function logs.

### 5. Refine the story, visuals and motion
- Rework the first visit around the product promise: show developer work, active collaboration and useful communities/news as the reason to join—not a generic feature list.
- Apply a consistent monochrome editorial system to Home, profiles, project showcase, community, news and collaboration; use restrained space cues, legible content, meaningful empty states and clear active/loading/error feedback.
- Add motion only where it explains a state change or reveals work; reduce ambient motion, keep the editor fast, and verify reduced-motion and keyboard/accessibility behavior.
- **Gate:** review desktop and mobile screenshots for every primary route; no clipped text, unreadable code, overlapping controls, inaccessible motion, or visual regressions.

### 6. Launch pricing, cost controls and enterprise path
- Use the selected **free + paid tiers** model. Treat initial prices as hypotheses: test **Free**, **Pro around $8–10/month**, and **Team around $15–20/seat/month** against measured costs and willingness to pay. These are planning ranges, not approved or published prices. Developer-tool pricing varies widely; for example, DevSwarm lists $8 Pro/$18 Team while CoDev lists $20 Pro/$20 per Team seat, so validate against this product’s actual value and costs ([DevSwarm](https://devswarm.ai/blog/devswarm-pricing-explained-free-parallel-ai-coding/), [CoDev](https://www.trycodev.com/pricing)).
- Keep core community/profile discovery free; define only limits that are enforced and measurable. Do not promise unlimited AI, private repository hosting, an SLA, or enterprise controls until they exist and are costed. Decide whether AI is separately metered or bring-your-own-model before including it in a fixed plan. Pricing currently displays a “coming soon” response for paid selections; checkout, renewal, cancellation, webhook idempotency and entitlement enforcement must pass before charging users.
- Reuse existing open-source Yjs/Monaco collaboration rather than replacing a working foundation. Keep no-key public news sources where their terms permit it; the official Hacker News API is a documented public source ([API](https://raw.githubusercontent.com/HackerNews/API/refs/heads/master/README.md)). For AI, retain a provider boundary: local Ollama can help evaluate models during development, while production serving with vLLM is an infrastructure/GPU operation—not automatically cheaper than the existing hosted gateway. Benchmark latency, quality, concurrency, model/checkpoint license, operations burden and total cost before switching ([vLLM](https://github.com/vllm-project/vllm/)). Self-host analytics only when the team can operate it; PostHog notes self-hosting requires owning infrastructure and scaling ([self-hosting guidance](https://posthog.com/docs/self-host)).
- After baseline launch gates pass, assess enterprise-specific needs such as organization workspaces, SSO, audit export, retention controls, support and procurement requirements; do not imply these are already available.
- **Gate:** documented per-active-user and per-feature costs, enforced plan limits, tested billing lifecycle, and no paid feature that is only decorative UI.

### 7. Release readiness
- Verify production configuration, secrets and CORS, database policies/grants, scheduler, function versions, backups/recovery, rate limits, monitoring/alerts, metadata/robots/sitemap, legal review, and mobile/accessibility checks.
- Remove or document only confirmed-unused legacy services; the Socket.IO server is referenced by current presence/cursor hooks, so do not remove it before proving the replacement and deployed runtime.
- Run the full test suite and route-by-route end-to-end matrix against a production-like environment, then publish only after all critical gates pass. Report any remaining external dependency or unverified setting plainly.

## Technical facts verified for this plan
- The app is a React/Vite client connected to external Supabase; the root architecture rule keeps news ingestion in `fetch-news`.
- News ingestion has six configured source paths, but no schedule appears in checked-in migrations; the current refresh UI refreshes stored data rather than invoking ingestion.
- `fetch-news` is configured without JWT verification and writes with the service role; production invocation protection and cadence must be verified before launch.
- Pricing loads database tiers, but paid-plan selection currently reports that Stripe is coming soon.
- Existing collaboration uses Yjs/Monaco and Supabase Realtime; reliable behavior still needs two-session authorization, concurrency and recovery tests.
- Current automated tests are concentrated in Community, News and collaboration helpers; several important page flows have no dedicated tests, and prior News checks reported incomplete Supabase mocks.

## Verification standard
“Perfect” cannot be guaranteed from source review. Completion means every supported primary flow has a passing automated check, critical permissions have negative tests, realtime has a two-session recovery check, News has a verified scheduled run, and any remaining limitation is explicitly reported.