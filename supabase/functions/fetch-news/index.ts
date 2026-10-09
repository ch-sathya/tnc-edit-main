import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Row = {
  title: string; content: string; excerpt: string; category: string; tags: string[];
  image_url: string | null; source_url: string; source: string; published: boolean;
  featured: boolean; created_at: string;
};

const categorize = (t: string): string => {
  const s = t.toLowerCase();
  if (/(ai|llm|gpt|model|startup|funding|acquire|layoff)/.test(s)) return "industry";
  if (/(release|version|launch|update|\d+\.\d+)/.test(s)) return "software";
  if (/(react|javascript|typescript|rust|python|go |css|api|code|developer)/.test(s)) return "development";
  return "tech";
};

async function hackerNews(): Promise<Row[]> {
  const ids: number[] = await (await fetch("https://hacker-news.firebaseio.com/v0/topstories.json")).json();
  const items = await Promise.all(ids.slice(0, 25).map(async (id) => {
    try { return await (await fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`)).json(); } catch { return null; }
  }));
  return items.filter((i) => i?.url && i?.title).map((i) => ({
    title: String(i.title).slice(0, 300),
    content: `${i.title}\n\nRead the full story at the source.`,
    excerpt: `${i.score ?? 0} points · ${i.descendants ?? 0} comments on Hacker News`,
    category: categorize(i.title), tags: ["hacker-news"], image_url: null,
    source_url: i.url, source: "Hacker News", published: true, featured: (i.score ?? 0) > 300,
    created_at: new Date((i.time ?? Date.now() / 1000) * 1000).toISOString(),
  }));
}

async function devTo(): Promise<Row[]> {
  const list = await (await fetch("https://dev.to/api/articles?top=1&per_page=20")).json();
  return (list as any[]).filter((a) => a?.url && a?.title).map((a) => ({
    title: String(a.title).slice(0, 300),
    content: a.description || a.title,
    excerpt: (a.description || "").slice(0, 280),
    category: categorize(a.title + " " + (a.tag_list || []).join(" ")),
    tags: (a.tag_list || []).slice(0, 5), image_url: a.cover_image || a.social_image || null,
    source_url: a.url, source: "DEV", published: true, featured: (a.positive_reactions_count ?? 0) > 200,
    created_at: a.published_at || new Date().toISOString(),
  }));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const results = await Promise.allSettled([hackerNews(), devTo()]);
    const rows = results.flatMap((r) => (r.status === "fulfilled" ? r.value : []));
    const { error } = await supabase.from("news").upsert(rows, { onConflict: "source_url", ignoreDuplicates: true });
    if (error) throw error;
    return new Response(JSON.stringify({ fetched: rows.length }), { headers: { ...cors, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("fetch-news failed", e);
    return new Response(JSON.stringify({ error: String((e as Error).message ?? e) }), { status: 500, headers: { ...cors, "Content-Type": "application/json" } });
  }
});
