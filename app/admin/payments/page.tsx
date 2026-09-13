import type { Metadata } from "next";
import { daysLeft } from "@/lib/billing/rules";
import {
  listPayments,
  listPendingPaymentsWithApproval,
  type PaymentWithEmail,
  type PendingPaymentWithApproval,
} from "@/lib/db/billing-queries";
import { getPlan, PLAN_DAYS } from "@/lib/plans";
import {
  EmptyState,
  Section,
  TableShell,
  Td,
  Th,
} from "../_components/section";
import { requireAdmin } from "../admin-auth";
import { formatDate, formatDateTime } from "../format";
import { ReviewButtons } from "./review-buttons";

export const metadata: Metadata = { title: "Payments" };
const PENDING_LIMIT = 200;
const RESOLVED_LIMIT = 50;

export default async function AdminPaymentsPage() {
  await requireAdmin();
  const now = new Date();
  const [pending, approved, rejected] = await Promise.all([
    listPendingPaymentsWithApproval(now, PENDING_LIMIT),
    listPayments({ limit: RESOLVED_LIMIT, status: "approved" }),
    listPayments({ limit: RESOLVED_LIMIT, status: "rejected" }),
  ]);
  const resolved = [...approved, ...rejected]
    .sort(
      (a, b) =>
        (b.reviewedAt ?? b.createdAt).getTime() -
        (a.reviewedAt ?? a.createdAt).getTime()
    )
    .slice(0, RESOLVED_LIMIT);

  return (
    <div className="flex min-w-0 flex-col gap-10">
      <Section
        description="Check the UTR and amount in your UPI app, then approve or reject with one tap. Newest first."
        title="Pending payments"
      >
        {pending.length === 0 ? (
          <EmptyState>No payments are waiting for review.</EmptyState>
        ) : (
          <>
            <div className="flex flex-col gap-3 md:hidden">
              {pending.map((payment) => (
                <article
                  aria-label={`Payment from ${payment.userEmail ?? "deleted student"}`}
                  className="flex min-w-0 flex-col gap-4 rounded-xl border border-border bg-card p-4"
                  key={payment.id}
                >
                  <PaymentDetails payment={payment} />
                  <ApprovalPreview now={now} payment={payment} />
                  <ReviewButtons
                    canApprove={Boolean(payment.userId)}
                    paymentId={payment.id}
                  />
                </article>
              ))}
            </div>
            <div className="hidden md:block">
              <TableShell>
                <thead>
                  <tr>
                    <Th>Student</Th>
                    <Th>Plan / amount</Th>
                    <Th>UTR / submitted</Th>
                    <Th>On approval</Th>
                    <Th>Actions</Th>
                  </tr>
                </thead>
                <tbody>
                  {pending.map((payment) => (
                    <tr key={payment.id}>
                      <Td className="max-w-56 wrap-anywhere">
                        {payment.userEmail ?? "(no student linked)"}
                      </Td>
                      <Td>
                        {getPlan(payment.planId).name}
                        <span className="block text-muted-foreground text-sm">
                          ₹{payment.amountInr.toLocaleString("en-IN")}
                        </span>
                      </Td>
                      <Td>
                        <span className="font-mono text-xs">{payment.utr}</span>
                        <span className="mt-1 block text-muted-foreground text-xs">
                          {formatDateTime(payment.createdAt)}
                        </span>
                      </Td>
                      <Td className="max-w-64">
                        <ApprovalPreview now={now} payment={payment} />
                      </Td>
                      <Td>
                        <ReviewButtons
                          canApprove={Boolean(payment.userId)}
                          paymentId={payment.id}
                        />
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </TableShell>
            </div>
            {pending.length === PENDING_LIMIT ? (
              <p className="text-muted-foreground text-sm">
                Showing the newest {PENDING_LIMIT} payments. More will appear as
                you review these.
              </p>
            ) : null}
          </>
        )}
      </Section>
      <Section
        description="Last 50 approved or rejected payments."
        title="Recently resolved"
      >
        {resolved.length === 0 ? (
          <EmptyState>No payment has been resolved yet.</EmptyState>
        ) : (
          <>
            <div className="flex flex-col gap-3 md:hidden">
              {resolved.map((payment) => (
                <article
                  className="flex flex-col gap-3 rounded-xl border border-border p-4"
                  key={payment.id}
                >
                  <PaymentDetails payment={payment} />
                  <p className="font-medium text-sm capitalize">
                    {payment.status}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    Reviewed{" "}
                    {payment.reviewedAt
                      ? formatDateTime(payment.reviewedAt)
                      : "—"}
                  </p>
                  {payment.reviewNote ? (
                    <p className="wrap-anywhere text-muted-foreground text-sm">
                      {payment.reviewNote}
                    </p>
                  ) : null}
                </article>
              ))}
            </div>
            <div className="hidden md:block">
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
                    <tr key={payment.id}>
                      <Td className="max-w-56 wrap-anywhere">
                        {payment.userEmail ?? "(no student linked)"}
                      </Td>
                      <Td>{getPlan(payment.planId).name}</Td>
                      <Td>₹{payment.amountInr.toLocaleString("en-IN")}</Td>
                      <Td className="font-mono text-xs">{payment.utr}</Td>
                      <Td className="capitalize">{payment.status}</Td>
                      <Td>
                        {payment.reviewedAt
                          ? formatDateTime(payment.reviewedAt)
                          : "—"}
                      </Td>
                      <Td className="max-w-64 wrap-anywhere">
                        {payment.reviewNote ?? "—"}
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </TableShell>
            </div>
          </>
        )}
      </Section>
    </div>
  );
}

function PaymentDetails({ payment }: { payment: PaymentWithEmail }) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <p className="wrap-anywhere font-medium text-sm">
        {payment.userEmail ?? "(no student linked)"}
      </p>
      <p className="text-sm">
        {getPlan(payment.planId).name} · ₹
        {payment.amountInr.toLocaleString("en-IN")}
      </p>
      <p className="text-muted-foreground text-xs">
        {formatDateTime(payment.createdAt)}
      </p>
      <p className="mt-1 wrap-anywhere font-mono text-xs">UTR {payment.utr}</p>
    </div>
  );
}

function ApprovalPreview({
  payment,
  now,
}: {
  payment: PendingPaymentWithApproval;
  now: Date;
}) {
  if (!payment.userId) {
    return (
      <p className="text-muted-foreground text-sm">
        Student account deleted. This payment can only be rejected.
      </p>
    );
  }
  const { current, endsAt, supersedeId } = payment.approval;
  const plan = getPlan(payment.planId).name;
  let description = `New: ${plan} until ${formatDate(endsAt)}.`;
  if (current && supersedeId) {
    description =
      "Switches " +
      getPlan(current.planId).name +
      " to " +
      plan +
      " now, until " +
      formatDate(endsAt) +
      ". " +
      daysLeft(current.endsAt, now) +
      " paid days on the old plan will be lost.";
  } else if (current) {
    description =
      "Adds " +
      PLAN_DAYS +
      " days to " +
      plan +
      ", now ends " +
      formatDate(endsAt) +
      ".";
  }
  return (
    <p
      className={
        "text-sm " +
        (supersedeId ? "text-destructive" : "text-muted-foreground")
      }
    >
      {description}
    </p>
  );
}
