import type { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { listPayments, type PaymentWithEmail } from "@/lib/db/billing-queries";
import { getPlan } from "@/lib/plans";
import {
  EmptyState,
  Section,
  TableShell,
  Td,
  Th,
} from "../_components/section";
import { formatDateTime } from "../format";
import { approvePaymentAction, rejectPaymentAction } from "./actions";

export const metadata: Metadata = {
  title: "Payments",
};

const PENDING_LIMIT = 200;
const RESOLVED_LIMIT = 50;

export default async function AdminPaymentsPage() {
  const [pending, approved, rejected] = await Promise.all([
    listPayments({ limit: PENDING_LIMIT, status: "pending" }),
    listPayments({ limit: RESOLVED_LIMIT, status: "approved" }),
    listPayments({ limit: RESOLVED_LIMIT, status: "rejected" }),
  ]);

  const resolved = [...approved, ...rejected]
    .sort((a, b) => {
      const aTime = a.reviewedAt?.getTime() ?? a.createdAt.getTime();
      const bTime = b.reviewedAt?.getTime() ?? b.createdAt.getTime();
      return bTime - aTime;
    })
    .slice(0, RESOLVED_LIMIT);

  return (
    <div className="flex flex-col gap-10">
      <Section
        description="Newest first. Approving starts or extends the student's plan; rejecting asks for a short reason the student can see."
        title="Pending payments"
      >
        {pending.length === 0 ? (
          <EmptyState>No payments are waiting for review.</EmptyState>
        ) : (
          <TableShell>
            <thead>
              <tr>
                <Th>Student</Th>
                <Th>Plan</Th>
                <Th>Amount</Th>
                <Th>UTR</Th>
                <Th>Submitted</Th>
                <Th>Actions</Th>
              </tr>
            </thead>
            <tbody>
              {pending.map((payment) => (
                <PendingRow key={payment.id} payment={payment} />
              ))}
            </tbody>
          </TableShell>
        )}
      </Section>

      <Section
        description="Last 50 approved or rejected payments."
        title="Recently resolved"
      >
        {resolved.length === 0 ? (
          <EmptyState>No payment has been resolved yet.</EmptyState>
        ) : (
          <TableShell>
            <thead>
              <tr>
                <Th>Student</Th>
                <Th>Plan</Th>
                <Th>Amount</Th>
                <Th>UTR</Th>
                <Th>Status</Th>
                <Th>Reviewed</Th>
                <Th>Note</Th>
              </tr>
            </thead>
            <tbody>
              {resolved.map((payment) => (
                <ResolvedRow key={payment.id} payment={payment} />
              ))}
            </tbody>
          </TableShell>
        )}
      </Section>
    </div>
  );
}

function PendingRow({ payment }: { payment: PaymentWithEmail }) {
  const plan = getPlan(payment.planId);

  return (
    <tr>
      <Td>{payment.userEmail ?? "(no student linked)"}</Td>
      <Td>{plan.name}</Td>
      <Td>₹{payment.amountInr}</Td>
      <Td className="font-mono text-xs">{payment.utr}</Td>
      <Td>{formatDateTime(payment.createdAt)}</Td>
      <Td>
        <div className="flex flex-col gap-2">
          <form action={approvePaymentAction}>
            <input name="paymentId" type="hidden" value={payment.id} />
            <Button size="sm" type="submit">
              Approve
            </Button>
          </form>
          <form action={rejectPaymentAction} className="flex flex-col gap-2">
            <input name="paymentId" type="hidden" value={payment.id} />
            <Textarea
              className="min-h-9 w-56 text-xs"
              name="reviewNote"
              placeholder="Reason the student will see"
              required
            />
            <Button size="sm" type="submit" variant="destructive">
              Reject
            </Button>
          </form>
        </div>
      </Td>
    </tr>
  );
}

function ResolvedRow({ payment }: { payment: PaymentWithEmail }) {
  const plan = getPlan(payment.planId);

  return (
    <tr>
      <Td>{payment.userEmail ?? "(no student linked)"}</Td>
      <Td>{plan.name}</Td>
      <Td>₹{payment.amountInr}</Td>
      <Td className="font-mono text-xs">{payment.utr}</Td>
      <Td className="capitalize">{payment.status}</Td>
      <Td>{payment.reviewedAt ? formatDateTime(payment.reviewedAt) : "—"}</Td>
      <Td>{payment.reviewNote ?? "—"}</Td>
    </tr>
  );
}
