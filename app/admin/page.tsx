import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { countPendingPayments } from "@/lib/db/billing-queries";
import { sumCostBetween } from "@/lib/db/usage-queries";
import { INR_PER_USD, istDayStart } from "@/lib/metering";
import { Section } from "./_components/section";
import { formatInrFromMicros, formatUsdFromMicros } from "./format";

export const metadata: Metadata = {
  title: "Dashboard",
};

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export default async function AdminDashboardPage() {
  // These numbers must reflect the live database on every load, never a
  // build-time snapshot, so explicitly defer to request time before reading
  // the clock. See docs/nextjs cacheComponents: "Route used new Date() before
  // accessing Request data."
  await connection();
  const now = new Date();
  const todayStart = istDayStart(now);
  const thirtyDaysAgo = new Date(now.getTime() - THIRTY_DAYS_MS);

  const [pendingPayments, todayCost, last30DaysCost] = await Promise.all([
    countPendingPayments(),
    sumCostBetween({ from: todayStart, to: now }),
    sumCostBetween({ from: thirtyDaysAgo, to: now }),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <Section title="Dashboard">
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard
            footer={
              <Button asChild size="sm" variant="outline">
                <Link href="/admin/payments">Open the queue</Link>
              </Button>
            }
            label="Pending payments"
            value={String(pendingPayments)}
          />
          <StatCard
            footer={`${formatInrFromMicros(todayCost.costMicros, INR_PER_USD)} · ${todayCost.events} usage events`}
            label="AI cost today"
            value={formatUsdFromMicros(todayCost.costMicros)}
          />
          <StatCard
            footer={`${formatInrFromMicros(last30DaysCost.costMicros, INR_PER_USD)} · ${last30DaysCost.events} usage events`}
            label="AI cost, last 30 days"
            value={formatUsdFromMicros(last30DaysCost.costMicros)}
          />
        </div>
      </Section>
    </div>
  );
}

function StatCard({
  footer,
  label,
  value,
}: {
  label: string;
  value: string;
  footer: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-border bg-card px-4 py-4">
      <span className="text-muted-foreground text-sm">{label}</span>
      <span className="font-semibold text-2xl tracking-tight">{value}</span>
      <div className="text-muted-foreground text-xs">{footer}</div>
    </div>
  );
}
