import "server-only";

import type { LanguageModelUsage } from "ai";
import { insertUsageEvent } from "@/lib/db/usage-queries";
import { getEntitlement } from "@/lib/entitlements";
import { ChatbotError } from "@/lib/errors";
import { costMicros } from "@/lib/metering";
import { getChatModel } from "./providers";
import { usageForBilling } from "./usage";

/** Nested document calls use the same plan and contribute to its budget. */
export async function meteredArtifactOptions(userId: string) {
  const entitlement = await getEntitlement(userId);
  if (!entitlement.canSend || !entitlement.planId) {
    throw new ChatbotError("forbidden:plan");
  }
  const { planId } = entitlement;
  let recorded = false;
  async function record(usages: LanguageModelUsage[]) {
    if (recorded || usages.length === 0) {
      return;
    }
    recorded = true;
    const total = usages.map(usageForBilling).reduce(
      (sum, item) => ({
        cachedInputTokens: sum.cachedInputTokens + item.cachedInputTokens,
        inputTokens: sum.inputTokens + item.inputTokens,
        outputTokens: sum.outputTokens + item.outputTokens,
        reasoningTokens: sum.reasoningTokens + item.reasoningTokens,
      }),
      {
        cachedInputTokens: 0,
        inputTokens: 0,
        outputTokens: 0,
        reasoningTokens: 0,
      }
    );
    await insertUsageEvent({
      ...total,
      costMicros: costMicros({ ...total, model: "chat" }),
      countsTowardLimit: true,
      kind: "chat",
      planId,
      userId,
    });
  }
  return {
    model: getChatModel(),
    onAbort: (event: { steps: Array<{ usage: LanguageModelUsage }> }) =>
      record(event.steps.map((step) => step.usage)),
    onEnd: (event: { usage: LanguageModelUsage }) => record([event.usage]),
    providerOptions: { groq: { reasoningEffort: entitlement.reasoningEffort } },
  };
}
