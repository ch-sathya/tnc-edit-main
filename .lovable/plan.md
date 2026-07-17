## Plan

### 1. Remove all 3D effects
- Delete `src/components/three/FloatingScene.tsx` and its import from `AmbientBackground.tsx`. Keep the fluid gradient orbs + grid (2D) so the glass aesthetic remains.
- Remove `three`, `@react-three/fiber`, `@react-three/drei` from `package.json`.
- Remove any remaining `three`-related imports if lint flags them.

### 2. Remove the persistent scroll-indicator button on Home
- Delete the animated "mouse/scroll" indicator block in `src/pages/Home.tsx` (lines ~150–163). No replacement.

### 3. Fix collaboration room realtime
Root causes observed:
- **REPLICA IDENTITY** is not set to FULL on `room_messages`, `collaboration_files`, `room_participants`, so `postgres_changes` UPDATE/DELETE payloads arrive without full rows and the UI silently misses updates. Migration: `ALTER TABLE ... REPLICA IDENTITY FULL` for those three tables (already in `supabase_realtime` publication).
- **`RoomChat` subscription is gated by `isOpen`** — new messages that arrive while the panel is closed are dropped, and reopening refetches only once. Change effect to always subscribe while mounted (independent of `isOpen`), keep fetch behind `isOpen` for the first open.
- **Presence/participants merge**: currently `participants` list comes only from DB refetch on postgres_changes; if realtime hiccups, list goes stale. Add a lightweight refetch on presence `sync` too, and re-run participant fetch on `join`/`leave` presence events so member list reflects reality immediately.
- **Cursor decorations**: `useRealtimeCursors` broadcasts on a channel scoped by `roomId+fileId`. Ensure the channel is (re)subscribed whenever `currentFileId` changes and that remote cursors from the same file are rendered with a labeled Monaco decoration showing the user's name + colored caret. Fix any missing cleanup that currently requires a refresh to see other users' cursors.
- **Status indicators**: presence already tracks `online/away/offline`; wire the participant row rendering to prefer the live `onlineUsers` map over DB `last_seen`, so status dots update instantly.

### 4. Verification
- Reload check: open room in two browsers, confirm without refresh — new chat messages appear, new participants appear, file edits stream, other user's cursor + name label shows in the editor, presence dot flips online/away.

### Files touched
- `src/components/animations/AmbientBackground.tsx` (drop 3D layer)
- `src/components/three/FloatingScene.tsx` (delete)
- `package.json` (drop three deps)
- `src/pages/Home.tsx` (drop scroll indicator)
- `src/pages/CollaborationRoom.tsx` (participant refetch on presence, status from presence map)
- `src/components/RoomChat.tsx` (subscribe always, fetch on open)
- `src/hooks/useRealtimeCursors.ts` (resubscribe on file change, ensure decoration render + cleanup)
- New migration: `REPLICA IDENTITY FULL` for `room_messages`, `collaboration_files`, `room_participants`.
