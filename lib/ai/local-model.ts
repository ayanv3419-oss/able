import "server-only";

import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import type { LanguageModel } from "ai";

/**
 * Optional local model (e.g. Qwen2.5-VL served by llama.cpp on the LAN). When
 * LOCAL_MODEL_URL is set it becomes the preferred chat engine, with the
 * Groq/Gemini key pool as an automatic fallback. Everything here is gated on
 * that env var, so a deployment without it behaves exactly as before.
 */

const LOCAL_URL = process.env.LOCAL_MODEL_URL?.trim();
const LOCAL_ID = process.env.LOCAL_MODEL_ID?.trim() || "local";
const LOCAL_API_KEY = process.env.LOCAL_MODEL_API_KEY?.trim();
// Qwen2.5-VL is multimodal; set LOCAL_MODEL_VISION=false for a text-only model.
const VISION_ENABLED =
  (process.env.LOCAL_MODEL_VISION?.trim().toLowerCase() ?? "true") !== "false";

// After a failed local call, skip the box for this long so chats fall back to
// Groq instead of retrying a dead endpoint on every message.
const COOLDOWN_MS = 60_000;
const HEALTH_TIMEOUT_MS = 1500;
let cooldownUntil = 0;
let healthCheckPromise: Promise<boolean> | null = null;

export function isLocalConfigured(): boolean {
  return Boolean(LOCAL_URL);
}

/** True when uploaded images may be sent to the local vision model. */
export function localVisionEnabled(): boolean {
  return isLocalConfigured() && VISION_ENABLED;
}

/** Configured and not currently cooling down after a failure. */
export function isLocalAvailable(): boolean {
  return isLocalConfigured() && Date.now() >= cooldownUntil;
}

export function markLocalFailure(): void {
  cooldownUntil = Date.now() + COOLDOWN_MS;
}

export function markLocalHealthy(): void {
  cooldownUntil = 0;
}

/**
 * Probe the OpenAI-compatible models endpoint before routing a request locally.
 * This keeps a sleeping/offline model box from consuming the student's first
 * request; callers can immediately fall back to the cloud key pool instead.
 */
export async function checkLocalHealth(): Promise<boolean> {
  if (!LOCAL_URL || !isLocalAvailable()) {
    return false;
  }
  if (healthCheckPromise) {
    return healthCheckPromise;
  }

  healthCheckPromise = (async () => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), HEALTH_TIMEOUT_MS);

    try {
      const response = await fetch(`${LOCAL_URL.replace(/\/$/, "")}/models`, {
        headers: LOCAL_API_KEY
          ? { Authorization: `Bearer ${LOCAL_API_KEY}` }
          : undefined,
        method: "GET",
        signal: controller.signal,
      });
      if (!response.ok) {
        throw new Error(
          `Local model health check returned ${response.status}.`
        );
      }
      markLocalHealthy();
      return true;
    } catch {
      markLocalFailure();
      return false;
    } finally {
      clearTimeout(timeout);
    }
  })();

  try {
    return await healthCheckPromise;
  } finally {
    healthCheckPromise = null;
  }
}

let cachedModel: LanguageModel | null = null;

export function localChatModel(): LanguageModel {
  if (!LOCAL_URL) {
    throw new Error("LOCAL_MODEL_URL is not set.");
  }
  if (cachedModel) {
    return cachedModel;
  }
  const provider = createOpenAICompatible({
    apiKey: LOCAL_API_KEY || "no-key",
    baseURL: LOCAL_URL,
    name: "local",
  });
  // @ai-sdk/openai-compatible bundles a newer @ai-sdk/provider than this repo's
  // "ai", so the returned model differs by structural version only. The cast is
  // safe: it is a real LanguageModel the AI SDK drives like any other.
  const model = provider.chatModel(LOCAL_ID) as unknown as LanguageModel;
  cachedModel = model;
  return model;
}
