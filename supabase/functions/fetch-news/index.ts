import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

type NewsRow = {
  title: string;
  content: string;
  excerpt: string;
  category: string;
  tags: string[];
  image_url: string | null;
  source_url: string;
  source: string;
  published: boolean;
  featured: boolean;
  created_at: string;
};

const categorize = (text: string): string => {
  const value = text.toLowerCase();
  if (/\b(ai|artificial intelligence|llm|gpt|gemini|claude|machine learning|deep learning|neural network|openai|anthropic|hugging face)\b/.test(value)) return "ai";
  if (/\b(release|version|launch|update|changelog)\b/.test(value)) return "software";
  if (/\b(react|javascript|typescript|rust|python|css|api|code|developer|programming)\b/.test(value)) return "development";
  return "tech";
};

const fetchJson = async <T>(url: string): Promise<T> => {
  const response = await fetch(url, { signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw new Error(`News source returned ${response.status}: ${new URL(url).hostname}`);
  return await response.json() as T;
};

const decodeXml = (text: string): string => text
  .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
  .replace(/&#x([\da-f]+);/gi, (_, code: string) => String.fromCodePoint(parseInt(code, 16)))
  .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
  .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
  .replace(/&quot;/g, '"').replace(/&apos;|&#39;/g, "'")
  .replace(/<[^>]*>/g, "").trim();

const tagValue = (xml: string, tag: string): string => {
  const match = xml.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return match ? decodeXml(match[1]) : "";
};

const rssRows = async (source: string, feedUrl: string): Promise<NewsRow[]> => {
  const response = await fetch(feedUrl, { signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw new Error(`${source} feed returned ${response.status}`);
  const xml = await response.text();
  const items = [...xml.matchAll(/<item\b[^>]*>([\s\S]*?)<\/item>/gi)].map(match => match[1]);
  return items.map(item => {
    const title = tagValue(item, "title").slice(0, 300);
    const sourceUrl = tagValue(item, "link") || tagValue(item, "guid");
    if (!title || !sourceUrl) return null;
    const excerpt = tagValue(item, "description").slice(0, 500);
    const dateText = tagValue(item, "pubDate") || tagValue(item, "published") || tagValue(item, "updated");
    const publishedAt = dateText && !Number.isNaN(Date.parse(dateText)) ? new Date(dateText).toISOString() : new Date().toISOString();
    const image = item.match(/<(?:media:content|media:thumbnail|enclosure)\b[^>]*url=["']([^"']+)["']/i)?.[1] ?? null;
    return {
      title,
      content: excerpt || `${title}\n\nRead the full story at the original source.`,
      excerpt: excerpt || `${source} latest news`,
      category: categorize(`${title} ${excerpt}`),
      tags: [source.toLowerCase().replace(/[^a-z0-9]+/g, "-")],
      image_url: image,
      source_url: sourceUrl,
      source,
      published: true,
      featured: false,
      created_at: publishedAt,
    } satisfies NewsRow;
  }).filter((row): row is NewsRow => row !== null);
};

async function hackerNews(): Promise<NewsRow[]> {
  const ids = await fetchJson<number[]>("https://hacker-news.firebaseio.com/v0/topstories.json");
  const items = await Promise.all(ids.slice(0, 25).map(async id => {
    try { return await fetchJson<any>(`https://hacker-news.firebaseio.com/v0/item/${id}.json`); } catch { return null; }
  }));
  return items.filter((item): item is NonNullable<typeof item> => !!item?.url && !!item?.title).map(item => ({
    title: String(item.title).slice(0, 300),
    content: `${item.title}\n\nRead the full story at the original source.`,
    excerpt: `${item.score ?? 0} points · ${item.descendants ?? 0} comments on Hacker News`,
    category: categorize(item.title),
    tags: ["hacker-news"],
    image_url: null,
    source_url: item.url,
    source: "Hacker News",
    published: true,
    featured: (item.score ?? 0) > 300,
    created_at: new Date((item.time ?? Date.now() / 1000) * 1000).toISOString(),
  }));
}

async function devTo(): Promise<NewsRow[]> {
  const list = await fetchJson<any[]>("https://dev.to/api/articles?top=1&per_page=30");
  return list.filter(article => article?.url && article?.title).map(article => ({
    title: String(article.title).slice(0, 300),
    content: article.description || article.title,
    excerpt: (article.description || "").slice(0, 280),
    category: categorize(`${article.title} ${(article.tag_list || []).join(" ")}`),
    tags: (article.tag_list || []).slice(0, 5),
    image_url: article.cover_image || article.social_image || null,
    source_url: article.url,
    source: "DEV",
    published: true,
    featured: (article.positive_reactions_count ?? 0) > 200,
    created_at: article.published_at || new Date().toISOString(),
  }));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  try {
    const [hn, dev, openai, deepmind, huggingface, nvidia] = await Promise.allSettled([
      hackerNews(),
      devTo(),
      rssRows("OpenAI", "https://openai.com/news/rss.xml"),
      rssRows("Google DeepMind", "https://deepmind.google/blog/rss.xml"),
      rssRows("Hugging Face", "https://huggingface.co/blog/feed.xml"),
      rssRows("NVIDIA", "https://blogs.nvidia.com/feed/"),
    ]);
    const results = [hn, dev, openai, deepmind, huggingface, nvidia];
    const sourceNames = ["Hacker News", "DEV", "OpenAI", "Google DeepMind", "Hugging Face", "NVIDIA"];
    const rows = results.flatMap(result => result.status === "fulfilled" ? result.value : []);
    results.forEach((result, index) => {
      if (result.status === "rejected") console.error(`News source failed (${sourceNames[index]}):`, result.reason);
    });

    if (rows.length === 0) throw new Error("All news sources are temporarily unavailable");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) throw new Error("News storage is not configured");

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const { error } = await supabase.from("news").upsert(rows, { onConflict: "source_url", ignoreDuplicates: true });
    if (error) throw error;
    return new Response(JSON.stringify({ fetched: rows.length, sources: results.filter(result => result.status === "fulfilled").length }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    console.error("fetch-news failed", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
