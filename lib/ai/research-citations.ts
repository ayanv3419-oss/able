import type { TextStreamPart, ToolSet } from "ai";

/** Groq sometimes emits bracketed URLs even when Markdown citations are requested. */
export function normalizeResearchCitations<T extends ToolSet>(
  stream: ReadableStream<TextStreamPart<T>>,
  sources: { url: string }[]
) {
  const verified = new Map(
    sources.map((source, index) => [new URL(source.url).href, index + 1])
  );
  const pending = new Map<string, string>();
  const replace = (text: string) =>
    text.replace(/【(https?:\/\/[^\s【】]+)】/g, (_match, raw: string) => {
      let url: string;
      try {
        url = new URL(raw).href;
      } catch {
        return "[unverified source]";
      }
      const index = verified.get(url);
      return index
        ? `[Source ${index}](${url.replace(/[()<>]/g, (character) => `%${character.charCodeAt(0).toString(16)}`)})`
        : "[unverified source]";
    });
  return stream.pipeThrough(
    new TransformStream<TextStreamPart<T>, TextStreamPart<T>>({
      transform(part, controller) {
        if (part.type === "text-delta") {
          const text = (pending.get(part.id) ?? "") + part.text;
          const opening = text.lastIndexOf("【");
          const incomplete =
            opening > text.lastIndexOf("】") && text.length - opening <= 2048;
          pending.set(part.id, incomplete ? text.slice(opening) : "");
          const ready = incomplete ? text.slice(0, opening) : text;
          if (ready) {
            controller.enqueue({ ...part, text: replace(ready) });
          }
          return;
        }
        if (part.type === "text-end") {
          const remaining = pending.get(part.id);
          if (remaining) {
            controller.enqueue({
              id: part.id,
              text: replace(remaining),
              type: "text-delta",
            });
          }
          pending.delete(part.id);
        }
        controller.enqueue(part);
      },
    })
  );
}
