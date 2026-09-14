"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/app/admin/admin-auth";
import { removeStudyContextBySupport } from "@/lib/db/context-queries";

export async function removeStudyContextBySupportAction({
  materialId,
  userId,
}: {
  materialId: string;
  userId: string;
}): Promise<void> {
  await requireAdmin();
  z.object({ materialId: z.uuid(), userId: z.uuid() }).parse({
    materialId,
    userId,
  });
  await removeStudyContextBySupport({ id: materialId, userId });
  revalidatePath(`/admin/users/${userId}`);
}
