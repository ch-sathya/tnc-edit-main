

## Plan: Fix Auth Redirect Loop and Remaining Issues

### Root Cause Analysis

Queried the database: all 3 users have `username: null` and `is_username_set: false`. The current Auth.tsx logic correctly redirects them to `/setup-username`, but this creates a frustrating loop because users keep getting sent there every login without being able to skip it.

### Issues to Fix

**1. Auth redirect loop — allow skipping username setup**
- Add a "Skip for now" button to `UsernameSetup.tsx` that sets `is_username_set = true` without requiring a username
- In `Auth.tsx`, change `checkUserProfileSetup` to only redirect to `/setup-username` when `is_username_set` is explicitly `false` AND the user has never logged in before (first login detection)
- Simpler approach: just add the skip button and let users bypass it

**2. Portfolio auth guard — auto-redirect**
- In `Portfolio.tsx`, replace the "Sign in Required" card with an automatic `navigate('/auth')` redirect when `!user && !authLoading`

**3. UsernameSetup upsert issue**
- The upsert in `UsernameSetup.tsx` (line 90) doesn't specify `onConflict`, which may fail since profiles are auto-created by the `handle_new_user` trigger. Change to use `.update()` instead since the profile already exists.

### Files to Modify

- `src/pages/UsernameSetup.tsx` — Add "Skip" button, fix upsert to use update
- `src/pages/Auth.tsx` — Simplify redirect: if `is_username_set` is true OR username exists, go to `/portfolio`; otherwise go to `/setup-username`
- `src/pages/Portfolio.tsx` — Auto-redirect unauthenticated users to `/auth`

### Technical Details

**UsernameSetup skip flow:**
- Add a "Skip for now" button that calls `supabase.from('profiles').update({ is_username_set: true }).eq('user_id', user.id)` then navigates to `/portfolio`
- This ensures the user won't be redirected back to setup on next login

**Portfolio redirect:**
```typescript
useEffect(() => {
  if (!authLoading && !user) {
    navigate('/auth');
  }
}, [user, authLoading, navigate]);
```

