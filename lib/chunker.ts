const CHUNK_SIZE = 1000;
const CHUNK_OVERLAP = 200;

export function chunkText(text: string): string[] {
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (cleaned.length <= CHUNK_SIZE) return [cleaned];

  const chunks: string[] = [];
  let start = 0;

  while (start < cleaned.length) {
    let end = start + CHUNK_SIZE;

    // Try to break at a sentence boundary
    if (end < cleaned.length) {
      const slice = cleaned.slice(start, end);
      const lastPeriod = slice.lastIndexOf(". ");
      const lastNewline = slice.lastIndexOf("\n");
      const breakPoint = Math.max(lastPeriod, lastNewline);
      if (breakPoint > CHUNK_SIZE * 0.5) {
        end = start + breakPoint + 1;
      }
    }

    chunks.push(cleaned.slice(start, end).trim());
    start = end - CHUNK_OVERLAP;
  }

  return chunks.filter((c) => c.length > 50);
}
