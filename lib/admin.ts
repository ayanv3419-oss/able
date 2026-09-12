/**
 * Who may open /admin, from the comma-separated ADMIN_EMAILS variable.
 * Checked on the server in the admin layout and in every admin action.
 */

export function getAdminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter((email) => email.length > 0);
}

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) {
    return false;
  }

  const admins = getAdminEmails();

  return admins.length > 0 && admins.includes(email.trim().toLowerCase());
}
