import "server-only";
import { and, count, eq, gte, or } from "drizzle-orm";
import { istDayStart } from "../metering";
import { db } from "./client";
import { featureRun, user } from "./schema";

export async function reserveFeature({
  userId,
  kind,
  limit,
}: {
  userId: string;
  kind: "pdf" | "research";
  limit: number;
}): Promise<{ id: string } | { error: "busy" | "limit" }> {
  return await db.transaction(async (tx) => {
    await tx
      .select({ id: user.id })
      .from(user)
      .where(eq(user.id, userId))
      .for("update");
    const now = new Date();
    const activePending = and(
      eq(featureRun.status, "pending"),
      gte(featureRun.createdAt, new Date(now.getTime() - 5 * 60_000))
    );
    const ownKind = and(
      eq(featureRun.userId, userId),
      eq(featureRun.kind, kind)
    );
    const [active] = await tx
      .select({ value: count() })
      .from(featureRun)
      .where(and(ownKind, activePending));
    if (active.value > 0) {
      return { error: "busy" };
    }
    const [used] = await tx
      .select({ value: count() })
      .from(featureRun)
      .where(
        and(
          ownKind,
          gte(featureRun.createdAt, istDayStart(now)),
          or(eq(featureRun.status, "completed"), activePending)
        )
      );
    if (used.value >= limit) {
      return { error: "limit" };
    }
    const [run] = await tx
      .insert(featureRun)
      .values({ kind, userId })
      .returning({ id: featureRun.id });
    return run;
  });
}

export async function finishFeature(id: string, successful: boolean) {
  await db
    .update(featureRun)
    .set({ status: successful ? "completed" : "failed" })
    .where(eq(featureRun.id, id));
}
