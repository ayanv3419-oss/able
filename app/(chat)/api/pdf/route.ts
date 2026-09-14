import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/app/(auth)/auth";
import { db } from "@/lib/db/client";
import { finishFeature, reserveFeature } from "@/lib/db/feature-queries";
import { getDocumentById } from "@/lib/db/queries";
import { chat, message } from "@/lib/db/schema";
import { getEntitlement } from "@/lib/entitlements";
import { answerMarkdown, MAX_PDF_CHARS, pdfFilename } from "@/lib/pdf/content";
import { renderPdf } from "@/lib/pdf/render";
import { getPlan } from "@/lib/plans";

export const maxDuration = 60;
const inputSchema = z.discriminatedUnion("kind", [
  z.object({ id: z.uuid(), kind: z.literal("message") }),
  z.object({
    content: z.string().max(MAX_PDF_CHARS),
    id: z.uuid(),
    kind: z.literal("document"),
  }),
]);
const fail = (error: string, status: number) =>
  Response.json(
    { error },
    { headers: { "Cache-Control": "no-store" }, status }
  );

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return fail("Sign in to download a PDF.", 401);
  }
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) {
    return fail("Open Able to download your PDF.", 403);
  }
  const raw = await request.text();
  if (raw.length > MAX_PDF_CHARS * 6 + 1000) {
    return fail(
      "This document is too long. Split it into smaller documents.",
      413
    );
  }
  let input: z.infer<typeof inputSchema>;
  try {
    input = inputSchema.parse(JSON.parse(raw));
  } catch {
    return fail(
      "Choose a document or answer to download (up to 240,000 characters).",
      400
    );
  }
  const entitlement = await getEntitlement(session.user.id);
  if (entitlement.status !== "active" || !entitlement.planId) {
    return fail("Choose an active plan to create PDFs.", 403);
  }
  let title: string;
  let content: string;
  if (input.kind === "document") {
    const document = await getDocumentById({ id: input.id });
    if (
      !document ||
      document.userId !== session.user.id ||
      document.kind !== "text"
    ) {
      return fail("Document not found.", 404);
    }
    ({ title } = document);
    // Export the visible version, including the student's edits awaiting autosave.
    ({ content } = input);
  } else {
    const [answer] = await db
      .select({ parts: message.parts, title: chat.title })
      .from(message)
      .innerJoin(chat, eq(message.chatId, chat.id))
      .where(
        and(
          eq(message.id, input.id),
          eq(chat.userId, session.user.id),
          eq(message.role, "assistant")
        )
      );
    if (!answer) {
      return fail(
        "Answer not found. Wait for it to finish saving, then try again.",
        404
      );
    }
    ({ title } = answer);
    content = answerMarkdown(answer.parts);
  }
  if (!content.trim()) {
    return fail("There's no text to export yet.", 400);
  }
  if (content.length > MAX_PDF_CHARS) {
    return fail(
      "This answer is too long. Ask Able to split it into smaller documents.",
      413
    );
  }
  const limit = getPlan(entitlement.planId).dailyPdfs;
  const reservation = await reserveFeature({
    kind: "pdf",
    limit,
    userId: session.user.id,
  });
  if ("error" in reservation) {
    return fail(
      reservation.error === "busy"
        ? "A PDF is already being prepared. Please wait for it to finish."
        : `You've used today's ${limit} PDFs. They reset at midnight India time.`,
      429
    );
  }
  try {
    const bytes = await renderPdf({ content, signal: request.signal, title });
    await finishFeature(reservation.id, true);
    return new Response(new Uint8Array(bytes), {
      headers: {
        "Cache-Control": "private, no-store",
        "Content-Disposition": `attachment; filename="${pdfFilename(title)}"`,
        "Content-Type": "application/pdf",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    await finishFeature(reservation.id, false);
    console.error(
      "PDF export failed:",
      error instanceof Error ? error.message : "Unknown error"
    );
    return fail(
      "Able couldn't create this PDF. Please try again; this attempt did not use a download.",
      500
    );
  }
}
