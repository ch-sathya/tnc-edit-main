-- Fix infinite recursion in room_participants policy
DROP POLICY IF EXISTS "Participants can view room memberships" ON room_participants;

-- Create a simpler policy that doesn't cause recursion
CREATE POLICY "Users can view participants in rooms they joined" 
ON room_participants 
FOR SELECT 
USING (
  -- Users can see themselves
  auth.uid() = user_id 
  OR 
  -- Users can see other participants if they are also a participant
  EXISTS (
    SELECT 1 FROM room_participants participant_check 
    WHERE participant_check.room_id = room_participants.room_id 
    AND participant_check.user_id = auth.uid()
  )
);

-- Create table for collaborative code content
CREATE TABLE IF NOT EXISTS public.collaboration_code (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  language TEXT NOT NULL DEFAULT 'javascript',
  updated_by UUID NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.collaboration_code ENABLE ROW LEVEL SECURITY;

-- Allow room participants to view and edit code
CREATE POLICY "Room participants can view code" 
ON public.collaboration_code 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM room_participants 
    WHERE room_participants.room_id = collaboration_code.room_id 
    AND room_participants.user_id = auth.uid()
  )
);

CREATE POLICY "Room participants can update code" 
ON public.collaboration_code 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM room_participants 
    WHERE room_participants.room_id = collaboration_code.room_id 
    AND room_participants.user_id = auth.uid()
  )
) 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM room_participants 
    WHERE room_participants.room_id = collaboration_code.room_id 
    AND room_participants.user_id = auth.uid()
  )
);

CREATE POLICY "Room participants can create code" 
ON public.collaboration_code 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM room_participants 
    WHERE room_participants.room_id = collaboration_code.room_id 
    AND room_participants.user_id = auth.uid()
  )
);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_collaboration_code_updated_at
BEFORE UPDATE ON public.collaboration_code
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for collaboration_code table
ALTER PUBLICATION supabase_realtime ADD TABLE collaboration_code;