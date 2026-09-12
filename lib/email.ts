import "server-only";

import { Resend } from "resend";
import { isTestEnvironment } from "./constants";

/**
 * Optional email, per docs/SPEC.md §2 and §7: Able sends a plan-ending-soon
 * reminder three days before a subscription's `endsAt`, but only when
 * `RESEND_API_KEY` is configured. Without it, this quietly does nothing so
 * the cron route still succeeds and `markReminderSent` still runs.
 */

const DEFAULT_FROM = "Able <no-reply@able.app>";

export type SendReminderEmailInput = {
  to: string;
  planName: string;
  endsAt: Date;
};

export type SendEmailResult = { sent: boolean };

function formatEndsAt(endsAt: Date): string {
  return endsAt.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    timeZone: "Asia/Kolkata",
    year: "numeric",
  });
}

/**
 * Emails a student that their plan ends soon. Returns `{ sent: false }`
 * without contacting Resend when `RESEND_API_KEY` is unset, which is the
 * documented "email is optional" behaviour.
 */
export async function sendReminderEmail({
  endsAt,
  planName,
  to,
}: SendReminderEmailInput): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey || isTestEnvironment || process.env.VITEST) {
    return { sent: false };
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  const renewUrl = appUrl ? `${appUrl}/pricing` : "/pricing";
  const endsAtLabel = formatEndsAt(endsAt);

  const resend = new Resend(apiKey);

  try {
    const result = await resend.emails.send({
      from: process.env.EMAIL_FROM ?? DEFAULT_FROM,
      subject: `Your Able ${planName} plan ends on ${endsAtLabel}`,
      text: `Your Able ${planName} plan ends on ${endsAtLabel}. Renew at ${renewUrl} to keep chatting without interruption.`,
      to,
    });
    if (result.error) {
      return { sent: false };
    }
  } catch (error) {
    // One student's bounced or rejected email should not fail the whole
    // reminder run; a later run can retry the unsent reminder.
    console.error("sendReminderEmail failed", { error, to });
    return { sent: false };
  }

  return { sent: true };
}

export async function sendPaymentReviewEmail({
  to,
  planName,
  approved,
  startsAt,
  endsAt,
  note,
}: {
  to: string;
  planName: string;
  approved: boolean;
  startsAt?: Date;
  endsAt?: Date;
  note?: string;
}): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || isTestEnvironment || process.env.VITEST) {
    return { sent: false };
  }
  const url = `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/billing`;
  try {
    const result = await new Resend(apiKey).emails.send({
      from: process.env.EMAIL_FROM ?? DEFAULT_FROM,
      subject: `Your Able ${planName} payment was ${approved ? "approved" : "rejected"}`,
      text: approved
        ? `Your payment is approved. Your ${planName} period runs from ${startsAt ? formatEndsAt(startsAt) : "today"} to ${endsAt ? formatEndsAt(endsAt) : "30 days from approval"}. View your plan at ${url}.`
        : `Your payment was rejected. ${note ?? "Please check the payment details."} View the decision at ${url}.`,
      to,
    });
    return { sent: !result.error };
  } catch {
    console.error("Payment review email failed");
    return { sent: false };
  }
}
