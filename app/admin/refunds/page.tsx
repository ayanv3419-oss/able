import type { Metadata } from "next";
import { connection } from "next/server";
import { Button } from "@/components/ui/button";
import {
  listRefundRequests,
  type RefundRequestDetails,
} from "@/lib/db/billing-queries";
import { getPlan } from "@/lib/plans";
import {
  EmptyState,
  Section,
  TableShell,
  Td,
  Th,
} from "../_components/section";
import { daysSince, formatDateTime } from "../format";
import { declineRefundAction, markRefundedAction } from "./actions";

export const metadata: Metadata = {
  title: "Refunds",
};

const RESOLVED_LIMIT = 50;

export default async function AdminRefundsPage() {
  // Defer to request time: this list must always reflect the live database.
  await connection();
  const now = new Date();

  const [open, refunded, declined] = await Promise.all([
    listRefundRequests({ status: "open" }),
    listRefundRequests({ status: "refunded" }),
    listRefundRequests({ status: "declined" }),
  ]);

  const resolved = [...refunded, ...declined]
    .sort((a, b) => {
      const aTime = a.resolvedAt?.getTime() ?? a.createdAt.getTime();
      const bTime = b.resolvedAt?.getTime() ?? b.createdAt.getTime();
      return bTime - aTime;
    })
    .slice(0, RESOLVED_LIMIT);

  return (
    <div className="flex flex-col gap-10">
      <Section
        description="Pay the student back over UPI by hand first, then mark the request refunded."
        title="Open refund requests"
      >
        {open.length === 0 ? (
          <EmptyState>No refund request is open.</EmptyState>
        ) : (
          <TableShell>
            <thead>
              <tr>
                <Th>Student</Th>
                <Th>Plan</Th>
                <Th>Amount</Th>
                <Th>Reason</Th>
                <Th>Days since approval</Th>
                <Th>Actions</Th>
              </tr>
            </thead>
            <tbody>
              {open.map((request) => (
                <OpenRow key={request.id} now={now} request={request} />
              ))}
            </tbody>
          </TableShell>
        )}
      </Section>

      <Section
        description={`Last ${RESOLVED_LIMIT} refunded or declined requests.`}
        title="Resolved requests"
      >
        {resolved.length === 0 ? (
          <EmptyState>No refund request has been resolved yet.</EmptyState>
        ) : (
          <TableShell>
            <thead>
              <tr>
                <Th>Student</Th>
                <Th>Plan</Th>
                <Th>Amount</Th>
                <Th>Status</Th>
                <Th>Resolved</Th>
              </tr>
            </thead>
            <tbody>
              {resolved.map((request) => (
                <tr key={request.id}>
                  <Td>{request.userEmail ?? "(no student linked)"}</Td>
                  <Td>{getPlan(request.planId).name}</Td>
                  <Td>₹{request.amountInr}</Td>
                  <Td className="capitalize">{request.status}</Td>
                  <Td>
                    {request.resolvedAt
                      ? formatDateTime(request.resolvedAt)
                      : "—"}
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

function OpenRow({
  now,
  request,
}: {
  request: RefundRequestDetails;
  now: Date;
}) {
  const plan = getPlan(request.planId);

  return (
    <tr>
      <Td>{request.userEmail ?? "(no student linked)"}</Td>
      <Td>{plan.name}</Td>
      <Td>₹{request.amountInr}</Td>
      <Td className="max-w-xs whitespace-pre-wrap">{request.reason}</Td>
      <Td>{request.approvedAt ? daysSince(request.approvedAt, now) : "—"}</Td>
      <Td>
        <div className="flex flex-col gap-2">
          <form action={markRefundedAction} className="flex flex-col gap-1">
            <input name="requestId" type="hidden" value={request.id} />
            <Button size="sm" type="submit">
              Mark refunded
            </Button>
            <p className="max-w-40 text-[11px] text-muted-foreground leading-snug">
              Only click this after you've already sent the money back over UPI
              by hand.
            </p>
          </form>
          <form action={declineRefundAction}>
            <input name="requestId" type="hidden" value={request.id} />
            <Button size="sm" type="submit" variant="outline">
              Decline
            </Button>
          </form>
        </div>
      </Td>
    </tr>
  );
}
