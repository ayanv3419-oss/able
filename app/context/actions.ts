"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { auth } from "@/app/(auth)/auth";
import { uploadLimitError } from "@/lib/billing/upload-limit";
import {
  createContextFolder,
  createStudyContextWithinLimit,
  deleteEmptyContextFolder,
  deleteStudyContextWithinWindow,
  getContextFolder,
  getStudyContext,
  listStudyContexts,
  moveStudyContext,
  renameContextFolder,
  updateStudyContextWithinWindow,
} from "@/lib/db/context-queries";
import { saveChat } from "@/lib/db/queries";
import type { StudyContext } from "@/lib/db/schema";
import { getEntitlement } from "@/lib/entitlements";
import { ChatbotError } from "@/lib/errors";
import { getPlan } from "@/lib/plans";
import { STUDY_CONTEXT_MAX_CHARS, teachingRequest } from "@/lib/study-context";
import { generateUUID } from "@/lib/utils";

export type ContextActionResult =
  | { success: true }
  | { success: false; error: string };

async function requireUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new ChatbotError("unauthorized:auth");
  }
  return session.user.id;
}

async function requireActivePlan(userId: string) {
  const entitlement = await getEntitlement(userId);
  if (entitlement.status !== "active" || !entitlement.planId) {
    throw new ChatbotError("forbidden:plan");
  }
  return getPlan(entitlement.planId);
}

function errorText(error: unknown, fallback: string): string {
  if (error instanceof ChatbotError && typeof error.cause === "string") {
    return error.cause;
  }
  return fallback;
}

export async function createContextFolderAction(
  _state: ContextActionResult | null,
  formData: FormData
): Promise<ContextActionResult> {
  const userId = await requireUserId();
  await requireActivePlan(userId);
  const name = String(formData.get("name") ?? "").trim();
  if (!name || name.length > 60) {
    return {
      error: "Use a folder name between 1 and 60 characters.",
      success: false,
    };
  }
  await createContextFolder({ name, userId });
  revalidatePath("/context");
  return { success: true };
}

export async function renameContextFolderAction(
  _state: ContextActionResult | null,
  formData: FormData
): Promise<ContextActionResult> {
  const userId = await requireUserId();
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  if (!z.uuid().safeParse(id).success || !name || name.length > 60) {
    return { error: "Give the folder a name.", success: false };
  }
  try {
    await renameContextFolder({ id, name, userId });
  } catch (error) {
    return {
      error: errorText(error, "Could not rename this folder."),
      success: false,
    };
  }
  revalidatePath("/context");
  revalidatePath(`/context/${id}`);
  return { success: true };
}

export async function deleteContextFolderAction(
  _state: ContextActionResult | null,
  formData: FormData
): Promise<ContextActionResult> {
  const userId = await requireUserId();
  const id = String(formData.get("id") ?? "");
  if (!z.uuid().safeParse(id).success) {
    return { error: "Folder not found.", success: false };
  }
  try {
    await deleteEmptyContextFolder({ id, userId });
  } catch (error) {
    return {
      error: errorText(error, "Only an empty folder can be deleted."),
      success: false,
    };
  }
  revalidatePath("/context");
  redirect("/context");
}

export async function createStudyContextAction(
  _state: ContextActionResult | null,
  formData: FormData
): Promise<ContextActionResult> {
  const userId = await requireUserId();
  const plan = await requireActivePlan(userId);
  const folderId = String(formData.get("folderId") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const content = String(formData.get("content") ?? "").trim();
  if (!z.uuid().safeParse(folderId).success) {
    return { error: "Folder not found.", success: false };
  }
  if (!title || title.length > 120) {
    return {
      error: "Use a title between 1 and 120 characters.",
      success: false,
    };
  }
  if (!content || content.length > STUDY_CONTEXT_MAX_CHARS) {
    return {
      error: `Paste between 1 and ${STUDY_CONTEXT_MAX_CHARS.toLocaleString("en-IN")} characters.`,
      success: false,
    };
  }
  let material: StudyContext | null;
  try {
    material = await createStudyContextWithinLimit(
      { content, folderId, title, userId },
      plan.dailyUploads
    );
  } catch (error) {
    return {
      error: errorText(error, "Could not save this Context."),
      success: false,
    };
  }
  if (!material) {
    return {
      error:
        uploadLimitError(plan, plan.dailyUploads ?? 0) ??
        "Today's upload limit was reached.",
      success: false,
    };
  }

  const chatId = generateUUID();
  await saveChat({
    contextFolderId: folderId,
    id: chatId,
    studyContextId: material.id,
    studyMode: "lesson",
    title: `Lesson: ${title}`.slice(0, 100),
    userId,
    visibility: "private",
  });
  revalidatePath("/context");
  revalidatePath(`/context/${folderId}`);
  redirect(
    `/chat/${chatId}?query=${encodeURIComponent(teachingRequest("lesson"))}`
  );
}

export async function updateStudyContextAction(
  _state: ContextActionResult | null,
  formData: FormData
): Promise<ContextActionResult> {
  const userId = await requireUserId();
  const id = String(formData.get("id") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const content = String(formData.get("content") ?? "").trim();
  if (
    !z.uuid().safeParse(id).success ||
    !title ||
    title.length > 120 ||
    !content ||
    content.length > STUDY_CONTEXT_MAX_CHARS
  ) {
    return { error: "Check the title and pasted material.", success: false };
  }
  try {
    const updated = await updateStudyContextWithinWindow({
      content,
      id,
      title,
      userId,
    });
    revalidatePath(`/context/${updated.folderId}`);
    revalidatePath(`/context/${updated.folderId}/${id}`);
    return { success: true };
  } catch (error) {
    return {
      error: errorText(error, "Could not update this Context."),
      success: false,
    };
  }
}

export async function moveStudyContextAction(
  _state: ContextActionResult | null,
  formData: FormData
): Promise<ContextActionResult> {
  const userId = await requireUserId();
  const id = String(formData.get("id") ?? "");
  const folderId = String(formData.get("folderId") ?? "");
  if (
    !z.uuid().safeParse(id).success ||
    !z.uuid().safeParse(folderId).success
  ) {
    return { error: "Choose a valid folder.", success: false };
  }
  let moved: StudyContext;
  try {
    moved = await moveStudyContext({ folderId, id, userId });
  } catch (error) {
    return {
      error: errorText(error, "Could not move this Context."),
      success: false,
    };
  }
  revalidatePath("/context");
  revalidatePath(`/context/${folderId}`);
  redirect(`/context/${moved.folderId}/${id}`);
}

export async function deleteStudyContextAction(
  _state: ContextActionResult | null,
  formData: FormData
): Promise<ContextActionResult> {
  const userId = await requireUserId();
  const id = String(formData.get("id") ?? "");
  if (!z.uuid().safeParse(id).success) {
    return { error: "Context not found.", success: false };
  }
  let deleted: StudyContext;
  try {
    deleted = await deleteStudyContextWithinWindow({ id, userId });
  } catch (error) {
    return {
      error: errorText(error, "Could not remove this Context."),
      success: false,
    };
  }
  revalidatePath("/context");
  revalidatePath(`/context/${deleted.folderId}`);
  redirect(`/context/${deleted.folderId}`);
}

const teachingModeSchema = z.enum([
  "lesson",
  "explain",
  "summary",
  "quiz",
  "important",
]);

export async function startContextTeachingAction(
  formData: FormData
): Promise<void> {
  const userId = await requireUserId();
  await requireActivePlan(userId);
  const folderId = String(formData.get("folderId") ?? "");
  const materialIdValue = String(formData.get("studyContextId") ?? "");
  const studyContextId = materialIdValue || null;
  const mode = teachingModeSchema.parse(formData.get("mode"));
  if (!z.uuid().safeParse(folderId).success) {
    throw new ChatbotError("not_found:database", "Context folder not found");
  }
  const folder = await getContextFolder({ id: folderId, userId });
  if (!folder) {
    throw new ChatbotError("not_found:database", "Context folder not found");
  }
  let title = folder.name;
  if (studyContextId) {
    if (!z.uuid().safeParse(studyContextId).success) {
      throw new ChatbotError("not_found:database", "Context not found");
    }
    const material = await getStudyContext({ id: studyContextId, userId });
    if (!material || material.folderId !== folderId) {
      throw new ChatbotError("not_found:database", "Context not found");
    }
    ({ title } = material);
  } else if ((await listStudyContexts({ folderId, userId })).length === 0) {
    throw new ChatbotError(
      "bad_request:database",
      "Add study material before starting a lesson."
    );
  }
  const chatId = generateUUID();
  await saveChat({
    contextFolderId: folderId,
    id: chatId,
    studyContextId,
    studyMode: mode,
    title: `${mode === "lesson" ? "Lesson" : "Study"}: ${title}`.slice(0, 100),
    userId,
    visibility: "private",
  });
  redirect(
    `/chat/${chatId}?query=${encodeURIComponent(teachingRequest(mode))}`
  );
}
