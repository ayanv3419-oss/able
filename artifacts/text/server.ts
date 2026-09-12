import { smoothStream, streamText } from "ai";
import { meteredArtifactOptions } from "@/lib/ai/metered-artifact";
import { updateDocumentPrompt } from "@/lib/ai/prompts";
import { createDocumentHandler } from "@/lib/artifacts/server";

export const textDocumentHandler = createDocumentHandler<"text">({
  kind: "text",
  onCreateDocument: async ({ title, dataStream, session }) => {
    let draftContent = "";

    const { stream } = streamText({
      experimental_transform: smoothStream({ chunking: "word" }),
      instructions:
        "Write about the given topic. Markdown is supported. Use headings wherever appropriate.",
      ...(await meteredArtifactOptions(session.user.id)),
      prompt: title,
    });

    for await (const delta of stream) {
      if (delta.type === "text-delta") {
        draftContent += delta.text;
        dataStream.write({
          data: delta.text,
          transient: true,
          type: "data-textDelta",
        });
      }
    }

    return draftContent;
  },
  onUpdateDocument: async ({ document, description, dataStream, session }) => {
    let draftContent = "";

    const { stream } = streamText({
      experimental_transform: smoothStream({ chunking: "word" }),
      instructions: updateDocumentPrompt(document.content, "text"),
      ...(await meteredArtifactOptions(session.user.id)),
      prompt: description,
    });

    for await (const delta of stream) {
      if (delta.type === "text-delta") {
        draftContent += delta.text;
        dataStream.write({
          data: delta.text,
          transient: true,
          type: "data-textDelta",
        });
      }
    }

    return draftContent;
  },
});
