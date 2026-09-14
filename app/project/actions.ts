"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { auth } from "@/app/(auth)/auth";
import {
  createProject,
  deleteProject,
  getProject,
  listProjects,
  setChatProject,
  updateProject,
} from "@/lib/db/project-queries";
import { saveChat } from "@/lib/db/queries";
import type { Project } from "@/lib/db/schema";
import { getEntitlement } from "@/lib/entitlements";
import { ChatbotError } from "@/lib/errors";
import { generateUUID } from "@/lib/utils";

async function requireUserId(): Promise<string> {
  const session = await auth();

  if (!session?.user?.id) {
    throw new ChatbotError("unauthorized:auth");
  }

  return session.user.id;
}

export type ProjectActionResult =
  | { success: true }
  | { success: false; error: string; upgrade?: boolean };

/** Fetcher for the sidebar's Projects section and the chat "move" menu. */
export async function listProjectsForSidebar(): Promise<Project[]> {
  const userId = await requireUserId();

  return listProjects(userId);
}

export async function createProjectAction(
  _prevState: ProjectActionResult | null,
  formData: FormData
): Promise<ProjectActionResult> {
  const userId = await requireUserId();
  const name = String(formData.get("name") ?? "").trim();

  if (!name || name.length > 60) {
    return {
      error: "Use a project name between 1 and 60 characters.",
      success: false,
    };
  }

  try {
    await createProject({ name, userId });
  } catch (error) {
    if (!(error instanceof ChatbotError)) {
      throw error;
    }
    if (error.type !== "forbidden") {
      throw error;
    }
    const entitlement = await getEntitlement(userId);
    if (entitlement.status === "active" && entitlement.planId === "pro") {
      return {
        error:
          "You've reached your 40 project folders. Delete an unused folder to create another; its chats will stay in History.",
        success: false,
      };
    }
    return {
      error: "Your plan cannot add another folder. Check your plan or upgrade.",
      success: false,
      upgrade: true,
    };
  }

  revalidatePath("/", "layout");
  return { success: true };
}

export async function renameProjectAction(
  _prevState: ProjectActionResult | null,
  formData: FormData
): Promise<ProjectActionResult> {
  const userId = await requireUserId();
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();

  if (!z.uuid().safeParse(id).success || !name || name.length > 60) {
    return { error: "Give the project a name.", success: false };
  }

  await updateProject({ id, name, userId });
  revalidatePath("/", "layout");

  return { success: true };
}

export async function deleteProjectAction(id: string): Promise<void> {
  z.uuid().parse(id);
  const userId = await requireUserId();

  await deleteProject({ id, userId });
  revalidatePath("/", "layout");
}

/**
 * Moves a chat into a project, or out of one when projectId is null. Used by
 * the "Move to project" / "Remove from project" action on a chat row.
 */
export async function moveChatToProjectAction({
  chatId,
  projectId,
}: {
  chatId: string;
  projectId: string | null;
}): Promise<void> {
  z.object({ chatId: z.uuid(), projectId: z.uuid().nullable() }).parse({
    chatId,
    projectId,
  });
  const userId = await requireUserId();

  await setChatProject({ chatId, projectId, userId });
  revalidatePath("/", "layout");
}

/** Plain form action: updates a project's instructions from its own page. */
export async function updateProjectInstructionsAction(
  formData: FormData
): Promise<void> {
  const userId = await requireUserId();
  const id = String(formData.get("id") ?? "");
  const instructions = String(formData.get("instructions") ?? "");

  if (!z.uuid().safeParse(id).success || instructions.length > 1500) {
    throw new ChatbotError("not_found:project");
  }

  await updateProject({ id, instructions: instructions || null, userId });
  revalidatePath(`/project/${id}`);
  revalidatePath("/projects");
}

/**
 * Plain form action behind "New chat in this project": creates an empty chat
 * the same way the sidebar's "New chat" button would, then files it under the
 * project and sends the student straight there.
 */
export async function startNewChatInProjectAction(
  formData: FormData
): Promise<void> {
  const userId = await requireUserId();
  const projectId = String(formData.get("projectId") ?? "");

  if (
    !z.uuid().safeParse(projectId).success ||
    !(await getProject({ id: projectId, userId }))
  ) {
    throw new ChatbotError("not_found:project");
  }

  const id = generateUUID();

  await saveChat({ id, title: "New chat", userId, visibility: "private" });
  await setChatProject({ chatId: id, projectId, userId });

  revalidatePath("/", "layout");
  redirect(`/chat/${id}`);
}
