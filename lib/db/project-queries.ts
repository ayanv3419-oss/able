import "server-only";

import { and, desc, eq, count as sqlCount } from "drizzle-orm";
import { ChatbotError } from "../errors";
import { db } from "./client";
import { type Chat, chat, type Project, project } from "./schema";

const NAME_MAX_LENGTH = 60;

function cleanName(name: string): string {
  return name.trim().slice(0, NAME_MAX_LENGTH);
}

export async function listProjects(userId: string): Promise<Project[]> {
  return await db
    .select()
    .from(project)
    .where(eq(project.userId, userId))
    .orderBy(desc(project.updatedAt));
}

export async function countProjects(userId: string): Promise<number> {
  const [row] = await db
    .select({ value: sqlCount() })
    .from(project)
    .where(eq(project.userId, userId));

  return row?.value ?? 0;
}

export async function getProject({
  id,
  userId,
}: {
  id: string;
  userId: string;
}): Promise<Project | null> {
  const [row] = await db
    .select()
    .from(project)
    .where(and(eq(project.id, id), eq(project.userId, userId)))
    .limit(1);

  return row ?? null;
}

/**
 * Creates a folder. The caller must check the plan's folder limit first with
 * canCreateProject from lib/entitlements; checking it here would make the
 * entitlement and project modules import each other.
 */
export async function createProject({
  instructions,
  name,
  userId,
}: {
  userId: string;
  name: string;
  instructions?: string | null;
}): Promise<Project> {
  const [created] = await db
    .insert(project)
    .values({
      instructions: instructions ?? null,
      name: cleanName(name),
      userId,
    })
    .returning();

  return created;
}

export async function updateProject({
  id,
  instructions,
  name,
  userId,
}: {
  id: string;
  userId: string;
  name?: string;
  instructions?: string | null;
}): Promise<Project> {
  const [updated] = await db
    .update(project)
    .set({
      ...(name === undefined ? {} : { name: cleanName(name) }),
      ...(instructions === undefined ? {} : { instructions }),
      updatedAt: new Date(),
    })
    .where(and(eq(project.id, id), eq(project.userId, userId)))
    .returning();

  if (!updated) {
    throw new ChatbotError("not_found:project");
  }

  return updated;
}

/** Deleting a folder moves its chats out of it. It never deletes chats. */
export async function deleteProject({
  id,
  userId,
}: {
  id: string;
  userId: string;
}): Promise<Project> {
  return await db.transaction(async (tx) => {
    const [existing] = await tx
      .select()
      .from(project)
      .where(and(eq(project.id, id), eq(project.userId, userId)))
      .limit(1);

    if (!existing) {
      throw new ChatbotError("not_found:project");
    }

    await tx
      .update(chat)
      .set({ projectId: null })
      .where(and(eq(chat.projectId, id), eq(chat.userId, userId)));

    const [deleted] = await tx
      .delete(project)
      .where(eq(project.id, id))
      .returning();

    return deleted;
  });
}

/** Moves a chat into a folder, or out of one when projectId is null. */
export async function setChatProject({
  chatId,
  projectId,
  userId,
}: {
  chatId: string;
  userId: string;
  projectId: string | null;
}): Promise<Chat> {
  if (projectId !== null) {
    const owned = await getProject({ id: projectId, userId });

    if (!owned) {
      throw new ChatbotError("not_found:project");
    }
  }

  const [updated] = await db
    .update(chat)
    .set({ projectId })
    .where(and(eq(chat.id, chatId), eq(chat.userId, userId)))
    .returning();

  if (!updated) {
    throw new ChatbotError("not_found:chat");
  }

  return updated;
}

export async function listChatsInProject({
  projectId,
  userId,
}: {
  projectId: string;
  userId: string;
}): Promise<Chat[]> {
  return await db
    .select()
    .from(chat)
    .where(and(eq(chat.projectId, projectId), eq(chat.userId, userId)))
    .orderBy(desc(chat.createdAt));
}
