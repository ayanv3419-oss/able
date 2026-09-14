export const MAX_PDF_CHARS = 240_000;

export function pdfFilename(title: string) {
  const stem = title
    .normalize("NFKD")
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9 -]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 90)
    .toLowerCase();
  return `${stem || "able-document"}.pdf`;
}

/** Only the visible answer and its public sources, never hidden reasoning/tools. */
export function answerMarkdown(parts: unknown): string {
  if (!Array.isArray(parts)) {
    return "";
  }
  const text: string[] = [];
  const sources = new Map<string, string>();
  for (const part of parts) {
    if (!part || typeof part !== "object") {
      continue;
    }
    if (part.type === "text" && typeof part.text === "string") {
      text.push(part.text);
    }
    if (part.type === "source-url" && typeof part.url === "string") {
      try {
        const url = new URL(part.url);
        if (url.protocol === "https:" || url.protocol === "http:") {
          sources.set(url.href, String(part.title || url.hostname));
        }
      } catch {
        /* Ignore malformed sources. */
      }
    }
  }
  if (!text.join("").trim()) {
    return "";
  }
  if (sources.size) {
    text.push(
      "\n## Sources\n",
      ...[...sources].map(
        ([url, title], i) =>
          `${i + 1}. ${title.replace(/[[\]<>\n]/g, " ")} — <${url}>`
      )
    );
  }
  return text.join("\n\n").trim();
}
