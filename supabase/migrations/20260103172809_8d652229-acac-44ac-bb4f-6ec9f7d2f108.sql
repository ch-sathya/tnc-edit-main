-- Add UPDATE policy to room_participants to prevent privilege escalation
-- Only room owners (the original room creator) can update participant roles

CREATE POLICY "Only room owners can update participant roles"
ON public.room_participants
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.collaboration_rooms
    WHERE id = room_participants.room_id
    AND created_by = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.collaboration_rooms
    WHERE id = room_participants.room_id
    AND created_by = auth.uid()
  )
);