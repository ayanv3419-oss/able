import type { Metadata } from "next";
import { connection } from "next/server";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { daysLeft } from "@/lib/billing/rules";
import {
  listSubscriptions,
  type SubscriptionWithEmail,
} from "@/lib/db/billing-queries";
import { getPlan } from "@/lib/plans";
import {
  EmptyState,
  Section,
  TableShell,
  Td,
  Th,
} from "../_components/section";
import { formatDate } from "../format";
import { extendSubscriptionAction, revokeSubscriptionAction } from "./actions";

export const metadata: Metadata = {
  title: "Subscriptions",
};

const EXPIRING_WINDOW_DAYS = 7;
const DEFAULT_EXTEND_DAYS = 30;

export default async function AdminSubscriptionsPage() {
  // Defer to request time: this list must always reflect the live database.
  await connection();
  const now = new Date();

  const [active, expiringSoon] = await Promise.all([
    listSubscriptions({ activeOnly: true, now }),
    listSubscriptions({ expiringWithinDays: EXPIRING_WINDOW_DAYS, now }),
  ]);

  return (
    <div className="flex flex-col gap-10">
      <Section
        description="Students with access right now."
        title="Active subscriptions"
      >
        {active.length === 0 ? (
          <EmptyState>No subscription is active right now.</EmptyState>
        ) : (
          <TableShell>
            <thead>
              <tr>
                <Th>Student</Th>
                <Th>Plan</Th>
                <Th>Days left</Th>
                <Th>Ends</Th>
                <Th>Actions</Th>
              </tr>
            </thead>
            <tbody>
              {active.map((item) => (
                <SubscriptionRow key={item.id} now={now} subscription={item} />
              ))}
            </tbody>
          </TableShell>
        )}
      </Section>

      <Section
        description={`Active subscriptions ending within ${EXPIRING_WINDOW_DAYS} days.`}
        title="Ending soon"
      >
        {expiringSoon.length === 0 ? (
          <EmptyState>
            Nothing ends in the next {EXPIRING_WINDOW_DAYS} days.
          </EmptyState>
        ) : (
          <TableShell>
            <thead>
              <tr>
                <Th>Student</Th>
                <Th>Plan</Th>
                <Th>Days left</Th>
                <Th>Ends</Th>
              </tr>
            </thead>
            <tbody>
              {expiringSoon.map((item) => (
                <tr key={item.id}>
                  <Td>{item.userEmail ?? "(no student linked)"}</Td>
                  <Td>{getPlan(item.planId).name}</Td>
                  <Td>{daysLeft(item.endsAt, now)}</Td>
                  <Td>{formatDate(item.endsAt)}</Td>
                </tr>
              ))}
            </tbody>
          </TableShell>
        )}
      </Section>
    </div>
  );
}

function SubscriptionRow({
  now,
  subscription,
}: {
  subscription: SubscriptionWithEmail;
  now: Date;
}) {
  const plan = getPlan(subscription.planId);

  return (
    <tr>
      <Td>{subscription.userEmail ?? "(no student linked)"}</Td>
      <Td>{plan.name}</Td>
      <Td>{daysLeft(subscription.endsAt, now)}</Td>
      <Td>{formatDate(subscription.endsAt)}</Td>
      <Td>
        <div className="flex flex-col gap-2">
          <form
            action={extendSubscriptionAction}
            className="flex items-center gap-2"
          >
            <input
              name="subscriptionId"
              type="hidden"
              value={subscription.id}
            />
            <Input
              aria-label="Days to extend by"
              className="h-8 w-16 text-xs"
              defaultValue={DEFAULT_EXTEND_DAYS}
              min={1}
              name="days"
              required
              type="number"
            />
            <Button size="sm" type="submit" variant="outline">
              Extend
            </Button>
          </form>
          <form action={revokeSubscriptionAction}>
            <input
              name="subscriptionId"
              type="hidden"
              value={subscription.id}
            />
            <Button size="sm" type="submit" variant="destructive">
              Revoke
            </Button>
          </form>
        </div>
      </Td>
    </tr>
  );
}
