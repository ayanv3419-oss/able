import "server-only";

import { and, eq, inArray } from "drizzle-orm";
import { db } from "./client";
import { type Attachment, attachment } from "./schema";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Uploads are stored as extracted text, never as files. */
export async function createAttachment({
  chatId,
  mediaType,
  name,
  text,
  userId,
}: {
  userId: string;
  chatId?: string | null;
  name: string;
  mediaType: string;
  text: string;
}): Promise<Attachment> {
  const [created] = await db
    .insert(attachment)
    .values({
      charCount: text.length,
      chatId: chatId ?? null,
      mediaType,
      name,
      text,
      userId,
    })
    .returning();

  return created;
}

/**
 * Loads attachments by id, but only the ones that belong to this student. The
 * chat route uses this before swapping `attachment://<id>` parts for text.
 */
export async function getAttachments({
  ids,
  userId,
}: {
  ids: string[];
  userId: string;
}): Promise<Attachment[]> {
  const valid = ids.filter((id) => UUID.test(id));

  if (valid.length === 0) {
    return [];
  }

  return await db
    .select()
    .from(attachment)
    .where(and(inArray(attachment.id, valid), eq(attachment.userId, userId)));
}
