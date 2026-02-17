import { createHash } from "crypto";
import { getSupabase } from "@/lib/supabase";
import { chunkText } from "@/lib/chunker";
import { CATEGORIES, CATEGORY_LABELS } from "@/lib/constants";
import { anthropic } from "@ai-sdk/anthropic";
import { generateText } from "ai";

import { YoutubeTranscript } from "youtube-transcript";
import { requireApprovedUser } from "@/lib/supabase/auth";

function hashText(text: string): string {
  return createHash("sha256").update(text.slice(0, 5000)).digest("hex");
}

function extractYouTubeVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
    /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

async function fetchYouTubeTranscript(url: string): Promise<string> {
  const videoId = extractYouTubeVideoId(url);
  if (!videoId) throw new Error("Could not extract YouTube video ID from URL");

  const segments = await YoutubeTranscript.fetchTranscript(videoId);
  if (!segments || segments.length === 0) {
    throw new Error("No transcript available for this video");
  }

  return segments.map((s) => s.text).join(" ");
}

async function fetchAndExtractText(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch URL: ${res.status}`);

  const html = await res.text();

  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<nav[\s\S]*?<\/nav>/gi, "")
    .replace(/<footer[\s\S]*?<\/footer>/gi, "")
    .replace(/<header[\s\S]*?<\/header>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  const res = await fetch("https://api.voyageai.com/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.VOYAGE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      input: texts,
      model: "voyage-3",
    }),
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Voyage AI error: ${error}`);
  }

  const data = await res.json();
  return data.data.map((d: { embedding: number[] }) => d.embedding);
}

async function autoTag(
  text: string
): Promise<{ categories: string[]; title: string; summary: string }> {
  const categoryList = CATEGORIES.map(
    (c) => `- ${c}: ${CATEGORY_LABELS[c]}`
  ).join("\n");

  const { text: response } = await generateText({
    model: anthropic("claude-haiku-4-5-20251001"),
    prompt: `Analyze this content and return a JSON object with exactly these fields:
- "categories": an array of 1-3 category keys from the list below that best fit the content (most relevant first):
${categoryList}
- "title": a concise title (max 80 chars)
- "summary": a 1-2 sentence summary of the key insight

Return ONLY valid JSON, no markdown fences or explanation.

Content (first 3000 chars):
${text.slice(0, 3000)}`,
  });

  try {
    const cleaned = response.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
    const parsed = JSON.parse(cleaned);
    // Handle both old "category" (string) and new "categories" (array) formats
    const categories = Array.isArray(parsed.categories)
      ? parsed.categories
      : parsed.category
        ? [parsed.category]
        : ["other"];
    return { categories, title: parsed.title || "", summary: parsed.summary || "" };
  } catch {
    return { categories: ["other"], title: "", summary: "" };
  }
}

export async function POST(req: Request) {
  const auth = await requireApprovedUser();
  if (auth.error) return auth.error;

  const body = await req.json();
  const type: "url" | "text" | "youtube" = body.type || "url";

  // Validate
  if (type === "url" || type === "youtube") {
    if (!body.url) {
      return Response.json({ error: "URL is required" }, { status: 400 });
    }
  } else if (type === "text") {
    if (!body.text || !body.title) {
      return Response.json({ error: "Text and title are required" }, { status: 400 });
    }
  }

  try {
    const supabase = getSupabase();

    // Dedup
    if (type === "url" || type === "youtube") {
      const { data: existing } = await supabase
        .from("sources")
        .select("id")
        .eq("url", body.url)
        .single();

      if (existing) {
        return Response.json(
          { error: "Source already exists", id: existing.id },
          { status: 409 }
        );
      }
    } else if (type === "text") {
      const contentHash = hashText(body.text);
      const { data: existing } = await supabase
        .from("sources")
        .select("id")
        .eq("content_hash", contentHash)
        .single();

      if (existing) {
        return Response.json(
          { error: "This text has already been ingested", id: existing.id },
          { status: 409 }
        );
      }
    }

    // Extract text based on type
    let rawText: string;

    if (type === "url") {
      rawText = await fetchAndExtractText(body.url);
    } else if (type === "youtube") {
      rawText = await fetchYouTubeTranscript(body.url);
    } else {
      rawText = body.text;
    }

    if (rawText.length < 100) {
      return Response.json(
        { error: "Text content is too short (minimum 100 characters)" },
        { status: 422 }
      );
    }

    // Auto-tag
    const tags = await autoTag(rawText);
    const finalCategories: string[] = Array.isArray(body.categories) && body.categories.length > 0
      ? body.categories
      : tags.categories;
    const finalTitle = type === "text" ? body.title : (body.title || tags.title);
    const finalSummary = tags.summary;

    // Insert source
    const contentHash = type === "text" ? hashText(body.text) : null;

    const { data: source, error: sourceError } = await supabase
      .from("sources")
      .insert({
        url: body.url || null,
        type,
        title: finalTitle,
        author: body.author || null,
        category: finalCategories,
        summary: finalSummary,
        raw_text: rawText,
        content_hash: contentHash,
      })
      .select("id")
      .single();

    if (sourceError) throw sourceError;

    // Chunk the text
    const chunks = chunkText(rawText);

    // Generate embeddings in batches of 20
    const batchSize = 20;
    let totalInserted = 0;

    for (let i = 0; i < chunks.length; i += batchSize) {
      const batch = chunks.slice(i, i + batchSize);
      const embeddings = await generateEmbeddings(batch);

      const rows = batch.map((content, j) => ({
        source_id: source.id,
        content,
        chunk_index: i + j,
        embedding: JSON.stringify(embeddings[j]),
      }));

      const { error: chunkError } = await supabase
        .from("chunks")
        .insert(rows);

      if (chunkError) throw chunkError;
      totalInserted += batch.length;
    }

    const categoryLabels = finalCategories
      .map((c: string) => CATEGORY_LABELS[c as keyof typeof CATEGORY_LABELS] || c)
      .join(", ");

    return Response.json({
      id: source.id,
      chunks: totalInserted,
      categories: finalCategories,
      title: finalTitle,
      summary: finalSummary,
      message: `Ingested "${finalTitle || body.url || "text"}" [${categoryLabels}] — ${totalInserted} chunks`,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}
