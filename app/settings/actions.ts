"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { auth, signOut } from "@/app/(auth)/auth";
import {
  classifyProviderError,
  validateContributedKey,
} from "@/lib/ai/key-pool";
import { isLocalPreview } from "@/lib/constants";
import { encryptSecret, fingerprintSecret, previewSecret } from "@/lib/crypto";
import { deleteUserAccount } from "@/lib/db/account-queries";
import { insertApiKey, removeApiKey } from "@/lib/db/api-key-queries";
import {
  deleteAllMemories,
  deleteMemory,
  upsertUserSettings,
} from "@/lib/db/personalization-queries";
import { ChatbotError } from "@/lib/errors";
import { profileSchema } from "@/lib/personalization";

async function requireUserId(): Promise<string> {
  const session = await auth();

  if (!session?.user?.id) {
    throw new ChatbotError("unauthorized:auth");
  }

  return session.user.id;
}

export type SettingsActionResult =
  | { success: true }
  | { success: false; error: string };

const apiKeySchema = z.object({
  apiKey: z.string().trim().min(10).max(500),
  label: z.string().trim().max(60),
  provider: z.enum(["groq", "gemini"]),
});

function hasDatabaseCode(error: unknown, code: string): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }
  const value = error as { cause?: unknown; code?: unknown };
  return value.code === code || hasDatabaseCode(value.cause, code);
}

export async function addApiKeyAction(
  _prevState: SettingsActionResult | null,
  formData: FormData
): Promise<SettingsActionResult> {
  const userId = await requireUserId();
  const parsed = apiKeySchema.safeParse({
    apiKey: formData.get("apiKey"),
    label: formData.get("label") ?? "",
    provider: formData.get("provider"),
  });
  if (!parsed.success) {
    return {
      error: "Enter a valid provider, label and API key.",
      success: false,
    };
  }

  const secret = parsed.data.apiKey;
  try {
    await validateContributedKey(parsed.data.provider, secret);
  } catch (error) {
    const kind = classifyProviderError(error);
    return {
      error:
        kind === "invalid"
          ? "That API key was rejected by the provider."
          : kind === "throttled"
            ? "That key is currently rate-limited. Try it again later."
            : "Able couldn't verify that key. Check it and try again.",
      success: false,
    };
  }

  let encrypted: string;
  try {
    encrypted = encryptSecret(secret);
  } catch (error) {
    console.error("API key encryption is not configured", error);
    return {
      error:
        "Key storage is not configured yet. Ask the Able owner to set ENCRYPTION_KEY.",
      success: false,
    };
  }

  try {
    await insertApiKey({
      encrypted,
      fingerprint: fingerprintSecret(secret),
      label: parsed.data.label || null,
      preview: previewSecret(secret),
      provider: parsed.data.provider,
      userId,
    });
  } catch (error) {
    if (hasDatabaseCode(error, "23505")) {
      return {
        error: "That API key is already in the shared pool.",
        success: false,
      };
    }
    console.error("Failed to save contributed API key", error);
    return {
      error: "Able couldn't save that key. Please try again.",
      success: false,
    };
  }

  revalidatePath("/settings");
  return { success: true };
}

export async function removeApiKeyAction(id: string): Promise<void> {
  z.uuid().parse(id);
  const userId = await requireUserId();
  await removeApiKey({ id, userId });
  revalidatePath("/settings");
}

export async function updatePersonalizationAction(
  _prevState: SettingsActionResult | null,
  formData: FormData
): Promise<SettingsActionResult> {
  const userId = await requireUserId();
  const aboutMe = String(formData.get("aboutMe") ?? "");
  const responseStyle = String(formData.get("responseStyle") ?? "");
  const memoryEnabled = formData.get("memoryEnabled") === "on";
  if (aboutMe.length > 1500 || responseStyle.length > 1500) {
    return {
      error: "Keep each instructions field within 1,500 characters.",
      success: false,
    };
  }

  await upsertUserSettings({ aboutMe, memoryEnabled, responseStyle, userId });
  revalidatePath("/settings");

  return { success: true };
}

/** Saves the student's profile. Every field is optional; Able never fills gaps itself. */
export async function updateProfileAction(
  _prevState: SettingsActionResult | null,
  formData: FormData
): Promise<SettingsActionResult> {
  const userId = await requireUserId();
  const parsed = profileSchema.safeParse({
    displayName: formData.get("displayName") ?? "",
    interests: formData.get("interests") ?? "",
    learningPreferences: formData.get("learningPreferences") ?? "",
    preferredLanguage: formData.get("preferredLanguage") ?? "English",
    responsePreferences: formData.get("responsePreferences") ?? "",
    role: formData.get("role") ?? "",
  });

  if (!parsed.success) {
    return {
      error: "One of the profile fields is too long or invalid.",
      success: false,
    };
  }

  await upsertUserSettings({ profile: parsed.data, userId });
  revalidatePath("/settings");
  // The chat screen greets the student by this name.
  revalidatePath("/", "layout");

  return { success: true };
}

export async function deleteMemoryAction(id: string): Promise<void> {
  z.uuid().parse(id);
  const userId = await requireUserId();

  await deleteMemory({ id, userId });
  revalidatePath("/settings");
}

export async function deleteAllMemoriesAction(): Promise<void> {
  const userId = await requireUserId();

  await deleteAllMemories(userId);
  revalidatePath("/settings");
}

const DELETE_CONFIRMATION = "DELETE";

/**
 * Deletes the student's account and signs them out. Payment records are kept
 * with the user link cleared, per docs/SPEC.md §7; deleteUserAccount handles
 * that split.
 */
export async function deleteAccountAction(
  _prevState: SettingsActionResult | null,
  formData: FormData
): Promise<SettingsActionResult> {
  const userId = await requireUserId();
  const confirmation = String(formData.get("confirmation") ?? "").trim();

  if (confirmation.toUpperCase() !== DELETE_CONFIRMATION) {
    return {
      error: `Type "${DELETE_CONFIRMATION}" to confirm.`,
      success: false,
    };
  }

  await deleteUserAccount(userId);
  if (isLocalPreview) {
    redirect("/");
  }
  await signOut({ redirectTo: "/" });

  return { success: true };
}
