import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { searchUsersByEmail } from "@/lib/db/account-queries";
import { getCurrentSubscription } from "@/lib/db/billing-queries";
import { usageSummaryForUser } from "@/lib/db/usage-queries";
import { istDayStart } from "@/lib/metering";
import { getPlan } from "@/lib/plans";
import {
  EmptyState,
  Section,
  TableShell,
  Td,
  Th,
} from "../_components/section";
import { formatUsdFromMicros } from "../format";

export const metadata: Metadata = {
  title: "Users",
};

type SearchParams = Promise<{ q?: string }>;

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { q } = await searchParams;
  const query = q?.trim() ?? "";
  const now = new Date();

  const results = query.length > 0 ? await searchUsersByEmail({ query }) : [];
  const rows = await Promise.all(
    results.map(async (user) => {
      const [currentSubscription, usage] = await Promise.all([
        getCurrentSubscription(user.id, now),
        usageSummaryForUser({ since: istDayStart(now), userId: user.id }),
      ]);

      return { currentSubscription, usage, user };
    })
  );

  return (
    <div className="flex flex-col gap-6">
      <Section title="User lookup">
        <form className="flex max-w-md gap-2" method="GET">
          <Input
            aria-label="Search by email"
            defaultValue={query}
            name="q"
            placeholder="Search by email"
            type="search"
          />
          <Button type="submit">Search</Button>
        </form>

        {query.length === 0 ? (
          <EmptyState>Search for a student by part of their email.</EmptyState>
        ) : rows.length === 0 ? (
          <EmptyState>No student matches "{query}".</EmptyState>
        ) : (
          <TableShell>
            <thead>
              <tr>
                <Th>Email</Th>
                <Th>Plan status</Th>
                <Th>Usage cost today</Th>
                <Th />
              </tr>
            </thead>
            <tbody>
              {rows.map(({ currentSubscription, user, usage }) => (
                <tr key={user.id}>
                  <Td>{user.email}</Td>
                  <Td>
                    {user.blockedAt
                      ? "Blocked"
                      : currentSubscription
                        ? `${getPlan(currentSubscription.planId).name} (active)`
                        : "No active plan"}
                  </Td>
                  <Td>{formatUsdFromMicros(usage.costMicros)}</Td>
                  <Td>
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/admin/users/${user.id}`}>Details</Link>
                    </Button>
                  </Td>
                </tr>
              ))}
            </tbody>
          </TableShell>
        )}
      </Section>
    </div>
  );
}
