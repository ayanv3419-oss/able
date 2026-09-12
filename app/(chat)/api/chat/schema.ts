import { z } from "zod";

const textPartSchema = z.object({
  text: z.string().min(1).max(2000),
  type: z.enum(["text"]),
});

/**
 * A file part never carries the file itself. It references a stored
 * extraction by id (see lib/db/attachment-queries.ts `createAttachment`);
 * the chat route swaps it for a text part after checking the attachment
 * belongs to the caller (SPEC §7 Files).
 */
const ATTACHMENT_URL_PATTERN =
  /^attachment:\/\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const filePartSchema = z.object({
  filename: z.string().min(1).max(255),
  mediaType: z.string().min(1).max(100),
  type: z.enum(["file"]),
  url: z
    .string()
    .regex(
      ATTACHMENT_URL_PATTERN,
      'File parts must reference a stored attachment as "attachment://<id>".'
    ),
});

const partSchema = z.union([textPartSchema, filePartSchema]);

const userMessageSchema = z.object({
  id: z.uuid(),
  parts: z.array(partSchema).min(1).max(12),
  role: z.enum(["user"]),
});

const toolApprovalMessageSchema = z.object({
  id: z.string(),
  parts: z.array(z.record(z.string(), z.unknown())),
  role: z.enum(["user", "assistant"]),
});

export const postRequestBodySchema = z
  .object({
    id: z.uuid(),
    message: userMessageSchema.optional(),
    messages: z.array(toolApprovalMessageSchema).optional(),

    selectedVisibilityType: z.enum(["public", "private"]),
    trigger: z
      .enum(["submit-message", "regenerate-message"])
      .default("submit-message"),
    /** Adds Groq's browser_search tool for this request only (SPEC §2, §6). */
    webSearch: z.boolean().optional().default(false),
  })
  .refine(
    (value) => Boolean(value.message) !== Boolean(value.messages?.length),
    {
      message: "Provide one message or a continuation, not both.",
    }
  );

export type PostRequestBody = z.infer<typeof postRequestBodySchema>;
