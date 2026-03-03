

## Plan: Fix Overall App Issues

### Issues Found

1. **Auth redirects to username setup every login** - `Auth.tsx` line 79-86: After login, `checkUserProfileSetup` runs and redirects to `/setup-username` if no profile or username is not set. This fires on every login even for existing users with profiles, because the profile check may fail or the user hasn't set `is_username_set`.

2. **RoomChat broken FK join** - `RoomChat.tsx` line 43-49: Uses `profile:user_id(...)` join syntax which fails since there's no FK from `room_messages.user_id` to `profiles`.

3. **Real-time sync conflict detection broken** - `CollaborationRoom.tsx` line 475: Uses `created_by !== user.id` to detect remote changes, but `created_by` is the file creator, not the last editor. This means edits from the file creator are always ignored.

4. **`broadcastTyping` creates duplicate channel** - Line 554: Creates a new `supabase.channel(...)` instead of reusing the existing presence channel ref.

5. **Share button only shows for private rooms** - Line 1024: `room.is_private &&` guard prevents sharing public rooms.

6. **`as any` casts in Collaborate.tsx** - Lines 153, 194: Unnecessary type casts on `room_participants`.

7. **`handleJoinByCode` calls `.toUpperCase()`** - Line 289: Invite codes are numeric, so `.toUpperCase()` is misleading (harmless but wrong).

8. **Portfolio page requires auth but shows no redirect** - Users hitting `/portfolio` without login see an empty state instead of being redirected.

### Implementation

#### 1. Fix Auth redirect loop (`src/pages/Auth.tsx`)
- Change `checkUserProfileSetup` to only redirect to `/setup-username` when profile truly doesn't exist or username is not set
- After successful login, redirect to `/portfolio` by default (not to username setup)
- Only redirect new signups (first-time users) to `/setup-username`

#### 2. Fix RoomChat profile fetching (`src/components/RoomChat.tsx`)
- Replace the FK join query with a two-step approach: fetch messages first, then fetch profiles by user IDs separately
- Map profiles onto messages client-side

#### 3. Fix real-time sync in CollaborationRoom (`src/pages/CollaborationRoom.tsx`)
- Add a `localSyncedFiles` ref (Set) to track file IDs we just saved
- After DB update in debounce handler, add file ID to set
- In realtime UPDATE handler, skip updates for files in the set
- Clear from set after 1s timeout

#### 4. Fix `broadcastTyping` channel reuse (`src/pages/CollaborationRoom.tsx`)
- Store presence channel in a ref
- Reuse the ref in `broadcastTyping` instead of creating a new channel

#### 5. Enable Share for all rooms (`src/pages/CollaborationRoom.tsx`)
- Remove `room.is_private &&` guard on Share button (line 1024)

#### 6. Fix Collaborate.tsx type casts
- Remove `as any` on lines 153, 194
- Remove `.toUpperCase()` on line 289

#### 7. Fix Portfolio auth guard (`src/pages/Portfolio.tsx`)
- Add redirect to `/auth` when user is not authenticated and not loading

### Files to modify
- `src/pages/Auth.tsx` - Fix post-login redirect logic
- `src/components/RoomChat.tsx` - Fix profile fetching
- `src/pages/CollaborationRoom.tsx` - Fix sync, typing channel, share button
- `src/pages/Collaborate.tsx` - Fix type casts and join code
- `src/pages/Portfolio.tsx` - Add auth guard redirect

