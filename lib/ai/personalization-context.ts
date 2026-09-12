import "server-only";

import { and, desc, eq, inArray, ne, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  getUserSettings,
  listMemories,
} from "@/lib/db/personalization-queries";
import { getProject } from "@/lib/db/project-queries";
import { chat, message, project } from "@/lib/db/schema";
import {
  responseLanguage,
  selectProjectHistory,
  selectRelevantMemories,
} from "@/lib/personalization";

/** Read bounded excerpts from the same owner's other conversations in this project. */
export async function loadProjectHistory({
  userId,
  projectId,
  currentChatId,
}: {
  userId: string;
  projectId: string;
  currentChatId: string;
}) {
  return await db
    .select({
      chatId: chat.id,
      createdAt: message.createdAt,
      role: message.role,
      text: sql<string>`left(coalesce((select string_agg(part->>'text', E'\n') from json_array_elements(case when json_typeof(${message.parts}) = 'array' then ${message.parts} else '[]'::json end) as part where part->>'type' = 'text'), ''), 4000)`,
      title: chat.title,
    })
    .from(message)
    .innerJoin(chat, eq(message.chatId, chat.id))
    .innerJoin(project, eq(chat.projectId, project.id))
    .where(
      and(
        eq(project.id, projectId),
        eq(project.userId, userId),
        eq(chat.userId, userId),
        ne(chat.id, currentChatId),
        inArray(message.role, ["user", "assistant"])
      )
    )
    .orderBy(desc(message.createdAt))
    .limit(80);
}

export async function buildPersonalizationContext({
  userId,
  projectId,
  currentChatId,
  currentInput,
  conversationHint = "",
}: {
  userId: string;
  projectId: string | null;
  currentChatId: string;
  currentInput: string;
  conversationHint?: string;
}) {
  const [settings, selectedProject] = await Promise.all([
    getUserSettings(userId),
    projectId ? getProject({ id: projectId, userId }) : Promise.resolve(null),
  ]);
  const ownedProjectId = selectedProject?.id ?? null;
  const [memories, history] = await Promise.all([
    settings.memoryEnabled
      ? listMemories({ contextProjectId: ownedProjectId, limit: 100, userId })
      : Promise.resolve([]),
    ownedProjectId
      ? loadProjectHistory({ currentChatId, projectId: ownedProjectId, userId })
      : Promise.resolve([]),
  ]);
  const relevant = selectRelevantMemories(
    memories,
    `${currentInput}\n${selectedProject?.name ?? ""}\n${conversationHint.slice(-1500)}`,
    ownedProjectId
  );
  return {
    context: {
      aboutMe: settings.aboutMe,
      language: responseLanguage(
        currentInput,
        settings.profile.preferredLanguage
      ),
      memories: relevant
        .filter((item) => !item.projectId)
        .map((item) => item.content),
      profile: settings.profile,
      projectHistory: selectProjectHistory(
        history,
        `${currentInput}\n${conversationHint.slice(-1500)}`
      ).map((item) => ({ ...item, createdAt: item.createdAt.toISOString() })),
      projectInstructions: selectedProject?.instructions ?? null,
      projectMemories: relevant
        .filter(
          (item) => item.projectId === ownedProjectId && item.projectId !== null
        )
        .map((item) => item.content),
      projectName: selectedProject?.name ?? null,
      responseStyle: settings.responseStyle,
    },
    projectId: ownedProjectId,
    settings,
  };
}
