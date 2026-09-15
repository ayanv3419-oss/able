import "server-only";

import { and, asc, eq } from "drizzle-orm";
import { db } from "./client";
import { apiKey, type NewApiKey } from "./schema";

export type ApiKeyProvider = "groq" | "gemini";
export type ApiKeyFailureKind = "invalid" | "throttled";

export function listActiveApiKeys(provider: ApiKeyProvider) {
  return db
    .select({
      encrypted: apiKey.encrypted,
      fingerprint: apiKey.fingerprint,
      id: apiKey.id,
    })
    .from(apiKey)
    .where(and(eq(apiKey.provider, provider), eq(apiKey.status, "active")))
    .orderBy(asc(apiKey.createdAt));
}

export function listUserApiKeys(userId: string) {
  return db
    .select({
      createdAt: apiKey.createdAt,
      id: apiKey.id,
      label: apiKey.label,
      preview: apiKey.preview,
      provider: apiKey.provider,
      status: apiKey.status,
    })
    .from(apiKey)
    .where(eq(apiKey.userId, userId))
    .orderBy(asc(apiKey.createdAt));
}

export async function insertApiKey(values: NewApiKey) {
  const [created] = await db.insert(apiKey).values(values).returning({
    id: apiKey.id,
  });
  return created;
}

export async function removeApiKey({
  id,
  userId,
}: {
  id: string;
  userId: string;
}) {
  await db
    .delete(apiKey)
    .where(and(eq(apiKey.id, id), eq(apiKey.userId, userId)));
}

export async function recordApiKeyFailure({
  id,
  kind,
}: {
  id: string;
  kind: ApiKeyFailureKind;
}) {
  await db
    .update(apiKey)
    .set({
      lastFailureAt: new Date(),
      lastFailureKind: kind,
      status: kind === "invalid" ? "disabled" : "active",
      updatedAt: new Date(),
    })
    .where(eq(apiKey.id, id));
}

export async function clearApiKeyFailure(id: string) {
  await db
    .update(apiKey)
    .set({ lastFailureAt: null, lastFailureKind: null, updatedAt: new Date() })
    .where(eq(apiKey.id, id));
}
