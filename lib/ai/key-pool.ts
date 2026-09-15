import "server-only";

import { createGoogleGenerativeAI, type GoogleProvider } from "@ai-sdk/google";
import { createGroq, type GroqProvider } from "@ai-sdk/groq";
import { APICallError, generateText } from "ai";
import { createClient } from "redis";
import {
  decryptSecret,
  EncryptionConfigurationError,
  fingerprintSecret,
} from "@/lib/crypto";
import {
  type ApiKeyFailureKind,
  type ApiKeyProvider,
  clearApiKeyFailure,
  listActiveApiKeys,
  recordApiKeyFailure,
} from "@/lib/db/api-key-queries";
import { CHAT_MODEL_ID, GEMINI_MODEL_ID, TITLE_MODEL_ID } from "./models";

const GROQ_COOLDOWN_SECONDS = 60;
const GEMINI_COOLDOWN_SECONDS = 6 * 60 * 60;
const INVALID_ENV_COOLDOWN_SECONDS = 6 * 60 * 60;

type StoredCredential = {
  encrypted: string;
  fingerprint: string;
  id: string;
};

type EnvCredential = {
  id: "env";
  plain: string;
  fingerprint: string;
};

type Credential = StoredCredential | EnvCredential;

export type SelectedAIKey =
  | { client: GroqProvider; keyId: string; provider: "groq" }
  | { client: GoogleProvider; keyId: string; provider: "gemini" };

export class KeyPoolUnavailableError extends Error {
  constructor() {
    super("No AI provider key is currently available.");
    this.name = "KeyPoolUnavailableError";
  }
}

const memoryCooldowns = new Map<string, number>();
const createPoolRedisClient = () =>
  createClient({ url: process.env.REDIS_URL });
type PoolRedisClient = ReturnType<typeof createPoolRedisClient>;
let redisPromise: Promise<PoolRedisClient | null> | null = null;

function cooldownKey(keyId: string) {
  return `keypool:cooldown:${keyId}`;
}

function selectionId(selection: Pick<SelectedAIKey, "keyId" | "provider">) {
  return `${selection.provider}:${selection.keyId}`;
}

function getRedis() {
  if (!process.env.REDIS_URL) {
    return null;
  }
  if (!redisPromise) {
    redisPromise = (async () => {
      const client = createPoolRedisClient();
      client.on("error", () => undefined);
      try {
        await client.connect();
        return client;
      } catch {
        redisPromise = null;
        return null;
      }
    })();
  }
  return redisPromise;
}

function isMemoryCooling(keyId: string) {
  const expiresAt = memoryCooldowns.get(keyId);
  if (!expiresAt) {
    return false;
  }
  if (expiresAt <= Date.now()) {
    memoryCooldowns.delete(keyId);
    return false;
  }
  return true;
}

/** Pure selection helper used by unit tests and the no-Redis fallback. */
export function pickAvailableCredential<T extends { id: string }>(
  credentials: T[],
  coolingIds: ReadonlySet<string>,
  cursor: number
): T | null {
  const available = credentials.filter((item) => !coolingIds.has(item.id));
  if (!available.length) {
    return null;
  }
  return available[
    ((cursor % available.length) + available.length) % available.length
  ];
}

async function pickCredential(
  provider: ApiKeyProvider,
  credentials: Credential[]
): Promise<Credential | null> {
  const redis = await getRedis();
  if (redis?.isReady) {
    try {
      const cooling = await Promise.all(
        credentials.map(async (item) =>
          (await redis.exists(cooldownKey(item.id))) ? item.id : null
        )
      );
      const cursor = await redis.incr(`keypool:cursor:${provider}`);
      return pickAvailableCredential(
        credentials,
        new Set(cooling.filter((id): id is string => Boolean(id))),
        cursor - 1
      );
    } catch {
      // Redis is authoritative when healthy; a transient outage falls back to
      // this process so local development and requests can still proceed.
    }
  }

  const cooling = new Set(
    credentials
      .filter((item) => isMemoryCooling(item.id))
      .map((item) => item.id)
  );
  return pickAvailableCredential(
    credentials,
    cooling,
    Math.floor(Math.random() * Math.max(credentials.length, 1))
  );
}

async function setCooldown(keyId: string, seconds: number) {
  const redis = await getRedis();
  if (redis?.isReady) {
    try {
      await redis.set(cooldownKey(keyId), "1", {
        expiration: { type: "EX", value: seconds },
      });
      return;
    } catch {
      // Fall through to the best-effort process-local cooldown.
    }
  }
  memoryCooldowns.set(keyId, Date.now() + seconds * 1000);
}

async function credentialsFor(provider: ApiKeyProvider): Promise<Credential[]> {
  const stored: Credential[] = await listActiveApiKeys(provider);
  if (provider !== "groq") {
    return stored;
  }
  const envKey = process.env.GROQ_API_KEY?.trim();
  if (!envKey) {
    return stored;
  }
  const fingerprint = fingerprintSecret(envKey);
  if (stored.some((item) => item.fingerprint === fingerprint)) {
    return stored;
  }
  return [...stored, { fingerprint, id: "env", plain: envKey }];
}

async function selectProviderKey(
  provider: ApiKeyProvider,
  excluded: ReadonlySet<string>
): Promise<SelectedAIKey | null> {
  const credentials = (await credentialsFor(provider)).filter(
    (item) => !excluded.has(`${provider}:${item.id}`)
  );

  while (credentials.length) {
    // biome-ignore lint/performance/noAwaitInLoops: Invalid encrypted rows are disabled and selection must continue sequentially.
    const credential = await pickCredential(provider, credentials);
    if (!credential) {
      return null;
    }
    const index = credentials.findIndex((item) => item.id === credential.id);
    credentials.splice(index, 1);
    let secret: string;
    try {
      secret =
        "plain" in credential
          ? credential.plain
          : decryptSecret(credential.encrypted);
    } catch (error) {
      if (error instanceof EncryptionConfigurationError) {
        throw error;
      }
      if (credential.id !== "env") {
        await recordApiKeyFailure({ id: credential.id, kind: "invalid" });
      }
      continue;
    }

    return provider === "groq"
      ? {
          client: createGroq({ apiKey: secret }),
          keyId: credential.id,
          provider,
        }
      : {
          client: createGoogleGenerativeAI({ apiKey: secret }),
          keyId: credential.id,
          provider,
        };
  }
  return null;
}

/** Chooses Groq first and uses Gemini only for text-only work. */
export async function selectAIKey({
  allowGemini = true,
  excluded = new Set<string>(),
}: {
  allowGemini?: boolean;
  excluded?: ReadonlySet<string>;
} = {}): Promise<SelectedAIKey> {
  const groq = await selectProviderKey("groq", excluded);
  if (groq) {
    return groq;
  }
  if (allowGemini) {
    const gemini = await selectProviderKey("gemini", excluded);
    if (gemini) {
      return gemini;
    }
  }
  throw new KeyPoolUnavailableError();
}

export function classifyProviderError(
  error: unknown
): ApiKeyFailureKind | null {
  if (!APICallError.isInstance(error)) {
    return null;
  }
  if (error.statusCode === 401 || error.statusCode === 403) {
    return "invalid";
  }
  return error.statusCode === 429 ? "throttled" : null;
}

export async function markAIKeyFailure(
  selection: Pick<SelectedAIKey, "keyId" | "provider">,
  error: unknown
) {
  const kind = classifyProviderError(error);
  if (!kind) {
    return false;
  }
  const cooldownSeconds =
    kind === "invalid" && selection.keyId === "env"
      ? INVALID_ENV_COOLDOWN_SECONDS
      : selection.provider === "groq"
        ? GROQ_COOLDOWN_SECONDS
        : GEMINI_COOLDOWN_SECONDS;
  await setCooldown(selection.keyId, cooldownSeconds);
  if (selection.keyId !== "env") {
    await recordApiKeyFailure({ id: selection.keyId, kind });
  }
  return true;
}

export async function markAIKeyHealthy(
  selection: Pick<SelectedAIKey, "keyId">
) {
  if (selection.keyId !== "env") {
    await clearApiKeyFailure(selection.keyId);
  }
}

/** Retries only key-specific failures, moving through Groq then Gemini. */
export async function withAIKeyFailover<T>(
  operation: (selection: SelectedAIKey) => Promise<T>,
  { allowGemini = true }: { allowGemini?: boolean } = {}
): Promise<T> {
  const excluded = new Set<string>();
  let lastError: unknown;
  for (;;) {
    let selection: SelectedAIKey;
    try {
      // biome-ignore lint/performance/noAwaitInLoops: Provider failover must wait for the previous key's failure classification.
      selection = await selectAIKey({ allowGemini, excluded });
    } catch (error) {
      throw lastError ?? error;
    }
    excluded.add(selectionId(selection));
    try {
      const result = await operation(selection);
      await markAIKeyHealthy(selection);
      return result;
    } catch (error) {
      if (!(await markAIKeyFailure(selection, error))) {
        throw error;
      }
      lastError = error;
    }
  }
}

/** Makes a tiny direct call before a contributed key is encrypted and saved. */
export async function validateContributedKey(
  provider: ApiKeyProvider,
  secret: string
) {
  const model =
    provider === "groq"
      ? createGroq({ apiKey: secret })(TITLE_MODEL_ID)
      : createGoogleGenerativeAI({ apiKey: secret })(GEMINI_MODEL_ID);
  await generateText({
    maxOutputTokens: 4,
    maxRetries: 0,
    model,
    prompt: "Reply with OK.",
  });
}

export function modelForSelection(
  selection: SelectedAIKey,
  purpose: "chat" | "title"
) {
  if (selection.provider === "gemini") {
    return selection.client(GEMINI_MODEL_ID);
  }
  return selection.client(purpose === "chat" ? CHAT_MODEL_ID : TITLE_MODEL_ID);
}
