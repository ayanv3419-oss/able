"use client";

import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";

const COPIED_LABEL_MS = 2000;

/** Copies the UPI ID to the clipboard for students who would rather paste it
 * into their UPI app than scan the QR code. */
export function CopyUpiButton({ upiId }: { upiId: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(upiId);
      setCopied(true);
      setTimeout(() => setCopied(false), COPIED_LABEL_MS);
    } catch {
      setCopied(false);
    }
  }, [upiId]);

  return (
    <Button onClick={handleCopy} size="sm" type="button" variant="outline">
      {copied ? "Copied" : "Copy UPI ID"}
    </Button>
  );
}
