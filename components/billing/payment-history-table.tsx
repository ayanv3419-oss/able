import type { Payment } from "@/lib/db/schema";
import { getPlan } from "@/lib/plans";

const STATUS_LABEL: Record<Payment["status"], string> = {
  approved: "Approved",
  pending: "Waiting for approval",
  refunded: "Refunded",
  rejected: "Rejected",
};

const STATUS_CLASS: Record<Payment["status"], string> = {
  approved: "text-emerald-600 dark:text-emerald-400",
  pending: "text-muted-foreground",
  refunded: "text-muted-foreground",
  rejected: "text-destructive",
};

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    timeZone: "Asia/Kolkata",
    year: "numeric",
  });
}

/** Payment history table for `/billing`: plan, amount, date and status. */
export function PaymentHistoryTable({ payments }: { payments: Payment[] }) {
  if (payments.length === 0) {
    return <p className="text-muted-foreground text-sm">No payments yet.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-border text-muted-foreground">
            <th className="px-4 py-2 font-medium" scope="col">
              Plan
            </th>
            <th className="px-4 py-2 font-medium" scope="col">
              Amount
            </th>
            <th className="px-4 py-2 font-medium" scope="col">
              Date
            </th>
            <th className="px-4 py-2 font-medium" scope="col">
              Status
            </th>
          </tr>
        </thead>
        <tbody>
          {payments.map((payment) => (
            <tr
              className="border-b border-border last:border-0"
              key={payment.id}
            >
              <td className="px-4 py-2">{getPlan(payment.planId).name}</td>
              <td className="px-4 py-2">
                ₹{payment.amountInr.toLocaleString("en-IN")}
              </td>
              <td className="px-4 py-2">{formatDate(payment.createdAt)}</td>
              <td className={`px-4 py-2 ${STATUS_CLASS[payment.status]}`}>
                {STATUS_LABEL[payment.status]}
                {payment.status === "rejected" && payment.reviewNote ? (
                  <span className="block text-muted-foreground text-xs">
                    {payment.reviewNote}
                  </span>
                ) : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
