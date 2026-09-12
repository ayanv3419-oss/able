import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildPersonalizationContext } from "@/lib/ai/personalization-context";
import { type RequestHints, systemPrompt } from "@/lib/ai/prompts";
import { deleteUserAccount } from "@/lib/db/account-queries";
import { db } from "@/lib/db/client";
import {
  addMemory,
  getUserSettings,
  listMemories,
  upsertUserSettings,
} from "@/lib/db/personalization-queries";
import { chat, message, project, user } from "@/lib/db/schema";
import type { UserProfile } from "@/lib/personalization";

const describeDb = process.env.TEST_POSTGRES_URL ? describe : describe.skip;

const hints: RequestHints = {
  city: undefined,
  country: undefined,
  latitude: undefined,
  longitude: undefined,
};

const profile: UserProfile = {
  displayName: "Ayan",
  interests: "",
  learningPreferences: "Practical examples",
  preferredLanguage: "auto",
  responsePreferences: "Clear explanations",
  role: "Student",
};

const textParts = (text: string) => [{ text, type: "text" }];

describeDb("personalized project context through the real database", () => {
  const owner = randomUUID();
  const other = randomUUID();
  const python = randomUUID();
  const business = randomUUID();
  const foreign = randomUUID();
  const current = randomUUID();
  const priorPython = randomUUID();
  const businessChat = randomUUID();
  const foreignChat = randomUUID();
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const build = (currentInput: string, projectId: string | null) =>
    buildPersonalizationContext({
      currentChatId: current,
      currentInput,
      projectId,
      userId: owner,
    });

  beforeAll(async () => {
    await db.insert(user).values([
      { email: `${owner}@context.test`, id: owner },
      { email: `${other}@context.test`, id: other },
    ]);
    await db.insert(project).values([
      {
        id: python,
        instructions: "Act like a coding mentor.",
        name: "Python Learning",
        userId: owner,
      },
      {
        id: business,
        instructions: "Answer like a business consultant.",
        name: "Business Planning",
        userId: owner,
      },
      {
        id: foreign,
        instructions: "Private instructions.",
        name: "Another student's project",
        userId: other,
      },
    ]);
    await db.insert(chat).values([
      {
        createdAt: new Date(),
        id: current,
        projectId: python,
        title: "Today",
        userId: owner,
      },
      {
        createdAt: yesterday,
        id: priorPython,
        projectId: python,
        title: "Python closures",
        userId: owner,
      },
      {
        createdAt: yesterday,
        id: businessChat,
        projectId: business,
        title: "Sales plan",
        userId: owner,
      },
      {
        createdAt: yesterday,
        id: foreignChat,
        projectId: foreign,
        title: "Private",
        userId: other,
      },
    ]);
    await db.insert(message).values([
      {
        attachments: [],
        chatId: priorPython,
        createdAt: yesterday,
        id: randomUUID(),
        parts: textParts("We studied Python closures and captured variables."),
        role: "user",
      },
      {
        attachments: [],
        chatId: businessChat,
        createdAt: yesterday,
        id: randomUUID(),
        parts: textParts("Our confidential quarterly target is fifty lakh."),
        role: "user",
      },
      {
        attachments: [],
        chatId: foreignChat,
        createdAt: yesterday,
        id: randomUUID(),
        parts: textParts("Another student wrote about Python closures."),
        role: "user",
      },
    ]);
    await upsertUserSettings({ profile, userId: owner });
    await addMemory({ content: "I prefer practical examples", userId: owner });
    await addMemory({
      content: "Python closures practice uses Python 3.12",
      projectId: python,
      userId: owner,
    });
    await addMemory({
      content: "Business revenue figures are confidential",
      projectId: business,
      userId: owner,
    });
  });

  afterAll(async () => {
    await deleteUserAccount(owner);
    await deleteUserAccount(other);
  });

  it("assembles profile, project, scoped memories and same-project history", async () => {
    const { context, projectId } = await build(
      "Continue what we were doing yesterday with Python closures",
      python
    );

    expect(projectId).toBe(python);
    expect(context.projectName).toBe("Python Learning");
    expect(context.projectInstructions).toBe("Act like a coding mentor.");
    expect(context.profile.displayName).toBe("Ayan");
    expect(context.projectHistory.map((item) => item.chatId)).toEqual([
      priorPython,
    ]);
    expect(context.projectMemories).toEqual([
      "Python closures practice uses Python 3.12",
    ]);
    expect(context.memories).toContain("I prefer practical examples");

    const prompt = systemPrompt({
      personalization: context,
      requestHints: hints,
    });
    expect(prompt).toContain("Python closures and captured variables");
    expect(prompt).toContain("Act like a coding mentor.");
    expect(prompt).toContain("Ayan");
    expect(prompt).not.toContain("fifty lakh");
    expect(prompt).not.toContain("Business revenue figures");
    expect(prompt).not.toContain("Another student wrote");
  });

  it("ignores a project the student does not own", async () => {
    const { context, projectId } = await build(
      "Explain Python closures",
      foreign
    );

    expect(projectId).toBeNull();
    expect(context.projectName).toBeNull();
    expect(context.projectInstructions).toBeNull();
    expect(context.projectHistory).toEqual([]);
    expect(context.projectMemories).toEqual([]);
  });

  it("keeps project memories out of chats outside that project", async () => {
    const { context } = await build(
      "What do I know about Python closures and business revenue?",
      null
    );

    expect(context.projectMemories).toEqual([]);
    expect(context.projectHistory).toEqual([]);
    expect(context.memories.join(" ")).not.toMatch(/revenue|Python 3\.12/);

    const everything = await listMemories({ userId: owner });
    expect(
      everything.find((item) => item.projectId === python)?.projectName
    ).toBe("Python Learning");
  });

  it("matches the message language and honours a saved preference", async () => {
    const hinglish = await build(
      "Python closures kaise kaam karte hain?",
      python
    );
    expect(hinglish.context.language.language).toBe("Hinglish");

    await upsertUserSettings({
      profile: { ...profile, preferredLanguage: "Gujarati" },
      userId: owner,
    });
    const saved = await build("Explain closures", python);
    expect(saved.context.language).toEqual({
      language: "Gujarati",
      source: "saved preference",
    });
    const explicit = await build("Explain closures in English", python);
    expect(explicit.context.language.language).toBe("English");

    await upsertUserSettings({ profile, userId: owner });
  });

  it("sends no memories when memory is switched off", async () => {
    await upsertUserSettings({ memoryEnabled: false, userId: owner });
    const { context } = await build("Continue Python closures", python);

    expect(context.memories).toEqual([]);
    expect(context.projectMemories).toEqual([]);

    await upsertUserSettings({ memoryEnabled: true, userId: owner });
  });

  it("survives malformed JSON already stored in the database", async () => {
    await db.execute(
      sql`INSERT INTO "Message_v2" (id, "chatId", role, parts, attachments, "createdAt") VALUES (${randomUUID()}, ${priorPython}, 'assistant', '"not a list"'::json, '[]'::json, ${yesterday.toISOString()})`
    );
    await db.execute(
      sql`UPDATE "UserSettings" SET profile = '"{}"'::json WHERE "userId" = ${owner}`
    );

    expect((await getUserSettings(owner)).profile.displayName).toBe("");
    const { context } = await build("Continue Python closures", python);
    expect(context.projectHistory.map((item) => item.chatId)).toContain(
      priorPython
    );

    await upsertUserSettings({ profile, userId: owner });
  });
});
