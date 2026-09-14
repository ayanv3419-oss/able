import "server-only";

import { asc, eq, ilike, inArray } from "drizzle-orm";
import { db } from "./client";
import {
  attachment,
  chat,
  contextFolder,
  document,
  memory,
  message,
  payment,
  project,
  refundRequest,
  stream,
  studyContext,
  subscription,
  suggestion,
  type User,
  usageEvent,
  user,
  userSettings,
  vote,
} from "./schema";

const DEFAULT_SEARCH_LIMIT = 20;
const LIKE_SPECIAL = /[%_\\]/g;

export async function getUserById(id: string): Promise<User | null> {
  const [row] = await db.select().from(user).where(eq(user.id, id)).limit(1);

  return row ?? null;
}

/** Admin user search by part of an email address. */
export async function searchUsersByEmail({
  limit = DEFAULT_SEARCH_LIMIT,
  query,
}: {
  query: string;
  limit?: number;
}): Promise<User[]> {
  const term = query.trim().replace(LIKE_SPECIAL, (char) => `\\${char}`);

  if (term.length === 0) {
    return [];
  }

  return await db
    .select()
    .from(user)
    .where(ilike(user.email, `%${term}%`))
    .orderBy(asc(user.email))
    .limit(limit);
}

/**
 * Deletes a student's account, per docs/SPEC.md §7. Chats, messages, projects,
 * memories, settings, usage and attachments go; payment records stay with the
 * user link cleared. Child rows go first so no foreign key is left dangling.
 */
export async function deleteUserAccount(userId: string): Promise<void> {
  await db.transaction(async (tx) => {
    const chats = await tx
      .select({ id: chat.id })
      .from(chat)
      .where(eq(chat.userId, userId));
    const chatIds = chats.map((row) => row.id);

    if (chatIds.length > 0) {
      await tx.delete(vote).where(inArray(vote.chatId, chatIds));
      await tx.delete(message).where(inArray(message.chatId, chatIds));
      await tx.delete(stream).where(inArray(stream.chatId, chatIds));
    }

    await tx.delete(suggestion).where(eq(suggestion.userId, userId));
    await tx.delete(document).where(eq(document.userId, userId));
    await tx.delete(chat).where(eq(chat.userId, userId));
    await tx.delete(studyContext).where(eq(studyContext.userId, userId));
    await tx.delete(contextFolder).where(eq(contextFolder.userId, userId));
    await tx.delete(attachment).where(eq(attachment.userId, userId));
    await tx.delete(memory).where(eq(memory.userId, userId));
    await tx.delete(userSettings).where(eq(userSettings.userId, userId));
    await tx.delete(usageEvent).where(eq(usageEvent.userId, userId));
    await tx.delete(project).where(eq(project.userId, userId));
    await tx.delete(refundRequest).where(eq(refundRequest.userId, userId));
    await tx.delete(subscription).where(eq(subscription.userId, userId));
    await tx
      .update(payment)
      .set({ userId: null })
      .where(eq(payment.userId, userId));
    await tx.delete(user).where(eq(user.id, userId));
  });
}
