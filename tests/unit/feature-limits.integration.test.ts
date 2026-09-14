import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createAttachmentWithinLimit } from "@/lib/db/attachment-queries";
import { db } from "@/lib/db/client";
import { finishFeature, reserveFeature } from "@/lib/db/feature-queries";
import { attachment, user } from "@/lib/db/schema";

const describeDb = process.env.TEST_POSTGRES_URL ? describe : describe.skip;
describeDb("concurrent feature quotas", () => {
  const userId = randomUUID();
  beforeAll(async () => {
    await db.insert(user).values({ email: `${userId}@quota.test`, id: userId });
  });
  afterAll(async () => {
    await db.delete(attachment).where(eq(attachment.userId, userId));
    await db.delete(user).where(eq(user.id, userId));
  });
  it("accepts exactly one of several uploads competing for the last slot", async () => {
    const results = await Promise.all(
      Array.from({ length: 6 }, () =>
        createAttachmentWithinLimit(
          { mediaType: "text/plain", name: "notes.txt", text: "Notes", userId },
          1
        )
      )
    );
    expect(results.filter(Boolean)).toHaveLength(1);
  });
  it("reserves only one concurrent PDF, releases failures and counts successful downloads", async () => {
    const results = await Promise.all(
      Array.from({ length: 4 }, () =>
        reserveFeature({ kind: "pdf", limit: 1, userId })
      )
    );
    const reserved = results.filter((r) => "id" in r);
    expect(reserved).toHaveLength(1);
    expect(
      results.filter((r) => "error" in r && r.error === "busy")
    ).toHaveLength(3);
    await finishFeature(reserved[0].id, false);
    const retry = await reserveFeature({ kind: "pdf", limit: 1, userId });
    if (!("id" in retry)) {
      throw new Error("Failed attempts must release quota");
    }
    await finishFeature(retry.id, true);
    expect(await reserveFeature({ kind: "pdf", limit: 1, userId })).toEqual({
      error: "limit",
    });
    expect(
      await reserveFeature({ kind: "research", limit: 1, userId })
    ).toHaveProperty("id");
  });
});
