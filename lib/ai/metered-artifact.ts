import "server-only";

import type { LanguageModelUsage } from "ai";
import { insertUsageEvent } from "@/lib/db/usage-queries";
import { getEntitlement } from "@/lib/entitlements";
import { ChatbotError } from "@/lib/errors";
import { costMicros } from "@/lib/metering";
import {
  getChatModelSelection,
  markModelSelectionFailure,
  markModelSelectionHealthy,
} from "./providers";
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
  const selection = await getChatModelSelection();
  return {
    maxRetries: 0,
    model: selection.model,
    onAbort: (event: { steps: Array<{ usage: LanguageModelUsage }> }) =>
      record(event.steps.map((step) => step.usage)),
    onEnd: async (event: { usage: LanguageModelUsage }) => {
      await record([event.usage]);
      await markModelSelectionHealthy(selection);
    },
    onError: async ({ error }: { error: unknown }) => {
      await markModelSelectionFailure(selection, error);
    },
    providerOptions:
      selection.provider === "groq"
        ? { groq: { reasoningEffort: entitlement.reasoningEffort } }
        : undefined,
  };
}
