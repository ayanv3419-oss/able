import "server-only";

import { and, desc, eq, count as sqlCount } from "drizzle-orm";
import { db } from "./client";
import { type Memory, memory, userSettings } from "./schema";

/** A student may keep this many memories. */
export const MEMORY_LIMIT = 100;
export const MEMORY_MAX_LENGTH = 500;
const INSTRUCTIONS_MAX_LENGTH = 1500;
const DEFAULT_MEMORY_PAGE = 50;

export type Personalization = {
  userId: string;
  aboutMe: string;
  responseStyle: string;
  memoryEnabled: boolean;
};

/** Custom instructions and the memory switch, with defaults for a new student. */
export async function getUserSettings(
  userId: string
): Promise<Personalization> {
  const [row] = await db
    .select()
    .from(userSettings)
    .where(eq(userSettings.userId, userId))
    .limit(1);

  return {
    aboutMe: row?.aboutMe ?? "",
    memoryEnabled: row?.memoryEnabled ?? true,
    responseStyle: row?.responseStyle ?? "",
    userId,
  };
}

/** Saves any subset of the settings, creating the row when it is missing. */
export async function upsertUserSettings({
  aboutMe,
  memoryEnabled,
  responseStyle,
  userId,
}: {
  userId: string;
  aboutMe?: string;
  responseStyle?: string;
  memoryEnabled?: boolean;
}): Promise<Personalization> {
  const changes: {
    aboutMe?: string;
    responseStyle?: string;
    memoryEnabled?: boolean;
    updatedAt: Date;
  } = { updatedAt: new Date() };

  if (aboutMe !== undefined) {
    changes.aboutMe = aboutMe.slice(0, INSTRUCTIONS_MAX_LENGTH);
  }

  if (responseStyle !== undefined) {
    changes.responseStyle = responseStyle.slice(0, INSTRUCTIONS_MAX_LENGTH);
  }

  if (memoryEnabled !== undefined) {
    changes.memoryEnabled = memoryEnabled;
  }

  const [row] = await db
    .insert(userSettings)
    .values({ ...changes, userId })
    .onConflictDoUpdate({ set: changes, target: userSettings.userId })
    .returning();

  return {
    aboutMe: row.aboutMe ?? "",
    memoryEnabled: row.memoryEnabled,
    responseStyle: row.responseStyle ?? "",
    userId,
  };
}

/** Newest first, which is the order the system prompt uses. */
export async function listMemories({
  limit = DEFAULT_MEMORY_PAGE,
  userId,
}: {
  userId: string;
  limit?: number;
}): Promise<Memory[]> {
  return await db
    .select()
    .from(memory)
    .where(eq(memory.userId, userId))
    .orderBy(desc(memory.createdAt))
    .limit(limit);
}

/** Returns null when the fact is already saved or the student is at the cap. */
export async function addMemory({
  content,
  userId,
}: {
  userId: string;
  content: string;
}): Promise<Memory | null> {
  const trimmed = content.trim().slice(0, MEMORY_MAX_LENGTH);

  if (trimmed.length === 0) {
    return null;
  }

  const [duplicate] = await db
    .select({ id: memory.id })
    .from(memory)
    .where(and(eq(memory.userId, userId), eq(memory.content, trimmed)))
    .limit(1);

  if (duplicate) {
    return null;
  }

  const [counted] = await db
    .select({ value: sqlCount() })
    .from(memory)
    .where(eq(memory.userId, userId));

  if ((counted?.value ?? 0) >= MEMORY_LIMIT) {
    return null;
  }

  const [created] = await db
    .insert(memory)
    .values({ content: trimmed, userId })
    .returning();

  return created;
}

export async function deleteMemory({
  id,
  userId,
}: {
  id: string;
  userId: string;
}): Promise<boolean> {
  const deleted = await db
    .delete(memory)
    .where(and(eq(memory.id, id), eq(memory.userId, userId)))
    .returning({ id: memory.id });

  return deleted.length > 0;
}

export async function deleteAllMemories(userId: string): Promise<number> {
  const deleted = await db
    .delete(memory)
    .where(eq(memory.userId, userId))
    .returning({ id: memory.id });

  return deleted.length;
}
