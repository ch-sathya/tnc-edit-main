-- Fix security issue: Restrict activities table access to activity owners only
-- Drop the overly permissive public policy
DROP POLICY IF EXISTS "Public activities are viewable by everyone" ON public.activities;

-- Create a secure policy that only allows users to see their own activities
CREATE POLICY "Users can view their own activities" 
ON public.activities 
FOR SELECT 
USING (user_id = (
  SELECT profiles.user_id 
  FROM profiles 
  WHERE profiles.user_id = auth.uid()
));