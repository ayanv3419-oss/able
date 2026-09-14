"use client";
import { toast } from "sonner";

type PdfRequest =
  | { kind: "message"; id: string }
  | { kind: "document"; id: string; content: string };

export async function downloadPdf(input: PdfRequest) {
  const notice = toast.loading("Preparing your PDF…");
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/api/pdf`,
      {
        body: JSON.stringify(input),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      }
    );
    if (!response.ok) {
      const body = await response.json().catch(() => null);
      throw new Error(
        body?.error || "Able couldn't create your PDF. Please try again."
      );
    }
    const url = URL.createObjectURL(await response.blob());
    const link = document.createElement("a");
    link.href = url;
    link.download =
      response.headers
        .get("Content-Disposition")
        ?.match(/filename="([^"]+)"/)?.[1] || "able-document.pdf";
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
    toast.success("Your PDF is ready.", { id: notice });
  } catch (error) {
    toast.error(
      error instanceof Error
        ? error.message
        : "PDF download failed. Please try again.",
      { id: notice }
    );
  }
}
