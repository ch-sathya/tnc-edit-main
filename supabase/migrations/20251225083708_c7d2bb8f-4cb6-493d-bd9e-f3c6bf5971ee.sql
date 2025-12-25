-- Add DELETE policy for user_connections so users can remove connections
CREATE POLICY "Users can delete their connections"
ON public.user_connections
FOR DELETE
USING (auth.uid() = requester_id OR auth.uid() = addressee_id);