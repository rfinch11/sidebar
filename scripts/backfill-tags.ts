import { createClient } from "@supabase/supabase-js";
import Anthropic from "@anthropic-ai/sdk";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const client = new Anthropic();

const CATEGORIES = [
  "hiring", "craft", "org_design", "leadership", "culture",
  "strategy", "career_growth", "critique", "process", "other",
];

const LABELS: Record<string, string> = {
  hiring: "Hiring", craft: "Craft", org_design: "Org Design",
  leadership: "Leadership", culture: "Culture", strategy: "Strategy",
  career_growth: "Career Growth", critique: "Critique",
  process: "Process", other: "Other",
};

async function tagSource(rawText: string) {
  const categoryList = CATEGORIES.map((c) => `- ${c}: ${LABELS[c]}`).join("\n");

  const msg = await client.messages.create({
    model: "claude-3-5-haiku-20241022",
    max_tokens: 256,
    messages: [{
      role: "user",
      content: `Analyze this article and return a JSON object with exactly these fields:
- "category": one of the following category keys that best fits:
${categoryList}
- "title": a concise title (max 80 chars)
- "summary": a 1-2 sentence summary of the key insight

Return ONLY valid JSON, no markdown fences.

Article text (first 3000 chars):
${rawText.slice(0, 3000)}`,
    }],
  });

  const text = msg.content[0].type === "text" ? msg.content[0].text : "";
  try {
    const cleaned = text.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
    return JSON.parse(cleaned);
  } catch {
    return { category: "other", title: "", summary: "" };
  }
}

async function main() {
  const { data: sources, error } = await supabase
    .from("sources")
    .select("id, url, raw_text, category, title, summary")
    .or("category.is.null,title.is.null,summary.is.null");

  if (error) { console.error(error); return; }
  if (!sources?.length) { console.log("No sources to backfill."); return; }

  console.log(`Backfilling ${sources.length} sources...\n`);

  for (const source of sources) {
    if (!source.raw_text) {
      console.log(`  SKIP ${source.url} (no raw_text)`);
      continue;
    }

    const tags = await tagSource(source.raw_text);
    const updates: Record<string, string> = {};
    if (!source.category) updates.category = tags.category;
    if (!source.title) updates.title = tags.title;
    if (!source.summary) updates.summary = tags.summary;

    if (Object.keys(updates).length === 0) {
      console.log(`  SKIP ${source.url} (already tagged)`);
      continue;
    }

    const { error: updateErr } = await supabase
      .from("sources")
      .update(updates)
      .eq("id", source.id);

    if (updateErr) {
      console.log(`  ERROR ${source.url}: ${updateErr.message}`);
    } else {
      console.log(`  OK [${updates.category || source.category}] ${updates.title || source.title}`);
    }
  }

  console.log("\nDone.");
}

main();
