ALTER TABLE public.news ADD COLUMN IF NOT EXISTS source_url text, ADD COLUMN IF NOT EXISTS source text;
ALTER TABLE public.news ALTER COLUMN author_id DROP NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS news_source_url_key ON public.news(source_url);
GRANT SELECT ON public.news TO anon, authenticated;
GRANT ALL ON public.news TO service_role;
DROP POLICY IF EXISTS "Public can read published news" ON public.news;
CREATE POLICY "Public can read published news" ON public.news FOR SELECT TO anon, authenticated USING (published = true);
ALTER TABLE public.news REPLICA IDENTITY FULL;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.news; EXCEPTION WHEN others THEN NULL; END $$;