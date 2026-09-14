import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { deleteUserAccount } from "@/lib/db/account-queries";
import { createAttachmentWithinLimit } from "@/lib/db/attachment-queries";
import { db } from "@/lib/db/client";
import {
  createContextFolder,
  createStudyContextWithinLimit,
  deleteEmptyContextFolder,
  deleteStudyContextWithinWindow,
  getContextFolder,
  getStudyContext,
  loadStudyMaterialForChat,
  moveStudyContext,
  removeStudyContextBySupport,
  updateStudyContextWithinWindow,
} from "@/lib/db/context-queries";
import { contextFolder, studyContext, user } from "@/lib/db/schema";

const describeDb = process.env.TEST_POSTGRES_URL ? describe : describe.skip;

describeDb("saved Study Context persistence", () => {
  const owner = randomUUID();
  const other = randomUUID();
  let firstFolder = "";
  let secondFolder = "";

  beforeAll(async () => {
    await db.insert(user).values([
      { email: `${owner}@context.test`, id: owner },
      { email: `${other}@context.test`, id: other },
    ]);
    firstFolder = (
      await createContextFolder({ name: "Physics", userId: owner })
    ).id;
    secondFolder = (
      await createContextFolder({ name: "Revision", userId: owner })
    ).id;
  });

  afterAll(async () => {
    await deleteUserAccount(owner);
    await deleteUserAccount(other);
    await db.$client.end();
  });

  it("shares one daily allowance with ordinary file uploads", async () => {
    const attachment = await createAttachmentWithinLimit(
      {
        mediaType: "text/plain",
        name: "notes.txt",
        text: "First upload",
        userId: owner,
      },
      2
    );
    expect(attachment).not.toBeNull();
    const material = await createStudyContextWithinLimit(
      {
        content: "Second upload",
        folderId: firstFolder,
        title: "Mechanics",
        userId: owner,
      },
      2
    );
    expect(material).not.toBeNull();
    expect(
      await createStudyContextWithinLimit(
        {
          content: "Over the cap",
          folderId: firstFolder,
          title: "Waves",
          userId: owner,
        },
        2
      )
    ).toBeNull();
  });

  it("enforces ownership when reading material for a chat", async () => {
    const material = await createStudyContextWithinLimit(
      {
        content: "Private study notes",
        folderId: firstFolder,
        title: "Optics",
        userId: owner,
      },
      null
    );
    expect(
      await loadStudyMaterialForChat({
        folderId: firstFolder,
        studyContextId: material?.id ?? null,
        userId: owner,
      })
    ).toEqual([{ content: "Private study notes", title: "Optics" }]);
    expect(
      await loadStudyMaterialForChat({
        folderId: firstFolder,
        studyContextId: material?.id ?? null,
        userId: other,
      })
    ).toEqual([]);
  });

  it("locks text and deletion after ten minutes but still permits moving", async () => {
    const id = randomUUID();
    await db.insert(studyContext).values({
      content: "Locked notes",
      createdAt: new Date(Date.now() - 11 * 60 * 1000),
      folderId: firstFolder,
      id,
      title: "Old notes",
      userId: owner,
    });
    await expect(
      updateStudyContextWithinWindow({
        content: "Changed",
        id,
        title: "Changed",
        userId: owner,
      })
    ).rejects.toThrow();
    await expect(
      deleteStudyContextWithinWindow({ id, userId: owner })
    ).rejects.toThrow();
    await moveStudyContext({ folderId: secondFolder, id, userId: owner });
    expect(await getStudyContext({ id, userId: owner })).toMatchObject({
      folderId: secondFolder,
      title: "Old notes",
    });
    expect(await removeStudyContextBySupport({ id, userId: owner })).toBe(true);
  });

  it("deletes only empty folders", async () => {
    await expect(
      deleteEmptyContextFolder({ id: firstFolder, userId: owner })
    ).rejects.toThrow();
    const materials = await db
      .select({ id: studyContext.id })
      .from(studyContext)
      .where(eq(studyContext.folderId, firstFolder));
    await Promise.all(
      materials.map((material) =>
        removeStudyContextBySupport({ id: material.id, userId: owner })
      )
    );
    await deleteEmptyContextFolder({ id: firstFolder, userId: owner });
    expect(
      await getContextFolder({ id: firstFolder, userId: owner })
    ).toBeNull();
    const [kept] = await db
      .select()
      .from(contextFolder)
      .where(eq(contextFolder.id, secondFolder));
    expect(kept).toBeDefined();
  });
});
