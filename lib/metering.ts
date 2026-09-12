/**
 * Cost metering, as decided in docs/SPEC.md §5.
 *
 * Every price is in US dollars per million tokens unless stated otherwise, and
 * every cost this module returns is in micro-dollars (US dollars x 1,000,000)
 * rounded up, which is what the UsageEvent.costMicros column stores.
 */

import { getPlan, type Plan, type PlanId, type ReasoningEffort } from "./plans";

/** openai/gpt-oss-120b, uncached input. */
export const CHAT_INPUT_USD_PER_MTOK = 0.15;
/** openai/gpt-oss-120b, cached input. */
export const CHAT_CACHED_INPUT_USD_PER_MTOK = 0.075;
/** openai/gpt-oss-120b output, reasoning tokens included. */
export const CHAT_OUTPUT_USD_PER_MTOK = 0.6;
/** gpt-oss-20b prices: https://console.groq.com/docs/model/openai/gpt-oss-20b */
export const TITLE_INPUT_USD_PER_MTOK = 0.075;
export const TITLE_CACHED_INPUT_USD_PER_MTOK = 0.037;
export const TITLE_OUTPUT_USD_PER_MTOK = 0.3;
/** Dollars per web search, billed by the third-party trackers Groq uses. */
export const WEB_SEARCH_USD = 0.005;
/** Dollars per hour of audio for whisper-large-v3-turbo. */
export const WHISPER_USD_PER_HOUR = 0.04;
/** Rupees per dollar, used only to display costs on the admin page. */
export const INR_PER_USD = 95.44;

const MICROS_PER_USD = 1_000_000;
const SECONDS_PER_HOUR = 3600;

/** Input tokens assumed for a plan's reference message. */
export const REFERENCE_INPUT_TOKENS = 3000;

/** Output tokens assumed for a reference message at each reasoning effort. */
export const REFERENCE_OUTPUT_TOKENS: Record<ReasoningEffort, number> = {
  high: 3000,
  low: 700,
  medium: 1500,
};

export type UsageForCost = {
  /** Which model ran: the answer model or the cheaper title model. */
  model: "chat" | "title";
  /** Input tokens that were not served from the prompt cache. */
  inputTokens?: number;
  /** Input tokens served from the prompt cache. */
  cachedInputTokens?: number;
  /** Output tokens, reasoning tokens included. */
  outputTokens?: number;
  /** Provider-executed web searches. */
  webSearches?: number;
  /** Seconds of audio transcribed. */
  audioSeconds?: number;
};

/** A plan, or the id of one. */
export type PlanLike = Plan | PlanId;

function resolvePlan(plan: PlanLike): Plan {
  return typeof plan === "string" ? getPlan(plan) : plan;
}

function orZero(value: number | undefined): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

/**
 * Cost of one request in micro-dollars, rounded up. Missing numbers count as 0.
 * Both models use their separate cached-input price.
 */
export function costMicros(usage: UsageForCost): number {
  const isTitle = usage.model === "title";
  const inputPrice = isTitle
    ? TITLE_INPUT_USD_PER_MTOK
    : CHAT_INPUT_USD_PER_MTOK;
  const cachedInputPrice = isTitle
    ? TITLE_CACHED_INPUT_USD_PER_MTOK
    : CHAT_CACHED_INPUT_USD_PER_MTOK;
  const outputPrice = isTitle
    ? TITLE_OUTPUT_USD_PER_MTOK
    : CHAT_OUTPUT_USD_PER_MTOK;

  const tokenMicros =
    orZero(usage.inputTokens) * inputPrice +
    orZero(usage.cachedInputTokens) * cachedInputPrice +
    orZero(usage.outputTokens) * outputPrice;
  const searchMicros =
    orZero(usage.webSearches) * WEB_SEARCH_USD * MICROS_PER_USD;
  const audioMicros =
    (orZero(usage.audioSeconds) * WHISPER_USD_PER_HOUR * MICROS_PER_USD) /
    SECONDS_PER_HOUR;

  return Math.ceil(tokenMicros + searchMicros + audioMicros);
}

/**
 * What one message on this plan is assumed to cost: a reference prompt plus a
 * reference answer at the plan's reasoning effort. 870, 1350 and 2250 micros.
 */
export function referenceCostMicros(plan: PlanLike): number {
  const resolved = resolvePlan(plan);

  return costMicros({
    inputTokens: REFERENCE_INPUT_TOKENS,
    model: "chat",
    outputTokens: REFERENCE_OUTPUT_TOKENS[resolved.reasoningEffort],
  });
}

/** A day's spending allowance in micro-dollars. */
export function dailyBudgetMicros(plan: PlanLike): number {
  const resolved = resolvePlan(plan);

  return resolved.dailyMessages * referenceCostMicros(resolved);
}

/**
 * Messages a student may still send today. One expensive message may overshoot
 * the budget slightly; that is accepted, so this never goes below zero.
 */
export function messagesLeft(plan: PlanLike, spentMicros: number): number {
  const resolved = resolvePlan(plan);
  const remaining = dailyBudgetMicros(resolved) - Math.max(0, spentMicros);

  if (remaining <= 0) {
    return 0;
  }

  return Math.floor(remaining / referenceCostMicros(resolved));
}

const IST_OFFSET_MINUTES = 330;
const MINUTE_MS = 60_000;

/**
 * The most recent midnight in Asia/Kolkata, which is where the daily limit
 * resets. Asia/Kolkata is UTC+5:30 all year, so a fixed offset is exact.
 */
export function istDayStart(now: Date): Date {
  const shifted = new Date(now.getTime() + IST_OFFSET_MINUTES * MINUTE_MS);
  const midnightIst = Date.UTC(
    shifted.getUTCFullYear(),
    shifted.getUTCMonth(),
    shifted.getUTCDate()
  );

  return new Date(midnightIst - IST_OFFSET_MINUTES * MINUTE_MS);
}
