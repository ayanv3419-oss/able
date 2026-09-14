import "server-only";

import { and, count, eq, gte, inArray } from "drizzle-orm";
import { istDayStart } from "../metering";
import { db } from "./client";
import { type Attachment, attachment, studyContext, user } from "./schema";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Count and insert under one student lock, including simultaneous uploads. */
export async function createAttachmentWithinLimit(
  input: Parameters<typeof createAttachment>[0],
  limit: number | null
): Promise<Attachment | null> {
  return await db.transaction(async (tx) => {
    await tx
      .select({ id: user.id })
      .from(user)
      .where(eq(user.id, input.userId))
      .for("update");
    if (limit !== null) {
      const since = istDayStart(new Date());
      const [[files], [contexts]] = await Promise.all([
        tx
          .select({ value: count() })
          .from(attachment)
          .where(
            and(
              eq(attachment.userId, input.userId),
              gte(attachment.createdAt, since)
            )
          ),
        tx
          .select({ value: count() })
          .from(studyContext)
          .where(
            and(
              eq(studyContext.userId, input.userId),
              gte(studyContext.createdAt, since)
            )
          ),
      ]);
      if (files.value + contexts.value >= limit) {
        return null;
      }
    }
    const [created] = await tx
      .insert(attachment)
      .values({
        ...input,
        charCount: input.text.length,
        chatId: input.chatId ?? null,
      })
      .returning();
    return created;
  });
}

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

/** How many files this student has uploaded since the given moment. */
export async function countAttachmentsSince({
  since,
  userId,
}: {
  since: Date;
  userId: string;
}): Promise<number> {
  const [row] = await db
    .select({ value: count() })
    .from(attachment)
    .where(
      and(eq(attachment.userId, userId), gte(attachment.createdAt, since))
    );
  return row?.value ?? 0;
}
