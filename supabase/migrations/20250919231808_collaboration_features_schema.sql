-- Collaboration Features Database Schema
-- This migration creates tables for collaborative editing features including
-- collaboration files, sessions, and file changes for operational transformation

-- Create collaboration_files table
CREATE TABLE IF NOT EXISTS public.collaboration_files (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES public.community_groups(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  path VARCHAR(500) NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  language VARCHAR(50) NOT NULL DEFAULT 'plaintext',
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  version INTEGER NOT NULL DEFAULT 1,
  CONSTRAINT unique_group_file_path UNIQUE(group_id, path)
);

-- Create collaboration_sessions table
CREATE TABLE IF NOT EXISTS public.collaboration_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES public.community_groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  current_file_id UUID REFERENCES public.collaboration_files(id) ON DELETE SET NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'online' CHECK (status IN ('online', 'away', 'offline')),
  last_activity TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  cursor_position JSONB,
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT unique_group_user_session UNIQUE(group_id, user_id)
);

-- Create file_changes table for operational transformation
CREATE TABLE IF NOT EXISTS public.file_changes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  file_id UUID NOT NULL REFERENCES public.collaboration_files(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  operation_type VARCHAR(20) NOT NULL CHECK (operation_type IN ('insert', 'delete', 'replace')),
  position_start INTEGER NOT NULL,
  position_end INTEGER,
  content TEXT,
  version INTEGER NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  applied BOOLEAN NOT NULL DEFAULT false
);

-- Enable Row Level Security (RLS) on all collaboration tables
ALTER TABLE public.collaboration_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collaboration_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.file_changes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for collaboration_files
-- Group members can view files in their groups
CREATE POLICY "Group members can view collaboration files" 
ON public.collaboration_files 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.group_memberships 
    WHERE group_id = collaboration_files.group_id AND user_id = auth.uid()
  )
);

-- Group members can create files in their groups
CREATE POLICY "Group members can create collaboration files" 
ON public.collaboration_files 
FOR INSERT 
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND auth.uid() = created_by
  AND EXISTS (
    SELECT 1 FROM public.group_memberships 
    WHERE group_id = collaboration_files.group_id AND user_id = auth.uid()
  )
);

-- Group members can update files in their groups
CREATE POLICY "Group members can update collaboration files" 
ON public.collaboration_files 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.group_memberships 
    WHERE group_id = collaboration_files.group_id AND user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.group_memberships 
    WHERE group_id = collaboration_files.group_id AND user_id = auth.uid()
  )
);

-- Group members and file creators can delete files
CREATE POLICY "Group members can delete collaboration files" 
ON public.collaboration_files 
FOR DELETE 
USING (
  auth.uid() = created_by 
  OR EXISTS (
    SELECT 1 FROM public.community_groups 
    WHERE id = group_id AND owner_id = auth.uid()
  )
);

-- RLS Policies for collaboration_sessions
-- Group members can view sessions in their groups
CREATE POLICY "Group members can view collaboration sessions" 
ON public.collaboration_sessions 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.group_memberships 
    WHERE group_id = collaboration_sessions.group_id AND user_id = auth.uid()
  )
);

-- Users can create their own sessions in groups they're members of
CREATE POLICY "Users can create their own collaboration sessions" 
ON public.collaboration_sessions 
FOR INSERT 
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM public.group_memberships 
    WHERE group_id = collaboration_sessions.group_id AND user_id = auth.uid()
  )
);

-- Users can update their own sessions
CREATE POLICY "Users can update their own collaboration sessions" 
ON public.collaboration_sessions 
FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Users can delete their own sessions
CREATE POLICY "Users can delete their own collaboration sessions" 
ON public.collaboration_sessions 
FOR DELETE 
USING (auth.uid() = user_id);

-- RLS Policies for file_changes
-- Group members can view file changes for files in their groups
CREATE POLICY "Group members can view file changes" 
ON public.file_changes 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.collaboration_files cf
    JOIN public.group_memberships gm ON cf.group_id = gm.group_id
    WHERE cf.id = file_changes.file_id AND gm.user_id = auth.uid()
  )
);

-- Group members can create file changes for files in their groups
CREATE POLICY "Group members can create file changes" 
ON public.file_changes 
FOR INSERT 
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM public.collaboration_files cf
    JOIN public.group_memberships gm ON cf.group_id = gm.group_id
    WHERE cf.id = file_changes.file_id AND gm.user_id = auth.uid()
  )
);

-- Users can update their own file changes (for operational transformation)
CREATE POLICY "Users can update their own file changes" 
ON public.file_changes 
FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Create indexes for performance optimization

-- Indexes for collaboration_files
CREATE INDEX IF NOT EXISTS idx_collaboration_files_group ON public.collaboration_files(group_id);
CREATE INDEX IF NOT EXISTS idx_collaboration_files_created_by ON public.collaboration_files(created_by);
CREATE INDEX IF NOT EXISTS idx_collaboration_files_language ON public.collaboration_files(language);
CREATE INDEX IF NOT EXISTS idx_collaboration_files_updated_at ON public.collaboration_files(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_collaboration_files_version ON public.collaboration_files(version);

-- Indexes for collaboration_sessions
CREATE INDEX IF NOT EXISTS idx_collaboration_sessions_group ON public.collaboration_sessions(group_id);
CREATE INDEX IF NOT EXISTS idx_collaboration_sessions_user ON public.collaboration_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_collaboration_sessions_file ON public.collaboration_sessions(current_file_id);
CREATE INDEX IF NOT EXISTS idx_collaboration_sessions_status ON public.collaboration_sessions(status);
CREATE INDEX IF NOT EXISTS idx_collaboration_sessions_activity ON public.collaboration_sessions(last_activity DESC);

-- Indexes for file_changes
CREATE INDEX IF NOT EXISTS idx_file_changes_file ON public.file_changes(file_id);
CREATE INDEX IF NOT EXISTS idx_file_changes_user ON public.file_changes(user_id);
CREATE INDEX IF NOT EXISTS idx_file_changes_version ON public.file_changes(version);
CREATE INDEX IF NOT EXISTS idx_file_changes_timestamp ON public.file_changes(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_file_changes_applied ON public.file_changes(applied);
CREATE INDEX IF NOT EXISTS idx_file_changes_file_version ON public.file_changes(file_id, version);

-- Add updated_at triggers for tables that need them
CREATE TRIGGER update_collaboration_files_updated_at
  BEFORE UPDATE ON public.collaboration_files
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Database functions for operational transformation support

-- Function to get the latest version of a file
CREATE OR REPLACE FUNCTION public.get_file_latest_version(file_uuid UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN (
    SELECT version 
    FROM public.collaboration_files 
    WHERE id = file_uuid
  );
END;
$$;

-- Function to apply file changes and increment version
CREATE OR REPLACE FUNCTION public.apply_file_changes(
  file_uuid UUID,
  new_content TEXT,
  change_user_id UUID
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_version INTEGER;
BEGIN
  -- Update file content and increment version
  UPDATE public.collaboration_files 
  SET 
    content = new_content,
    version = version + 1,
    updated_at = now()
  WHERE id = file_uuid
  RETURNING version INTO new_version;
  
  -- Mark all pending changes for this file as applied
  UPDATE public.file_changes 
  SET applied = true 
  WHERE file_id = file_uuid AND applied = false;
  
  RETURN new_version;
END;
$$;

-- Function to get pending changes for a file
CREATE OR REPLACE FUNCTION public.get_pending_changes(file_uuid UUID)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  operation_type VARCHAR(20),
  position_start INTEGER,
  position_end INTEGER,
  content TEXT,
  version INTEGER,
  timestamp TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    fc.id,
    fc.user_id,
    fc.operation_type,
    fc.position_start,
    fc.position_end,
    fc.content,
    fc.version,
    fc.timestamp
  FROM public.file_changes fc
  WHERE fc.file_id = file_uuid AND fc.applied = false
  ORDER BY fc.timestamp ASC;
END;
$$;

-- Function to update user session activity
CREATE OR REPLACE FUNCTION public.update_session_activity(
  group_uuid UUID,
  session_user_id UUID,
  file_uuid UUID DEFAULT NULL,
  cursor_pos JSONB DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.collaboration_sessions (
    group_id, 
    user_id, 
    current_file_id, 
    cursor_position, 
    last_activity
  )
  VALUES (
    group_uuid, 
    session_user_id, 
    file_uuid, 
    cursor_pos, 
    now()
  )
  ON CONFLICT (group_id, user_id) 
  DO UPDATE SET
    current_file_id = COALESCE(file_uuid, collaboration_sessions.current_file_id),
    cursor_position = COALESCE(cursor_pos, collaboration_sessions.cursor_position),
    last_activity = now(),
    status = 'online';
END;
$$;

-- Function to clean up inactive sessions
CREATE OR REPLACE FUNCTION public.cleanup_inactive_sessions()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Mark sessions as away if inactive for more than 5 minutes
  UPDATE public.collaboration_sessions 
  SET status = 'away'
  WHERE status = 'online' 
    AND last_activity < now() - INTERVAL '5 minutes';
  
  -- Mark sessions as offline if inactive for more than 30 minutes
  UPDATE public.collaboration_sessions 
  SET status = 'offline'
  WHERE status IN ('online', 'away') 
    AND last_activity < now() - INTERVAL '30 minutes';
  
  -- Delete sessions that have been offline for more than 24 hours
  DELETE FROM public.collaboration_sessions 
  WHERE status = 'offline' 
    AND last_activity < now() - INTERVAL '24 hours';
END;
$$;

-- Grant necessary permissions for the functions
GRANT EXECUTE ON FUNCTION public.get_file_latest_version(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.apply_file_changes(UUID, TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_pending_changes(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_session_activity(UUID, UUID, UUID, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_inactive_sessions() TO authenticated;