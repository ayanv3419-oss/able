import { z } from "zod";

const rawSearchChunk = z.object({
  choices: z.array(
    z.object({
      delta: z
        .object({
          executed_tools: z
            .array(
              z.object({
                index: z.number().int().nonnegative(),
                name: z.string(),
                search_results: z
                  .object({
                    results: z
                      .array(
                        z.object({
                          title: z.string().optional(),
                          url: z.string(),
                        })
                      )
                      .nullish(),
                  })
                  .nullish(),
              })
            )
            .optional(),
        })
        .nullish(),
    })
  ),
});

/** Groq's executed_tools is omitted by @ai-sdk/groq 4.0.41. */
export class GroqSearchTracker {
  private step = 0;
  private readonly searches = new Set<string>();
  private readonly urls = new Set<string>();

  get searchCount() {
    return this.searches.size;
  }

  startStep() {
    this.step += 1;
  }

  read(rawValue: unknown) {
    const parsed = rawSearchChunk.safeParse(rawValue);
    const sources: { sourceId: string; url: string; title: string }[] = [];
    if (!parsed.success) {
      return sources;
    }
    for (const choice of parsed.data.choices) {
      for (const tool of choice.delta?.executed_tools ?? []) {
        if (tool.name === "browser.search") {
          // Start and completion chunks share an index; count the call once.
          this.searches.add(`${this.step}:${tool.index}`);
        }
        for (const source of tool.search_results?.results ?? []) {
          if (!/^https?:\/\//i.test(source.url) || this.urls.has(source.url)) {
            continue;
          }
          this.urls.add(source.url);
          sources.push({
            sourceId: source.url,
            title: source.title || source.url,
            url: source.url,
          });
        }
      }
    }
    return sources;
  }
}
