import type { LanguageModelUsage } from "ai";

/** AI SDK inputTokens includes cached tokens; never price them twice. */
export function usageForBilling(usage: LanguageModelUsage) {
  const cachedInputTokens = usage.inputTokenDetails?.cacheReadTokens ?? 0;
  return {
    cachedInputTokens,
    inputTokens:
      usage.inputTokenDetails?.noCacheTokens ??
      Math.max(0, (usage.inputTokens ?? 0) - cachedInputTokens),
    outputTokens: usage.outputTokens ?? 0,
    reasoningTokens: usage.outputTokenDetails?.reasoningTokens ?? 0,
  };
}
