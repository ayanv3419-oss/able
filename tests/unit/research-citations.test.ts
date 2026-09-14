import type { TextStreamPart, ToolSet } from "ai";
import { expect, it } from "vitest";
import { normalizeResearchCitations } from "@/lib/ai/research-citations";

it("converts verified bracketed citations even when the URL spans stream chunks", async () => {
  const parts: TextStreamPart<ToolSet>[] = [
    { id: "answer", type: "text-start" },
    { id: "answer", text: "Evidence【https://", type: "text-delta" },
    {
      id: "answer",
      text: "example.org/source】. More【https://unknown.org/】.",
      type: "text-delta",
    },
    {
      id: "answer",
      text: " Ordinary [link](https://example.org/source). Incomplete【note",
      type: "text-delta",
    },
    { id: "answer", type: "text-end" },
  ];
  const input = new ReadableStream<TextStreamPart<ToolSet>>({
    start(controller) {
      for (const part of parts) {
        controller.enqueue(part);
      }
      controller.close();
    },
  });
  const reader = normalizeResearchCitations(input, [
    { url: "https://example.org/source" },
  ]).getReader();
  let text = "";
  while (true) {
    // biome-ignore lint/performance/noAwaitInLoops: Read the stream in order.
    const result = await reader.read();
    if (result.done) {
      break;
    }
    if (result.value.type === "text-delta") {
      text += result.value.text;
    }
  }
  expect(text).toBe(
    "Evidence[Source 1](https://example.org/source). More[unverified source]. Ordinary [link](https://example.org/source). Incomplete【note"
  );
});
