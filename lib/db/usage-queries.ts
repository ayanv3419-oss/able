import "server-only";

import { and, eq, gte, lt, sql } from "drizzle-orm";
import { db } from "./client";
import { type NewUsageEvent, type UsageEvent, usageEvent } from "./schema";

const costSum = sql`coalesce(sum(${usageEvent.costMicros}), 0)`.mapWith(Number);

/** Records what one model call cost. Written after every assistant response. */
export async function insertUsageEvent(
  event: NewUsageEvent
): Promise<UsageEvent> {
  const [created] = await db.insert(usageEvent).values(event).returning();

  return created;
}

/**
 * Micro-dollars a student has spent since a moment, counting only events that
 * count towards the daily limit. Titles are recorded but never counted.
 */
export async function sumCountedCostSince({
  since,
  userId,
}: {
  userId: string;
  since: Date;
}): Promise<number> {
  const [row] = await db
    .select({ costMicros: costSum })
    .from(usageEvent)
    .where(
      and(
        eq(usageEvent.userId, userId),
        gte(usageEvent.createdAt, since),
        eq(usageEvent.countsTowardLimit, true)
      )
    );

  return row?.costMicros ?? 0;
}

/** Everyone's cost over a window, for the admin page. */
export async function sumCostBetween({
  from,
  to,
}: {
  from: Date;
  to: Date;
}): Promise<{ costMicros: number; events: number }> {
  const [row] = await db
    .select({
      costMicros: costSum,
      events: sql`count(*)`.mapWith(Number),
    })
    .from(usageEvent)
    .where(and(gte(usageEvent.createdAt, from), lt(usageEvent.createdAt, to)));

  return { costMicros: row?.costMicros ?? 0, events: row?.events ?? 0 };
}

/** One student's usage since a moment, for the admin user search. */
export async function usageSummaryForUser({
  since,
  userId,
}: {
  userId: string;
  since: Date;
}): Promise<{ costMicros: number; messages: number; webSearches: number }> {
  const [row] = await db
    .select({
      costMicros: costSum,
      messages:
        sql`count(*) filter (where ${usageEvent.kind} = 'chat')`.mapWith(
          Number
        ),
      webSearches: sql`coalesce(sum(${usageEvent.webSearches}), 0)`.mapWith(
        Number
      ),
    })
    .from(usageEvent)
    .where(
      and(eq(usageEvent.userId, userId), gte(usageEvent.createdAt, since))
    );

  return {
    costMicros: row?.costMicros ?? 0,
    messages: row?.messages ?? 0,
    webSearches: row?.webSearches ?? 0,
  };
}
