/**
 * Display helpers for the admin pages. Pure formatting only — the numbers
 * themselves come from lib/metering.ts and the billing/usage queries.
 */

const MICROS_PER_USD = 1_000_000;
const DAY_MS = 24 * 60 * 60 * 1000;
const IST_TIME_ZONE = "Asia/Kolkata";

const usdFormatter = new Intl.NumberFormat("en-US", {
  currency: "USD",
  style: "currency",
});

const inrFormatter = new Intl.NumberFormat("en-IN", {
  currency: "INR",
  maximumFractionDigits: 0,
  style: "currency",
});

const dateTimeFormatter = new Intl.DateTimeFormat("en-IN", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: IST_TIME_ZONE,
});

const dateFormatter = new Intl.DateTimeFormat("en-IN", {
  dateStyle: "medium",
  timeZone: IST_TIME_ZONE,
});

export function formatUsdFromMicros(costMicros: number): string {
  return usdFormatter.format(costMicros / MICROS_PER_USD);
}

export function formatInrFromMicros(
  costMicros: number,
  inrPerUsd: number
): string {
  return inrFormatter.format((costMicros / MICROS_PER_USD) * inrPerUsd);
}

/** Date and time in IST, since that's where the owner and students are. */
export function formatDateTime(date: Date): string {
  return dateTimeFormatter.format(date);
}

export function formatDate(date: Date): string {
  return dateFormatter.format(date);
}

/** Whole days elapsed since a moment. Never negative. */
export function daysSince(date: Date, now: Date): number {
  const elapsed = now.getTime() - date.getTime();

  if (elapsed <= 0) {
    return 0;
  }

  return Math.floor(elapsed / DAY_MS);
}
