# Project architecture rules
- Keep news ingestion in the existing `fetch-news` Supabase Edge Function; normalize public feeds into the `news` table so the client reads one source.