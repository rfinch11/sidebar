import { anthropic } from "@ai-sdk/anthropic";
import { streamText, generateText } from "ai";
import { getSupabase } from "@/lib/supabase";
import { requireApprovedUser } from "@/lib/supabase/auth";

const SYSTEM_PROMPT = `You are Sidebar — a trusted panel of experienced leaders who provide thoughtful, actionable guidance on topics like leadership, hiring, strategy, org design, culture, career growth, and craft.

Your responses should be:
- **Concise** — aim for 150-250 words in the main body. Get to the point fast. No filler.
- Direct and practical, not generic or vague
- Grounded in real-world experience and best practices
- Honest, including when the answer is "it depends" — but always explain what it depends on

When provided with context from curated sources, draw on that material to inform your answers. Synthesize rather than just quoting.

**CRITICAL RULE — NEVER fabricate citations.** You may ONLY cite sources that appear in the "Relevant Context from Curated Sources" section below. Do NOT invent authors, titles, or URLs from your own knowledge. If no context section is provided, or the provided context is not relevant to the question, answer from general expertise with NO citations, NO source links, and NO Sources section at all.

When relevant context IS provided, do both of the following:

1. **Inline citations**: After any sentence that draws on a provided source, append a short citation link as a separate element — never wrap part of your sentence in the link. Use the **author name** as the link text when an author is known; only fall back to the article title if no author is available. If a source has no URL, use [Author](#) or [Title](#) instead. Example: "The best hiring filter is whether you'd be happy working for that person someday. [Lee Robinson](https://leerob.com/beliefs)" — notice the citation is a separate element after the sentence, not wrapping words within it. Cite frequently throughout your response, but ONLY from provided sources.

2. **Sources section**: At the end of your response, list all cited sources. Every entry MUST come from the provided context — no exceptions:

**Sources**
- [Title](url) — Author
- [Title](#) — Author (for sources without a URL)

**Follow-ups**: End every response with 2-3 short suggested follow-up questions the user could ask to go deeper, formatted as a bulleted list under a "**Go deeper**" heading.`;

async function getRelevantContext(query: string): Promise<string | null> {
  try {
    const voyageRes = await fetch("https://api.voyageai.com/v1/embeddings", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.VOYAGE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        input: [query],
        model: "voyage-3",
      }),
    });

    if (!voyageRes.ok) return null;

    const voyageData = await voyageRes.json();
    const embedding = voyageData.data?.[0]?.embedding;
    if (!embedding) return null;

    const { data: chunks, error } = await getSupabase().rpc("match_chunks", {
      query_embedding: JSON.stringify(embedding),
      match_threshold: 0.35,
      match_count: 8,
    });

    if (error || !chunks?.length) return null;

    const sourceIds = [...new Set(chunks.map((c: { source_id: string }) => c.source_id))];
    const { data: sources } = await getSupabase()
      .from("sources")
      .select("id, title, author, url")
      .in("id", sourceIds);

    const sourceMap = new Map(
      sources?.map((s: { id: string; title: string; author: string; url: string | null }) => [s.id, s]) ?? []
    );

    const contextParts = chunks.map(
      (chunk: { source_id: string; content: string; similarity: number }) => {
        const source = sourceMap.get(chunk.source_id) as
          | { title: string; author: string; url: string | null }
          | undefined;
        const attribution = source
          ? `[Source: "${source.title}"${source.author ? ` — ${source.author}` : ""}${source.url ? ` | URL: ${source.url}` : ""}]`
          : "";
        return `${attribution}\n${chunk.content}`;
      }
    );

    return contextParts.join("\n\n---\n\n");
  } catch {
    return null;
  }
}

interface IncomingMessage {
  id?: string;
  role: string;
  content?: string;
  parts?: Array<{ type: string; text?: string }>;
}

function getTextFromMessage(msg: IncomingMessage): string {
  if (msg.content) return msg.content;
  if (msg.parts) {
    return msg.parts
      .filter((p) => p.type === "text" && p.text)
      .map((p) => p.text!)
      .join("");
  }
  return "";
}

export async function POST(req: Request) {
  const auth = await requireApprovedUser();
  if (auth.error) return auth.error;

  try {
    const { messages, id: conversationId } = await req.json() as {
      messages: IncomingMessage[];
      id?: string;
    };

    // Convert UI messages (parts) to core messages (content) for the model
    const coreMessages = messages
      .filter((m) => m.role === "user" || m.role === "assistant")
      .map((m) => ({
        role: m.role as "user" | "assistant",
        content: getTextFromMessage(m),
      }))
      .filter((m) => m.content.length > 0);

    // Get the latest user message for RAG context
    const lastUserMessage = [...coreMessages]
      .reverse()
      .find((m) => m.role === "user");

    let context: string | null = null;
    if (lastUserMessage?.content) {
      context = await getRelevantContext(lastUserMessage.content);
    }

    const systemWithContext = context
      ? `${SYSTEM_PROMPT}\n\n## Relevant Context from Curated Sources\n\n${context}`
      : SYSTEM_PROMPT;

    const isFirstExchange =
      coreMessages.filter((m) => m.role === "user").length === 1;

    const result = streamText({
      model: anthropic("claude-sonnet-4-5-20250929"),
      system: systemWithContext,
      messages: coreMessages,
      async onFinish({ text }) {
        if (!conversationId) return;

        const allMessages = [
          ...messages.map((m) => ({
            id: m.id || crypto.randomUUID(),
            role: m.role,
            parts: m.parts || [{ type: "text", text: getTextFromMessage(m) }],
          })),
          {
            id: crypto.randomUUID(),
            role: "assistant",
            parts: [{ type: "text", text }],
          },
        ];

        const supabaseAdmin = getSupabase();

        await supabaseAdmin.from("conversations").upsert(
          {
            id: conversationId,
            user_id: auth.user!.id,
            messages: allMessages,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "id" }
        );

        if (isFirstExchange) {
          try {
            const userText =
              coreMessages.find((m) => m.role === "user")?.content || "";
            const { text: title } = await generateText({
              model: anthropic("claude-sonnet-4-5-20250929"),
              maxOutputTokens: 20,
              prompt: `Generate a short title (3-6 words, no quotes, no period) for this conversation:\nUser: ${userText}\nAssistant: ${text.substring(0, 200)}`,
            });

            await supabaseAdmin
              .from("conversations")
              .update({ title: title.trim().substring(0, 100) })
              .eq("id", conversationId);
          } catch {
            // Non-fatal: conversation keeps default title
          }
        }
      },
    });

    return result.toUIMessageStreamResponse();
  } catch (error) {
    console.error("Chat API error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
