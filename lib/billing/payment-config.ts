import "server-only";

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { parse } from "dotenv";
import { isLocalPreview } from "@/lib/constants";

/** Read local payment changes without restarting the running preview server. */
export async function getPaymentConfig() {
  const config = isLocalPreview
    ? parse(await readFile(resolve(process.cwd(), ".env.local"), "utf8"))
    : process.env;
  return {
    payeeName: config.UPI_PAYEE_NAME?.trim() || "Able",
    upiId: config.UPI_ID?.trim(),
  };
}
