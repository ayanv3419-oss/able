import "server-only";

import {
  and,
  desc,
  eq,
  getTableColumns,
  isNull,
  or,
  count as sqlCount,
} from "drizzle-orm";
import { ChatbotError } from "../errors";
import { profileSchema, type UserProfile } from "../personalization";
import { db } from "./client";
import { getProject } from "./project-queries";
import { type Memory, memory, project, userSettings } from "./schema";

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
  profile: UserProfile;
};

/**
 * Profiles are validated on the way out, so one malformed row (for example
 * JSON saved as a string) degrades to an empty profile instead of breaking
 * Settings and every chat.
 */
function readProfile(value: unknown): UserProfile {
  let candidate: unknown = value ?? {};
  if (typeof candidate === "string") {
    try {
      candidate = JSON.parse(candidate);
    } catch {
      candidate = {};
    }
  }
  const parsed = profileSchema.safeParse(candidate);
  return parsed.success ? parsed.data : profileSchema.parse({});
}

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
    profile: readProfile(row?.profile),
    responseStyle: row?.responseStyle ?? "",
    userId,
  };
}

/** Saves any subset of the settings, creating the row when it is missing. */
export async function upsertUserSettings({
  aboutMe,
  memoryEnabled,
  responseStyle,
  profile,
  userId,
}: {
  userId: string;
  aboutMe?: string;
  responseStyle?: string;
  memoryEnabled?: boolean;
  profile?: UserProfile;
}): Promise<Personalization> {
  const changes: {
    aboutMe?: string;
    responseStyle?: string;
    memoryEnabled?: boolean;
    profile?: UserProfile;
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
  if (profile !== undefined) {
    changes.profile = profileSchema.parse(profile);
  }

  const [row] = await db
    .insert(userSettings)
    .values({ ...changes, userId })
    .onConflictDoUpdate({ set: changes, target: userSettings.userId })
    .returning();

  return {
    aboutMe: row.aboutMe ?? "",
    memoryEnabled: row.memoryEnabled,
    profile: readProfile(row.profile),
    responseStyle: row.responseStyle ?? "",
    userId,
  };
}

/** Newest first, which is the order the system prompt uses. */
export async function listMemories({
  limit = DEFAULT_MEMORY_PAGE,
  userId,
  contextProjectId,
}: {
  userId: string;
  limit?: number;
  /** Undefined lists all owned memories for Settings; null selects global only. */
  contextProjectId?: string | null;
}): Promise<Array<Memory & { projectName: string | null }>> {
  return await db
    .select({ ...getTableColumns(memory), projectName: project.name })
    .from(memory)
    .leftJoin(project, eq(memory.projectId, project.id))
    .where(
      and(
        eq(memory.userId, userId),
        or(isNull(memory.projectId), eq(project.userId, userId)),
        contextProjectId === undefined
          ? undefined
          : contextProjectId === null
            ? isNull(memory.projectId)
            : or(
                isNull(memory.projectId),
                eq(memory.projectId, contextProjectId)
              )
      )
    )
    .orderBy(desc(memory.createdAt))
    .limit(limit);
}

/** Returns null when the fact is already saved or the student is at the cap. */
export async function addMemory({
  content,
  userId,
  projectId = null,
}: {
  userId: string;
  content: string;
  projectId?: string | null;
}): Promise<Memory | null> {
  if (projectId && !(await getProject({ id: projectId, userId }))) {
    throw new ChatbotError("not_found:project");
  }
  const trimmed = content.trim().slice(0, MEMORY_MAX_LENGTH);

  if (trimmed.length === 0) {
    return null;
  }

  const [duplicate] = await db
    .select({ id: memory.id })
    .from(memory)
    .where(
      and(
        eq(memory.userId, userId),
        eq(memory.content, trimmed),
        projectId ? eq(memory.projectId, projectId) : isNull(memory.projectId)
      )
    )
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
    .values({ content: trimmed, projectId, userId })
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
