import { requireApprovedUser } from "@/lib/supabase/auth";
import { getSupabase } from "@/lib/supabase";

export async function GET(req: Request) {
  const auth = await requireApprovedUser();
  if (auth.error) return auth.error;

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim() || "";
  const category = searchParams.get("category") || "";

  const supabase = getSupabase();

  if (!q) {
    let query = supabase
      .from("sources")
      .select("id, title, author, url, type, category, summary, raw_text, created_at")
      .order("created_at", { ascending: false });

    if (category) {
      query = query.contains("category", [category]);
    }

    const { data, error } = await query;
    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json({ sources: (data ?? []).map((s) => ({ ...s, excerpt: null })) });
  }

  // Split query into words for title/author ilike (OR per word)
  const words = q.split(/\s+/).filter(Boolean);
  const titleOrFilter = words
    .flatMap((w) => [`title.ilike.%${w}%`, `author.ilike.%${w}%`])
    .join(",");

  // Parallel search: title/author (word-split ilike) + chunk content (full-text)
  const [titleResult, chunkResult] = await Promise.all([
    (() => {
      let query = supabase
        .from("sources")
        .select("id, title, author, url, type, category, summary, raw_text, created_at")
        .or(titleOrFilter)
        .order("created_at", { ascending: false });
      if (category) query = query.contains("category", [category]);
      return query;
    })(),
    supabase
      .from("chunks")
      .select("source_id, content")
      .textSearch("content", q, { type: "plain", config: "english" })
      .limit(100),
  ]);

  if (titleResult.error) return Response.json({ error: titleResult.error.message }, { status: 500 });

  const titleSources = titleResult.data ?? [];
  const titleIds = new Set(titleSources.map((s) => s.id));

  // Count chunk hits per source and capture first excerpt
  const chunkHits = new Map<string, number>();
  const excerptMap = new Map<string, string>();
  for (const chunk of chunkResult.data ?? []) {
    chunkHits.set(chunk.source_id, (chunkHits.get(chunk.source_id) ?? 0) + 1);
    if (!excerptMap.has(chunk.source_id)) {
      excerptMap.set(chunk.source_id, chunk.content);
    }
  }

  // Fetch sources only matched via chunks (not already in title results)
  const chunkOnlyIds = [...excerptMap.keys()].filter((id) => !titleIds.has(id));
  let chunkSources: typeof titleSources = [];
  if (chunkOnlyIds.length > 0) {
    let query = supabase
      .from("sources")
      .select("id, title, author, url, type, category, summary, raw_text, created_at")
      .in("id", chunkOnlyIds)
      .order("created_at", { ascending: false });
    if (category) query = query.contains("category", [category]);
    const { data } = await query;
    chunkSources = data ?? [];
  }

  // Score: chunk hit count + bonus for title/author match, then sort descending
  const scored = [
    ...titleSources.map((s) => ({ ...s, excerpt: null, _score: (chunkHits.get(s.id) ?? 0) + 5 })),
    ...chunkSources.map((s) => ({ ...s, excerpt: excerptMap.get(s.id) ?? null, _score: chunkHits.get(s.id) ?? 1 })),
  ].sort((a, b) => b._score - a._score);

  const sources = scored.map(({ _score, ...s }) => s);

  return Response.json({ sources });
}
