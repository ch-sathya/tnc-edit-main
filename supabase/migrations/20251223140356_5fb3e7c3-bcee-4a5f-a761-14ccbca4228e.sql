-- Fix project-images storage bucket policies to validate ownership
-- Users should only be able to update/delete their own project images

-- Drop overly permissive policies
DROP POLICY IF EXISTS "Users can update their project images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their project images" ON storage.objects;

-- Create ownership-validated policies (matching avatar bucket pattern)
CREATE POLICY "Users can update their own project images"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'project-images' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete their own project images"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'project-images' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );