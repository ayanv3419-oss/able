import type { EntitlementStatus } from "./entitlements";

/** The pages a signed-in student opens, grouped by how the gate treats them. */
export type StudentPage =
  | "home"
  | "chat"
  | "projects"
  | "settings"
  | "billing"
  | "pricing"
  | "pay"
  | "waiting"
  | "blocked";

const PLAN_PAGE = "/pricing";
const WAITING_PAGE = "/waiting";
const BLOCKED_PAGE = "/blocked";

/**
 * Where a student is sent instead of `page`, or null to let them in. It follows
 * the owner's board: no plan goes to the plan page, a sent request to the
 * waiting screen, an allowed one to the app, and a rejected one to the blocked
 * screen. A student whose plan ended can still read old chats and projects.
 */
export function studentRedirect(
  status: EntitlementStatus,
  page: StudentPage
): string | null {
  if (status === "blocked") {
    return page === "blocked" ? null : BLOCKED_PAGE;
  }
  if (page === "blocked") {
    return "/";
  }
  if (status === "active") {
    return page === "waiting" ? "/" : null;
  }
  if (status === "pending") {
    return page === "home" || page === "pay" ? WAITING_PAGE : null;
  }
  if (status === "expired") {
    return page === "home" || page === "waiting" ? PLAN_PAGE : null;
  }
  return page === "home" ||
    page === "chat" ||
    page === "projects" ||
    page === "waiting"
    ? PLAN_PAGE
    : null;
}
