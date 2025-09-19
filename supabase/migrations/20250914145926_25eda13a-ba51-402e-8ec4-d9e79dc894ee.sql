-- Add file management tables for repositories
CREATE TABLE IF NOT EXISTS public.repository_files (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  repository_id UUID NOT NULL REFERENCES public.repositories(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  content TEXT,
  file_type TEXT,
  size_bytes INTEGER,
  commit_hash TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(repository_id, file_path)
);

-- Enable RLS on repository_files
ALTER TABLE public.repository_files ENABLE ROW LEVEL SECURITY;

-- Create policies for repository_files
CREATE POLICY "Repository files inherit repository visibility" 
ON public.repository_files 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.repositories r 
    WHERE r.id = repository_files.repository_id 
    AND (
      r.visibility = 'public' 
      OR r.admin_override_visibility = 'public' 
      OR r.user_id = (SELECT user_id FROM public.profiles WHERE user_id = auth.uid())
    )
  )
);

CREATE POLICY "Repository owners can manage files" 
ON public.repository_files 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.repositories r 
    WHERE r.id = repository_files.repository_id 
    AND r.user_id = (SELECT user_id FROM public.profiles WHERE user_id = auth.uid())
  )
) 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.repositories r 
    WHERE r.id = repository_files.repository_id 
    AND r.user_id = (SELECT user_id FROM public.profiles WHERE user_id = auth.uid())
  )
);

-- Add updated_at trigger for repository_files
CREATE TRIGGER update_repository_files_updated_at
  BEFORE UPDATE ON public.repository_files
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create multiple files support for collaboration rooms
CREATE TABLE IF NOT EXISTS public.collaboration_files (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID NOT NULL REFERENCES public.collaboration_rooms(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  language TEXT NOT NULL DEFAULT 'javascript',
  created_by UUID NOT NULL,
  updated_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(room_id, file_path)
);

-- Enable RLS on collaboration_files
ALTER TABLE public.collaboration_files ENABLE ROW LEVEL SECURITY;

-- Create policies for collaboration_files
CREATE POLICY "Room participants can view files" 
ON public.collaboration_files 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.room_participants 
    WHERE room_participants.room_id = collaboration_files.room_id 
    AND room_participants.user_id = auth.uid()
  )
);

CREATE POLICY "Room participants can manage files" 
ON public.collaboration_files 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.room_participants 
    WHERE room_participants.room_id = collaboration_files.room_id 
    AND room_participants.user_id = auth.uid()
  )
) 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.room_participants 
    WHERE room_participants.room_id = collaboration_files.room_id 
    AND room_participants.user_id = auth.uid()
  )
);

-- Add updated_at trigger for collaboration_files
CREATE TRIGGER update_collaboration_files_updated_at
  BEFORE UPDATE ON public.collaboration_files
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create cursor tracking table for real-time collaboration
CREATE TABLE IF NOT EXISTS public.collaboration_cursors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID NOT NULL REFERENCES public.collaboration_rooms(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL DEFAULT 'main.js',
  user_id UUID NOT NULL,
  cursor_position JSONB,
  selection_range JSONB,
  last_active TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(room_id, file_path, user_id)
);

-- Enable RLS on collaboration_cursors
ALTER TABLE public.collaboration_cursors ENABLE ROW LEVEL SECURITY;

-- Create policies for collaboration_cursors
CREATE POLICY "Room participants can view cursors" 
ON public.collaboration_cursors 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.room_participants 
    WHERE room_participants.room_id = collaboration_cursors.room_id 
    AND room_participants.user_id = auth.uid()
  )
);

CREATE POLICY "Room participants can manage their cursors" 
ON public.collaboration_cursors 
FOR ALL 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);