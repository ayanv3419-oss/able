import { streamText } from "ai";
import { meteredArtifactOptions } from "@/lib/ai/metered-artifact";
import { sheetPrompt, updateDocumentPrompt } from "@/lib/ai/prompts";
import { createDocumentHandler } from "@/lib/artifacts/server";

export const sheetDocumentHandler = createDocumentHandler<"sheet">({
  kind: "sheet",
  onCreateDocument: async ({ title, dataStream, session }) => {
    let draftContent = "";

    const { stream } = streamText({
      instructions: `${sheetPrompt}\n\nOutput ONLY the raw CSV data. No explanations, no markdown fences.`,
      ...(await meteredArtifactOptions(session.user.id)),
      prompt: title,
    });

    for await (const delta of stream) {
      if (delta.type === "text-delta") {
        draftContent += delta.text;
        dataStream.write({
          data: draftContent,
          transient: true,
          type: "data-sheetDelta",
        });
      }
    }

    return draftContent;
  },
  onUpdateDocument: async ({ document, description, dataStream, session }) => {
    let draftContent = "";

    const { stream } = streamText({
      instructions: `${updateDocumentPrompt(document.content, "sheet")}\n\nOutput ONLY the raw CSV data. No explanations, no markdown fences.`,
      ...(await meteredArtifactOptions(session.user.id)),
      prompt: description,
    });

    for await (const delta of stream) {
      if (delta.type === "text-delta") {
        draftContent += delta.text;
        dataStream.write({
          data: draftContent,
          transient: true,
          type: "data-sheetDelta",
        });
      }
    }

    return draftContent;
  },
});
