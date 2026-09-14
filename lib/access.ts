import "server-only";

import { redirect } from "next/navigation";
import { type StudentPage, studentRedirect } from "./access-rules";
import { isAdminEmail } from "./admin";
import { getUserById } from "./db/account-queries";
import { type EntitlementSummary, getEntitlement } from "./entitlements";

/**
 * Sends the student where their plan status belongs before `page` renders,
 * and returns their entitlement when they may stay. The owner reviews
 * requests from inside the app, so admins are never redirected.
 */
export async function gateStudent(
  userId: string,
  page: StudentPage
): Promise<EntitlementSummary> {
  const [entitlement, account] = await Promise.all([
    getEntitlement(userId),
    getUserById(userId),
  ]);

  if (isAdminEmail(account?.email)) {
    return entitlement;
  }

  const target = studentRedirect(entitlement.status, page);

  if (target) {
    redirect(target);
  }

  return entitlement;
}
