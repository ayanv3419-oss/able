import { tool } from "ai";
import { z } from "zod";
import { addMemory, getUserSettings } from "@/lib/db/personalization-queries";

type SaveMemoryProps = {
  userId: string;
  projectId?: string | null;
};

/**
 * Lets Able save a durable fact or lasting preference about the student, per
 * SPEC §6. The chat route only adds this tool when the student's memory
 * switch is on, so there is no need to re-check it here.
 */
export const saveMemory = ({ userId, projectId = null }: SaveMemoryProps) =>
  tool({
    description:
      "Save an explicitly provided, non-sensitive durable fact or preference. Never infer profile details or store secrets. Use project scope for facts specific to the current project, and global scope for preferences useful across Able. Never use one-off details or facts from another project's history.",
    execute: async ({ content, scope }) => {
      if (!(await getUserSettings(userId)).memoryEnabled) {
        return { message: "Memory is switched off.", saved: false };
      }
      if (scope === "project" && !projectId) {
        return { message: "There is no selected project.", saved: false };
      }
      const saved = await addMemory({
        content,
        projectId: scope === "project" ? projectId : null,
        userId,
      });

      if (!saved) {
        return {
          message: "That's already remembered, or the memory list is full.",
          saved: false,
        };
      }

      return { message: "Got it, I'll remember that.", saved: true };
    },
    inputSchema: z.object({
      content: z
        .string()
        .min(1)
        .max(500)
        .describe(
          "The durable fact or preference to remember, written as a short, self-contained sentence."
        ),
      scope: z
        .enum(["global", "project"])
        .default(projectId ? "project" : "global"),
    }),
  });
