-- Fix collaboration room joining issues by updating RLS policies

-- Allow users to delete from room_participants (needed for leaving rooms)
DROP POLICY IF EXISTS "Users can leave rooms" ON public.room_participants;
CREATE POLICY "Users can leave rooms" 
ON public.room_participants 
FOR DELETE 
USING (auth.uid() = user_id);

-- Allow room creators to delete rooms and all associated data
CREATE POLICY "Room creators can delete their rooms" 
ON public.collaboration_rooms 
FOR DELETE 
USING (auth.uid() = created_by);