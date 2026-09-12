import type { NextRequest } from "next/server";
import {
  listSubscriptionsNeedingReminder,
  markReminderSent,
} from "@/lib/db/billing-queries";
import { sendReminderEmail } from "@/lib/email";
import { getPlan } from "@/lib/plans";

/**
 * Daily Vercel cron, per docs/SPEC.md §7 Renew: emails students whose plan
 * ends within three days and records that the reminder went out, so the
 * same subscription is never reminded twice. Scheduled in `vercel.json`.
 */
export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const now = new Date();
  const due = await listSubscriptionsNeedingReminder(now);

  const results = await Promise.all(
    due.map(async (item) => {
      const { sent } = item.userEmail
        ? await sendReminderEmail({
            endsAt: item.endsAt,
            planName: getPlan(item.planId).name,
            to: item.userEmail,
          })
        : { sent: false };

      if (sent) {
        await markReminderSent(item.subscriptionId, now);
      }

      return sent;
    })
  );

  return Response.json({
    emailed: results.filter(Boolean).length,
    processed: due.length,
  });
}
