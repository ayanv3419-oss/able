import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { deleteUserAccount } from "@/lib/db/account-queries";
import { db } from "@/lib/db/client";
import {
  countChatsInProject,
  deleteProject,
  getProject,
  listChatsInProject,
  listProjects,
  setChatProject,
  updateProject,
} from "@/lib/db/project-queries";
import { chat, project, user } from "@/lib/db/schema";

const describeDb = process.env.TEST_POSTGRES_URL ? describe : describe.skip;

describeDb("project navigation ownership and persistence", () => {
  const owner = randomUUID();
  const other = randomUUID();
  const folder = randomUUID();
  const empty = randomUUID();
  const foreign = randomUUID();
  const firstChat = randomUUID();
  const secondChat = randomUUID();
  const foreignChat = randomUUID();

  beforeAll(async () => {
    await db.insert(user).values([
      { email: `${owner}@projects.test`, id: owner },
      { email: `${other}@projects.test`, id: other },
    ]);
    await db.insert(project).values([
      {
        id: folder,
        instructions: "Use SI units.",
        name: "Biology",
        userId: owner,
      },
      { id: empty, name: "Empty", userId: owner },
      { id: foreign, name: "Private project", userId: other },
    ]);
    await db.insert(chat).values([
      {
        createdAt: new Date("2026-09-10T10:00:00Z"),
        id: firstChat,
        projectId: folder,
        title: "Cells",
        userId: owner,
      },
      {
        createdAt: new Date("2026-09-11T10:00:00Z"),
        id: secondChat,
        projectId: folder,
        title: "Genetics",
        userId: owner,
      },
      // The schema permits cross-owner references. Readers must still enforce both owners.
      {
        createdAt: new Date(),
        id: foreignChat,
        projectId: folder,
        title: "Foreign chat",
        userId: other,
      },
      {
        createdAt: new Date(),
        projectId: foreign,
        title: "Wrong folder owner",
        userId: owner,
      },
    ]);
  });

  afterAll(async () => {
    await deleteUserAccount(owner);
    await deleteUserAccount(other);
    await db.$client.end();
  });

  it("lists only owned projects and counts only their owned conversations", async () => {
    const projects = await listProjects(owner);
    expect(projects.map((item) => item.id).sort()).toEqual(
      [folder, empty].sort()
    );
    expect(
      await countChatsInProject({ projectId: folder, userId: owner })
    ).toBe(2);
  });

  it("preserves existing IDs, titles, timestamps and order without copying chats", async () => {
    const chats = await listChatsInProject({
      projectId: folder,
      userId: owner,
    });
    expect(chats.map((item) => item.id)).toEqual([secondChat, firstChat]);
    expect(chats[1].title).toBe("Cells");
    expect(chats[1].createdAt.toISOString()).toBe("2026-09-10T10:00:00.000Z");
    expect(
      await listChatsInProject({ projectId: folder, userId: owner })
    ).toEqual(chats);
    expect(
      await listChatsInProject({ projectId: empty, userId: owner })
    ).toEqual([]);
  });

  it("blocks foreign projects and even owned chats linked to a foreign project", async () => {
    expect(await getProject({ id: foreign, userId: owner })).toBeNull();
    expect(
      await listChatsInProject({ projectId: foreign, userId: owner })
    ).toEqual([]);
    expect(
      await countChatsInProject({ projectId: foreign, userId: owner })
    ).toBe(0);
    expect(
      await listChatsInProject({ projectId: folder, userId: other })
    ).toEqual([]);
  });

  it("rejects moving another user's chat or moving to another user's project", async () => {
    await expect(
      setChatProject({ chatId: firstChat, projectId: foreign, userId: owner })
    ).rejects.toThrow();
    await expect(
      setChatProject({ chatId: foreignChat, projectId: empty, userId: owner })
    ).rejects.toThrow();
  });

  it("reflects moving and removing the existing chat", async () => {
    await setChatProject({
      chatId: firstChat,
      projectId: empty,
      userId: owner,
    });
    expect(
      await countChatsInProject({ projectId: folder, userId: owner })
    ).toBe(1);
    expect(
      (await listChatsInProject({ projectId: empty, userId: owner }))[0].id
    ).toBe(firstChat);
    await setChatProject({ chatId: firstChat, projectId: null, userId: owner });
    expect(await countChatsInProject({ projectId: empty, userId: owner })).toBe(
      0
    );
  });

  it("keeps rename, instructions and delete-without-chat-loss working", async () => {
    await updateProject({
      id: folder,
      instructions: "Keep citations.",
      name: "Biology revision",
      userId: owner,
    });
    expect(await getProject({ id: folder, userId: owner })).toMatchObject({
      instructions: "Keep citations.",
      name: "Biology revision",
    });
    await expect(
      updateProject({ id: foreign, name: "Blocked", userId: owner })
    ).rejects.toThrow();
    await expect(
      deleteProject({ id: foreign, userId: owner })
    ).rejects.toThrow();
    await deleteProject({ id: folder, userId: owner });
    const [kept] = await db.select().from(chat).where(eq(chat.id, secondChat));
    expect(kept).toMatchObject({ projectId: null, title: "Genetics" });
    expect(await getProject({ id: folder, userId: owner })).toBeNull();
  });
});
