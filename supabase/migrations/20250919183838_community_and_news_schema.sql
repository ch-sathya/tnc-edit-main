-- Community and News Features Database Schema
-- This migration creates tables for community groups, memberships, messages, and news articles

-- Create community_groups table
CREATE TABLE IF NOT EXISTS public.community_groups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create group_memberships table
CREATE TABLE IF NOT EXISTS public.group_memberships (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES public.community_groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(group_id, user_id)
);

-- Create group_messages table
CREATE TABLE IF NOT EXISTS public.group_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES public.community_groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security (RLS) on all tables
ALTER TABLE public.community_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for community_groups
-- Anyone can view public groups
CREATE POLICY "Anyone can view community groups" 
ON public.community_groups 
FOR SELECT 
USING (true);

-- Authenticated users can create groups
CREATE POLICY "Authenticated users can create groups" 
ON public.community_groups 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = owner_id);

-- Group owners can update their groups
CREATE POLICY "Group owners can update their groups" 
ON public.community_groups 
FOR UPDATE 
USING (auth.uid() = owner_id)
WITH CHECK (auth.uid() = owner_id);

-- Group owners can delete their groups
CREATE POLICY "Group owners can delete their groups" 
ON public.community_groups 
FOR DELETE 
USING (auth.uid() = owner_id);

-- RLS Policies for group_memberships
-- Users can view memberships for groups they're members of or own
CREATE POLICY "Users can view relevant group memberships" 
ON public.group_memberships 
FOR SELECT 
USING (
  auth.uid() = user_id 
  OR EXISTS (
    SELECT 1 FROM public.community_groups 
    WHERE id = group_id AND owner_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.group_memberships gm 
    WHERE gm.group_id = group_memberships.group_id AND gm.user_id = auth.uid()
  )
);

-- Authenticated users can join groups
CREATE POLICY "Authenticated users can join groups" 
ON public.group_memberships 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

-- Users can leave groups they're members of
CREATE POLICY "Users can leave groups" 
ON public.group_memberships 
FOR DELETE 
USING (auth.uid() = user_id);

-- Group owners can remove members
CREATE POLICY "Group owners can remove members" 
ON public.group_memberships 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.community_groups 
    WHERE id = group_id AND owner_id = auth.uid()
  )
);

-- RLS Policies for group_messages
-- Only group members can view messages
CREATE POLICY "Group members can view messages" 
ON public.group_messages 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.group_memberships 
    WHERE group_id = group_messages.group_id AND user_id = auth.uid()
  )
);

-- Only group members can send messages
CREATE POLICY "Group members can send messages" 
ON public.group_messages 
FOR INSERT 
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM public.group_memberships 
    WHERE group_id = group_messages.group_id AND user_id = auth.uid()
  )
);

-- Users can update their own messages
CREATE POLICY "Users can update their own messages" 
ON public.group_messages 
FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Users can delete their own messages, group owners can delete any message
CREATE POLICY "Users and group owners can delete messages" 
ON public.group_messages 
FOR DELETE 
USING (
  auth.uid() = user_id 
  OR EXISTS (
    SELECT 1 FROM public.community_groups 
    WHERE id = group_id AND owner_id = auth.uid()
  )
);

-- Create indexes for performance optimization
-- Index for group lookups by name
CREATE INDEX IF NOT EXISTS idx_community_groups_name ON public.community_groups(name);

-- Index for group lookups by owner
CREATE INDEX IF NOT EXISTS idx_community_groups_owner ON public.community_groups(owner_id);

-- Index for membership lookups by group
CREATE INDEX IF NOT EXISTS idx_group_memberships_group ON public.group_memberships(group_id);

-- Index for membership lookups by user
CREATE INDEX IF NOT EXISTS idx_group_memberships_user ON public.group_memberships(user_id);

-- Composite index for group-user membership checks
CREATE INDEX IF NOT EXISTS idx_group_memberships_group_user ON public.group_memberships(group_id, user_id);

-- Index for message lookups by group
CREATE INDEX IF NOT EXISTS idx_group_messages_group ON public.group_messages(group_id);

-- Index for message lookups by user
CREATE INDEX IF NOT EXISTS idx_group_messages_user ON public.group_messages(user_id);

-- Index for message ordering by creation time
CREATE INDEX IF NOT EXISTS idx_group_messages_created_at ON public.group_messages(group_id, created_at DESC);

-- Add updated_at trigger for community_groups (assuming update_updated_at_column function exists)
CREATE TRIGGER update_community_groups_updated_at
  BEFORE UPDATE ON public.community_groups
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();