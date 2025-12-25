-- Create table for shared code snippets with public URLs
CREATE TABLE public.shared_snippets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  short_code VARCHAR(12) NOT NULL UNIQUE,
  code TEXT NOT NULL,
  language VARCHAR(50) NOT NULL,
  title VARCHAR(255),
  input TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE,
  view_count INTEGER DEFAULT 0
);

-- Enable RLS
ALTER TABLE public.shared_snippets ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read shared snippets (public access)
CREATE POLICY "Anyone can view shared snippets" 
ON public.shared_snippets 
FOR SELECT 
USING (true);

-- Allow anyone to create snippets (no auth required for sharing)
CREATE POLICY "Anyone can create shared snippets" 
ON public.shared_snippets 
FOR INSERT 
WITH CHECK (true);

-- Allow creators to update their snippets
CREATE POLICY "Creators can update their snippets" 
ON public.shared_snippets 
FOR UPDATE 
USING (created_by = auth.uid() OR created_by IS NULL);

-- Allow creators to delete their snippets
CREATE POLICY "Creators can delete their snippets" 
ON public.shared_snippets 
FOR DELETE 
USING (created_by = auth.uid() OR created_by IS NULL);

-- Create index on short_code for fast lookups
CREATE INDEX idx_shared_snippets_short_code ON public.shared_snippets(short_code);

-- Function to increment view count
CREATE OR REPLACE FUNCTION public.increment_snippet_view_count(snippet_code VARCHAR)
RETURNS VOID AS $$
BEGIN
  UPDATE public.shared_snippets 
  SET view_count = view_count + 1 
  WHERE short_code = snippet_code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;