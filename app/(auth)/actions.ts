"use server";

import { signIn } from "./auth";

/**
 * Keeps sign-in landing on a page of this app, so a crafted callbackUrl
 * cannot send a student somewhere else once Google sends them back.
 */
function safeCallbackUrl(value: FormDataEntryValue | null): string {
  const target = typeof value === "string" ? value : "";

  if (
    !target.startsWith("/") ||
    target.startsWith("//") ||
    target.startsWith("/\\")
  ) {
    return "/";
  }

  return target;
}

export async function signInWithGoogle(formData: FormData) {
  await signIn("google", {
    redirectTo: safeCallbackUrl(formData.get("callbackUrl")),
  });
}
