import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { daysLeft } from "@/lib/billing/rules";
import { getUserById } from "@/lib/db/account-queries";
import {
  getCurrentSubscription,
  getLatestSubscription,
  listPaymentsByUserId,
} from "@/lib/db/billing-queries";
import { usageSummaryForUser } from "@/lib/db/usage-queries";
import { istDayStart } from "@/lib/metering";
import { getPlan } from "@/lib/plans";
import {
  EmptyState,
  Section,
  TableShell,
  Td,
  Th,
} from "../../_components/section";
import { formatDate, formatDateTime, formatUsdFromMicros } from "../../format";

export const metadata: Metadata = {
  title: "Student",
};

const DAY_MS = 24 * 60 * 60 * 1000;

type UsageSummary = {
  costMicros: number;
  messages: number;
  webSearches: number;
};

export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getUserById(id);

  if (!user) {
    notFound();
  }

  const now = new Date();

  const [
    currentSubscription,
    latestSubscription,
    payments,
    usageToday,
    usageLast7Days,
    usageLast30Days,
  ] = await Promise.all([
    getCurrentSubscription(user.id, now),
    getLatestSubscription(user.id),
    listPaymentsByUserId(user.id),
    usageSummaryForUser({ since: istDayStart(now), userId: user.id }),
    usageSummaryForUser({
      since: new Date(now.getTime() - 7 * DAY_MS),
      userId: user.id,
    }),
    usageSummaryForUser({
      since: new Date(now.getTime() - 30 * DAY_MS),
      userId: user.id,
    }),
  ]);

  return (
    <div className="flex flex-col gap-10">
      <Section title={user.email}>
        <dl className="grid max-w-lg grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
          <dt className="text-muted-foreground">Current plan</dt>
          <dd>
            {currentSubscription
              ? `${getPlan(currentSubscription.planId).name} · ${daysLeft(currentSubscription.endsAt, now)} days left · ends ${formatDate(currentSubscription.endsAt)}`
              : "No active plan"}
          </dd>
          <dt className="text-muted-foreground">Latest subscription</dt>
          <dd>
            {latestSubscription
              ? `${getPlan(latestSubscription.planId).name} · ${latestSubscription.status}`
              : "None yet"}
          </dd>
          <dt className="text-muted-foreground">Joined</dt>
          <dd>{formatDate(user.createdAt)}</dd>
        </dl>
      </Section>

      <Section title="Usage cost">
        <div className="grid gap-4 sm:grid-cols-3">
          <UsageCard label="Today" usage={usageToday} />
          <UsageCard label="Last 7 days" usage={usageLast7Days} />
          <UsageCard label="Last 30 days" usage={usageLast30Days} />
        </div>
      </Section>

      <Section title="Payment history">
        {payments.length === 0 ? (
          <EmptyState>This student has never submitted a payment.</EmptyState>
        ) : (
          <TableShell>
            <thead>
              <tr>
                <Th>Plan</Th>
                <Th>Amount</Th>
                <Th>UTR</Th>
                <Th>Status</Th>
                <Th>Submitted</Th>
                <Th>Reviewed</Th>
                <Th>Note</Th>
              </tr>
            </thead>
            <tbody>
              {payments.map((payment) => (
                <tr key={payment.id}>
                  <Td>{getPlan(payment.planId).name}</Td>
                  <Td>₹{payment.amountInr}</Td>
                  <Td className="font-mono text-xs">{payment.utr}</Td>
                  <Td className="capitalize">{payment.status}</Td>
                  <Td>{formatDateTime(payment.createdAt)}</Td>
                  <Td>
                    {payment.reviewedAt
                      ? formatDateTime(payment.reviewedAt)
                      : "—"}
                  </Td>
                  <Td>{payment.reviewNote ?? "—"}</Td>
                </tr>
              ))}
            </tbody>
          </TableShell>
        )}
      </Section>
    </div>
  );
}

function UsageCard({ label, usage }: { label: string; usage: UsageSummary }) {
  return (
    <div className="flex flex-col gap-1 rounded-xl border border-border bg-card px-4 py-4">
      <span className="text-muted-foreground text-sm">{label}</span>
      <span className="font-semibold text-xl tracking-tight">
        {formatUsdFromMicros(usage.costMicros)}
      </span>
      <span className="text-muted-foreground text-xs">
        {usage.messages} messages · {usage.webSearches} searches
      </span>
    </div>
  );
}
