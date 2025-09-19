-- Update profiles table to support the portfolio system
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS username TEXT UNIQUE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_username_set BOOLEAN DEFAULT FALSE;

-- Create unique constraint on username (case-insensitive)
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_username_lower ON public.profiles (LOWER(username));

-- Create repositories table
CREATE TABLE IF NOT EXISTS public.repositories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  user_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  visibility TEXT NOT NULL DEFAULT 'private' CHECK (visibility IN ('public', 'private')),
  admin_override_visibility TEXT CHECK (admin_override_visibility IN ('public', 'private')),
  default_branch TEXT DEFAULT 'main',
  readme_content TEXT,
  tags TEXT[],
  star_count INTEGER DEFAULT 0,
  fork_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add unique constraint for user repositories
CREATE UNIQUE INDEX IF NOT EXISTS idx_repositories_user_name ON public.repositories (user_id, LOWER(name));

-- Enable RLS on repositories
ALTER TABLE public.repositories ENABLE ROW LEVEL SECURITY;

-- Repository policies
CREATE POLICY "Public repositories are viewable by everyone" 
ON public.repositories 
FOR SELECT 
USING (
  visibility = 'public' 
  OR admin_override_visibility = 'public' 
  OR user_id = (SELECT user_id FROM public.profiles WHERE user_id = auth.uid())
);

CREATE POLICY "Users can create their own repositories" 
ON public.repositories 
FOR INSERT 
WITH CHECK (user_id = (SELECT user_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can update their own repositories" 
ON public.repositories 
FOR UPDATE 
USING (user_id = (SELECT user_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete their own repositories" 
ON public.repositories 
FOR DELETE 
USING (user_id = (SELECT user_id FROM public.profiles WHERE user_id = auth.uid()));

-- Create repository files table
CREATE TABLE IF NOT EXISTS public.repository_files (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  repository_id UUID NOT NULL REFERENCES public.repositories(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  content TEXT,
  file_type TEXT,
  size_bytes INTEGER,
  commit_hash TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add unique constraint for repository files
CREATE UNIQUE INDEX IF NOT EXISTS idx_repository_files_repo_path ON public.repository_files (repository_id, file_path);

-- Enable RLS on repository files
ALTER TABLE public.repository_files ENABLE ROW LEVEL SECURITY;

-- Repository files policies
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

-- Create commits table for version control
CREATE TABLE IF NOT EXISTS public.commits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  repository_id UUID NOT NULL REFERENCES public.repositories(id) ON DELETE CASCADE,
  commit_hash TEXT NOT NULL UNIQUE,
  message TEXT NOT NULL,
  author_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  parent_commit_hash TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on commits
ALTER TABLE public.commits ENABLE ROW LEVEL SECURITY;

-- Commits policies
CREATE POLICY "Commits inherit repository visibility" 
ON public.commits 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.repositories r 
    WHERE r.id = commits.repository_id 
    AND (
      r.visibility = 'public' 
      OR r.admin_override_visibility = 'public' 
      OR r.user_id = (SELECT user_id FROM public.profiles WHERE user_id = auth.uid())
    )
  )
);

CREATE POLICY "Repository owners can create commits" 
ON public.commits 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.repositories r 
    WHERE r.id = commits.repository_id 
    AND r.user_id = (SELECT user_id FROM public.profiles WHERE user_id = auth.uid())
  )
);

-- Create user follows table
CREATE TABLE IF NOT EXISTS public.user_follows (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  follower_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(follower_id, following_id),
  CHECK(follower_id != following_id)
);

-- Enable RLS on follows
ALTER TABLE public.user_follows ENABLE ROW LEVEL SECURITY;

-- Follows policies
CREATE POLICY "Users can view all follow relationships" 
ON public.user_follows 
FOR SELECT 
USING (true);

CREATE POLICY "Users can create their own follows" 
ON public.user_follows 
FOR INSERT 
WITH CHECK (follower_id = (SELECT user_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete their own follows" 
ON public.user_follows 
FOR DELETE 
USING (follower_id = (SELECT user_id FROM public.profiles WHERE user_id = auth.uid()));

-- Create activity feed table
CREATE TABLE IF NOT EXISTS public.activities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id UUID,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on activities
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;

-- Activities policies
CREATE POLICY "Public activities are viewable by everyone" 
ON public.activities 
FOR SELECT 
USING (true);

CREATE POLICY "Users can create their own activities" 
ON public.activities 
FOR INSERT 
WITH CHECK (user_id = (SELECT user_id FROM public.profiles WHERE user_id = auth.uid()));

-- Create repository stars table
CREATE TABLE IF NOT EXISTS public.repository_stars (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  repository_id UUID NOT NULL REFERENCES public.repositories(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(repository_id, user_id)
);

-- Enable RLS on repository stars
ALTER TABLE public.repository_stars ENABLE ROW LEVEL SECURITY;

-- Repository stars policies
CREATE POLICY "Repository stars are viewable by everyone" 
ON public.repository_stars 
FOR SELECT 
USING (true);

CREATE POLICY "Users can star repositories" 
ON public.repository_stars 
FOR INSERT 
WITH CHECK (user_id = (SELECT user_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can unstar repositories" 
ON public.repository_stars 
FOR DELETE 
USING (user_id = (SELECT user_id FROM public.profiles WHERE user_id = auth.uid()));

-- Create triggers for updated_at columns
CREATE TRIGGER update_repositories_updated_at
  BEFORE UPDATE ON public.repositories
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_repository_files_updated_at
  BEFORE UPDATE ON public.repository_files
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to update repository star count
CREATE OR REPLACE FUNCTION public.update_repository_star_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.repositories 
    SET star_count = star_count + 1 
    WHERE id = NEW.repository_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.repositories 
    SET star_count = star_count - 1 
    WHERE id = OLD.repository_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for repository star count
CREATE TRIGGER update_repository_star_count_trigger
  AFTER INSERT OR DELETE ON public.repository_stars
  FOR EACH ROW
  EXECUTE FUNCTION public.update_repository_star_count();