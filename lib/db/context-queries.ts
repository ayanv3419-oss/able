import "server-only";

import {
  and,
  asc,
  count,
  desc,
  eq,
  getTableColumns,
  gt,
  gte,
} from "drizzle-orm";
import { ChatbotError } from "../errors";
import { istDayStart } from "../metering";
import {
  STUDY_CONTEXT_EDIT_WINDOW_MS,
  STUDY_CONTEXT_MAX_CHARS,
} from "../study-context";
import { db } from "./client";
import {
  attachment,
  type ContextFolder,
  contextFolder,
  type StudyContext,
  studyContext,
  user,
} from "./schema";

const FOLDER_NAME_MAX_LENGTH = 60;
const TITLE_MAX_LENGTH = 120;

function cleanFolderName(name: string): string {
  return name.trim().slice(0, FOLDER_NAME_MAX_LENGTH);
}

function cleanTitle(title: string): string {
  return title.trim().slice(0, TITLE_MAX_LENGTH);
}

export type ContextFolderSummary = ContextFolder & { materialCount: number };

export async function listContextFolders(
  userId: string
): Promise<ContextFolderSummary[]> {
  return await db
    .select({
      ...getTableColumns(contextFolder),
      materialCount: count(studyContext.id),
    })
    .from(contextFolder)
    .leftJoin(studyContext, eq(studyContext.folderId, contextFolder.id))
    .where(eq(contextFolder.userId, userId))
    .groupBy(contextFolder.id)
    .orderBy(asc(contextFolder.name));
}

export async function getContextFolder({
  id,
  userId,
}: {
  id: string;
  userId: string;
}): Promise<ContextFolder | null> {
  const [folder] = await db
    .select()
    .from(contextFolder)
    .where(and(eq(contextFolder.id, id), eq(contextFolder.userId, userId)))
    .limit(1);
  return folder ?? null;
}

export async function createContextFolder({
  name,
  userId,
}: {
  name: string;
  userId: string;
}): Promise<ContextFolder> {
  const [created] = await db
    .insert(contextFolder)
    .values({ name: cleanFolderName(name), userId })
    .returning();
  return created;
}

export async function renameContextFolder({
  id,
  name,
  userId,
}: {
  id: string;
  name: string;
  userId: string;
}): Promise<ContextFolder> {
  const [updated] = await db
    .update(contextFolder)
    .set({ name: cleanFolderName(name), updatedAt: new Date() })
    .where(and(eq(contextFolder.id, id), eq(contextFolder.userId, userId)))
    .returning();
  if (!updated) {
    throw new ChatbotError("not_found:database", "Context folder not found");
  }
  return updated;
}

/** A subject folder is removable only while it has no saved material. */
export async function deleteEmptyContextFolder({
  id,
  userId,
}: {
  id: string;
  userId: string;
}): Promise<ContextFolder> {
  return await db.transaction(async (tx) => {
    const [owned] = await tx
      .select()
      .from(contextFolder)
      .where(and(eq(contextFolder.id, id), eq(contextFolder.userId, userId)))
      .for("update")
      .limit(1);
    if (!owned) {
      throw new ChatbotError("not_found:database", "Context folder not found");
    }
    const [used] = await tx
      .select({ value: count() })
      .from(studyContext)
      .where(eq(studyContext.folderId, id));
    if (used.value > 0) {
      throw new ChatbotError(
        "forbidden:database",
        "Move or remove every Context before deleting this folder."
      );
    }
    const [deleted] = await tx
      .delete(contextFolder)
      .where(eq(contextFolder.id, id))
      .returning();
    return deleted;
  });
}

export async function listStudyContexts({
  folderId,
  userId,
}: {
  folderId: string;
  userId: string;
}): Promise<StudyContext[]> {
  return await db
    .select()
    .from(studyContext)
    .where(
      and(eq(studyContext.folderId, folderId), eq(studyContext.userId, userId))
    )
    .orderBy(desc(studyContext.createdAt));
}

export async function getStudyContext({
  id,
  userId,
}: {
  id: string;
  userId: string;
}): Promise<StudyContext | null> {
  const [material] = await db
    .select()
    .from(studyContext)
    .where(and(eq(studyContext.id, id), eq(studyContext.userId, userId)))
    .limit(1);
  return material ?? null;
}

/** Counts pasted Context and ordinary file uploads against one daily allowance. */
export async function createStudyContextWithinLimit(
  {
    content,
    folderId,
    title,
    userId,
  }: {
    content: string;
    folderId: string;
    title: string;
    userId: string;
  },
  limit: number | null
): Promise<StudyContext | null> {
  if (content.length > STUDY_CONTEXT_MAX_CHARS) {
    throw new ChatbotError("bad_request:database", "Context is too long");
  }
  return await db.transaction(async (tx) => {
    await tx
      .select({ id: user.id })
      .from(user)
      .where(eq(user.id, userId))
      .for("update");
    const [folder] = await tx
      .select({ id: contextFolder.id })
      .from(contextFolder)
      .where(
        and(eq(contextFolder.id, folderId), eq(contextFolder.userId, userId))
      )
      .limit(1);
    if (!folder) {
      throw new ChatbotError("not_found:database", "Context folder not found");
    }
    if (limit !== null) {
      const since = istDayStart(new Date());
      const [[fileUsage], [contextUsage]] = await Promise.all([
        tx
          .select({ value: count() })
          .from(attachment)
          .where(
            and(eq(attachment.userId, userId), gte(attachment.createdAt, since))
          ),
        tx
          .select({ value: count() })
          .from(studyContext)
          .where(
            and(
              eq(studyContext.userId, userId),
              gte(studyContext.createdAt, since)
            )
          ),
      ]);
      if (fileUsage.value + contextUsage.value >= limit) {
        return null;
      }
    }
    const [created] = await tx
      .insert(studyContext)
      .values({ content, folderId, title: cleanTitle(title), userId })
      .returning();
    return created;
  });
}

export async function updateStudyContextWithinWindow({
  content,
  id,
  title,
  userId,
}: {
  content: string;
  id: string;
  title: string;
  userId: string;
}): Promise<StudyContext> {
  const cutoff = new Date(Date.now() - STUDY_CONTEXT_EDIT_WINDOW_MS);
  const [updated] = await db
    .update(studyContext)
    .set({ content, title: cleanTitle(title), updatedAt: new Date() })
    .where(
      and(
        eq(studyContext.id, id),
        eq(studyContext.userId, userId),
        gt(studyContext.createdAt, cutoff)
      )
    )
    .returning();
  if (!updated) {
    throw new ChatbotError(
      "forbidden:database",
      "This Context is locked because its 10-minute edit window has ended."
    );
  }
  return updated;
}

/** Moving only changes organisation, so it remains available after text locks. */
export async function moveStudyContext({
  folderId,
  id,
  userId,
}: {
  folderId: string;
  id: string;
  userId: string;
}): Promise<StudyContext> {
  const target = await getContextFolder({ id: folderId, userId });
  if (!target) {
    throw new ChatbotError("not_found:database", "Context folder not found");
  }
  const [updated] = await db
    .update(studyContext)
    .set({ folderId, updatedAt: new Date() })
    .where(and(eq(studyContext.id, id), eq(studyContext.userId, userId)))
    .returning();
  if (!updated) {
    throw new ChatbotError("not_found:database", "Context not found");
  }
  return updated;
}

export async function deleteStudyContextWithinWindow({
  id,
  userId,
}: {
  id: string;
  userId: string;
}): Promise<StudyContext> {
  const cutoff = new Date(Date.now() - STUDY_CONTEXT_EDIT_WINDOW_MS);
  const [deleted] = await db
    .delete(studyContext)
    .where(
      and(
        eq(studyContext.id, id),
        eq(studyContext.userId, userId),
        gt(studyContext.createdAt, cutoff)
      )
    )
    .returning();
  if (!deleted) {
    throw new ChatbotError(
      "forbidden:database",
      "This Context is locked because its 10-minute edit window has ended."
    );
  }
  return deleted;
}

export async function loadStudyMaterialForChat({
  folderId,
  studyContextId,
  userId,
}: {
  folderId: string | null;
  studyContextId: string | null;
  userId: string;
}): Promise<Array<{ title: string; content: string }>> {
  if (!folderId) {
    return [];
  }
  const where = studyContextId
    ? and(
        eq(studyContext.id, studyContextId),
        eq(studyContext.folderId, folderId),
        eq(studyContext.userId, userId)
      )
    : and(eq(studyContext.folderId, folderId), eq(studyContext.userId, userId));
  return await db
    .select({ content: studyContext.content, title: studyContext.title })
    .from(studyContext)
    .innerJoin(
      contextFolder,
      and(
        eq(contextFolder.id, studyContext.folderId),
        eq(contextFolder.userId, userId)
      )
    )
    .where(where)
    .orderBy(asc(studyContext.createdAt));
}

export async function countStudyContextsSince({
  since,
  userId,
}: {
  since: Date;
  userId: string;
}): Promise<number> {
  const [row] = await db
    .select({ value: count() })
    .from(studyContext)
    .where(
      and(eq(studyContext.userId, userId), gte(studyContext.createdAt, since))
    );
  return row?.value ?? 0;
}

export async function listStudyContextsForUser(userId: string) {
  return await db
    .select({
      createdAt: studyContext.createdAt,
      folderName: contextFolder.name,
      id: studyContext.id,
      title: studyContext.title,
    })
    .from(studyContext)
    .innerJoin(contextFolder, eq(contextFolder.id, studyContext.folderId))
    .where(eq(studyContext.userId, userId))
    .orderBy(desc(studyContext.createdAt));
}

/** Support removal requested by the student; deliberately bypasses the 10-minute lock. */
export async function removeStudyContextBySupport({
  id,
  userId,
}: {
  id: string;
  userId: string;
}): Promise<boolean> {
  const rows = await db
    .delete(studyContext)
    .where(and(eq(studyContext.id, id), eq(studyContext.userId, userId)))
    .returning({ id: studyContext.id });
  return rows.length > 0;
}
