-- Create file_bookmarks table for user bookmarks
CREATE TABLE IF NOT EXISTS file_bookmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_id UUID NOT NULL REFERENCES collaboration_files(id) ON DELETE CASCADE,
  name TEXT, -- Optional custom bookmark name
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, file_id) -- Prevent duplicate bookmarks
);

-- Add RLS policies for file_bookmarks
ALTER TABLE file_bookmarks ENABLE ROW LEVEL SECURITY;

-- Users can only see their own bookmarks
CREATE POLICY "Users can view their own bookmarks" ON file_bookmarks
  FOR SELECT USING (auth.uid() = user_id);

-- Users can create their own bookmarks
CREATE POLICY "Users can create their own bookmarks" ON file_bookmarks
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own bookmarks
CREATE POLICY "Users can update their own bookmarks" ON file_bookmarks
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own bookmarks
CREATE POLICY "Users can delete their own bookmarks" ON file_bookmarks
  FOR DELETE USING (auth.uid() = user_id);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_file_bookmarks_user_id ON file_bookmarks(user_id);
CREATE INDEX IF NOT EXISTS idx_file_bookmarks_file_id ON file_bookmarks(file_id);
CREATE INDEX IF NOT EXISTS idx_file_bookmarks_created_at ON file_bookmarks(created_at DESC);