-- Create room invitations table for invite code system
CREATE TABLE public.room_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES public.collaboration_rooms(id) ON DELETE CASCADE,
  invite_code VARCHAR(8) UNIQUE NOT NULL,
  created_by UUID NOT NULL,
  expires_at TIMESTAMPTZ,
  max_uses INTEGER DEFAULT NULL,
  used_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.room_invitations ENABLE ROW LEVEL SECURITY;

-- Policies for room invitations
CREATE POLICY "Anyone can view invitation codes" 
ON public.room_invitations 
FOR SELECT 
USING (true);

CREATE POLICY "Room owners can create invitations" 
ON public.room_invitations 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.collaboration_rooms 
    WHERE id = room_id AND created_by = auth.uid()
  )
);

CREATE POLICY "Room owners can delete invitations" 
ON public.room_invitations 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.collaboration_rooms 
    WHERE id = room_id AND created_by = auth.uid()
  )
);

-- Enable realtime for room_invitations
ALTER PUBLICATION supabase_realtime ADD TABLE public.room_invitations;

-- Add cascade delete constraints to clean up related data when room is deleted
-- Note: collaboration_files and room_messages already have ON DELETE CASCADE from room_id FK

-- Ensure collaboration_code has cascade delete
ALTER TABLE public.collaboration_code 
DROP CONSTRAINT IF EXISTS collaboration_code_room_id_fkey;

ALTER TABLE public.collaboration_code
ADD CONSTRAINT collaboration_code_room_id_fkey 
FOREIGN KEY (room_id) REFERENCES public.collaboration_rooms(id) ON DELETE CASCADE;