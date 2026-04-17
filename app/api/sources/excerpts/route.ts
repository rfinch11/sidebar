import { requireApprovedUser } from "@/lib/supabase/auth";
import { getSupabase } from "@/lib/supabase";

function extractSentence(text: string): string | null {
  // Find the first COMPLETE sentence: starts with a capital letter, min 50 chars
  const match = text.match(/[A-Z][^.!?]{49,}[.!?]/);
  if (!match) return null;
  const sentence = match[0].trim();
  // Reject navigation/boilerplate: too many slashes, pipes, or all-caps words
  if ((sentence.match(/[/|]/g) ?? []).length > 2) return null;
  if ((sentence.match(/\b[A-Z]{3,}\b/g) ?? []).length > 3) return null;
  // Reject unescaped HTML entities (e.g. &#8217; &amp;)
  if (/&[#a-zA-Z0-9]+;/.test(sentence)) return null;
  return sentence;
}

function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export async function GET() {
  const auth = await requireApprovedUser();
  if (auth.error) return auth.error;

  const supabase = getSupabase();

  // Fetch chunks 1–3 per source (skips chunk 0 which is header-heavy)
  const { data, error } = await supabase
    .from("chunks")
    .select("source_id, content, chunk_index")
    .in("chunk_index", [1, 2, 3])
    .limit(120);

  if (error) return Response.json({ error: error.message }, { status: 500 });

  // Deduplicate by source: prefer the lowest chunk_index that yields a clean sentence
  const bySource = new Map<string, string>();
  for (const chunk of (data ?? []).sort((a, b) => a.chunk_index - b.chunk_index)) {
    if (bySource.has(chunk.source_id)) continue;
    const sentence = extractSentence(chunk.content);
    if (sentence) bySource.set(chunk.source_id, sentence);
  }

  const excerpts = shuffle([...bySource.values()]).slice(0, 10);

  return Response.json({ excerpts });

}
