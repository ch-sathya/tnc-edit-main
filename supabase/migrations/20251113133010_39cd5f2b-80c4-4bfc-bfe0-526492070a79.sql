-- Create storage buckets for avatars and project images
INSERT INTO storage.buckets (id, name, public) 
VALUES 
  ('avatars', 'avatars', true),
  ('project-images', 'project-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for avatars
CREATE POLICY "Avatar images are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatar"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can update their own avatar"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'avatars' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete their own avatar"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'avatars' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Storage policies for project images
CREATE POLICY "Project images are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'project-images');

CREATE POLICY "Users can upload project images"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'project-images' AND
    auth.uid() IS NOT NULL
  );

CREATE POLICY "Users can update their project images"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'project-images' AND
    auth.uid() IS NOT NULL
  );

CREATE POLICY "Users can delete their project images"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'project-images' AND
    auth.uid() IS NOT NULL
  );