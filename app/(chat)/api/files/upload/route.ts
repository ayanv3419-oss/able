import { NextResponse } from "next/server";
import { auth } from "@/app/(auth)/auth";
import { createAttachment } from "@/lib/db/attachment-queries";
import { getEntitlement } from "@/lib/entitlements";

const MAX_FILE_BYTES = 10 * 1024 * 1024;
/** SPEC §7: files over ~60,000 estimated tokens (chars ÷ 4) are rejected. */
const MAX_ESTIMATED_TOKENS = 60_000;
const CHARS_PER_TOKEN_ESTIMATE = 4;

const EXTENSION_MEDIA_TYPES: Record<string, string> = {
  csv: "text/csv",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  md: "text/markdown",
  pdf: "application/pdf",
  txt: "text/plain",
};

function getExtension(filename: string): string {
  const dot = filename.lastIndexOf(".");
  return dot === -1 ? "" : filename.slice(dot + 1).toLowerCase();
}

function errorResponse(error: string, status = 400) {
  return NextResponse.json({ error }, { status });
}

async function extractPdfText(buffer: Buffer): Promise<string> {
  const { extractText, getDocumentProxy } = await import("unpdf");
  const pdf = await getDocumentProxy(new Uint8Array(buffer));
  const { text } = await extractText(pdf, { mergePages: true });
  return text;
}

async function extractDocxText(buffer: Buffer): Promise<string> {
  // mammoth ships no type declarations and there is no @types/mammoth;
  // a dynamic import resolves to `any` here rather than erroring.
  const mammoth = await import("mammoth");
  const { value } = await mammoth.extractRawText({ buffer });
  return value;
}

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user) {
    return errorResponse("You need to sign in to upload files.", 401);
  }
  const entitlement = await getEntitlement(session.user.id);
  if (entitlement.status !== "active") {
    return errorResponse("Choose an active plan before uploading files.", 403);
  }

  if (request.body === null) {
    return errorResponse("Request body is empty.");
  }

  let file: File | null;

  try {
    const formData = await request.formData();
    const candidate = formData.get("file");
    file = candidate instanceof File ? candidate : null;
  } catch {
    return errorResponse("Failed to process the upload.");
  }

  if (!file) {
    return errorResponse("No file uploaded.");
  }

  if (file.type.startsWith("image/")) {
    return errorResponse(
      "Able can't read images — Groq's model has no vision support. Upload a PDF, DOCX, TXT, MD, or CSV file instead."
    );
  }

  if (file.size > MAX_FILE_BYTES) {
    return errorResponse("File is larger than 10 MB.");
  }

  const extension = getExtension(file.name);
  const mediaType = EXTENSION_MEDIA_TYPES[extension];

  if (!mediaType) {
    return errorResponse(
      "Unsupported file type. Able accepts PDF, DOCX, TXT, MD, and CSV files."
    );
  }

  try {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    let text: string;
    if (extension === "pdf") {
      text = await extractPdfText(buffer);
    } else if (extension === "docx") {
      text = await extractDocxText(buffer);
    } else {
      text = buffer.toString("utf-8");
    }

    const estimatedTokens = Math.ceil(text.length / CHARS_PER_TOKEN_ESTIMATE);

    if (estimatedTokens > MAX_ESTIMATED_TOKENS) {
      return errorResponse(
        "This file is too long for Able to use (more than about 60,000 tokens). Please split it into smaller files."
      );
    }

    if (text.trim().length === 0) {
      return errorResponse("Able couldn't find any text in that file.");
    }

    const attachment = await createAttachment({
      mediaType,
      name: file.name,
      text,
      userId: session.user.id,
    });

    return NextResponse.json({
      contentType: attachment.mediaType,
      id: attachment.id,
      name: attachment.name,
      pathname: attachment.name,
      url: `attachment://${attachment.id}`,
    });
  } catch (error) {
    console.error("File extraction failed:", error);
    return errorResponse(
      "Able couldn't read that file. Please try again.",
      500
    );
  }
}
