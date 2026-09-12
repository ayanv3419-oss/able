import "server-only";

import { generateText } from "ai";
import { insertUsageEvent } from "@/lib/db/usage-queries";
import { costMicros } from "@/lib/metering";
import type { ChatMessage } from "@/lib/types";
import { getTextFromMessage } from "@/lib/utils";
import { titlePrompt } from "./prompts";
import { getTitleModel } from "./providers";
import { usageForBilling } from "./usage";

function cleanTitle(text: string): string {
  return text
    .replace(/^[#*"\s]+/, "")
    .replace(/["]+$/, "")
    .trim();
}

/**
 * Names a new chat with the cheaper title model (gpt-oss-20b), and
 * records what that call cost as a `title` usage event. Titles are metered
 * but never charged against the student's daily budget (SPEC §2, §5).
 */
export async function generateChatTitle({
  chatId,
  message,
  userId,
}: {
  userId: string;
  chatId: string;
  message: ChatMessage;
}): Promise<string> {
  const { text, usage } = await generateText({
    instructions: titlePrompt,
    maxOutputTokens: 512,
    model: getTitleModel(),
    prompt: getTextFromMessage(message),
    providerOptions: { groq: { reasoningEffort: "low" } },
  });

  const title =
    cleanTitle(text).slice(0, 100) ||
    getTextFromMessage(message).slice(0, 60) ||
    "New chat";

  const { inputTokens } = usageForBilling(usage);
  const cachedInputTokens = usage.inputTokenDetails?.cacheReadTokens ?? 0;
  const outputTokens = usage.outputTokens ?? 0;

  try {
    await insertUsageEvent({
      audioSeconds: 0,
      cachedInputTokens,
      chatId,
      costMicros: costMicros({
        cachedInputTokens,
        inputTokens,
        model: "title",
        outputTokens,
      }),
      countsTowardLimit: false,
      inputTokens,
      kind: "title",
      outputTokens,
      planId: null,
      reasoningTokens: 0,
      userId,
      webSearches: 0,
    });
  } catch (error) {
    // Usage metering must never break the chat itself.
    console.error("Failed to record title usage:", error);
  }

  return title;
}
