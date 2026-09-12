/**
 * Renders SUPPORT_EMAIL when it is configured, and leaves the draft
 * placeholder visible when it is not, so the owner can spot what is
 * still to fill in.
 */
export function SupportEmail() {
  const email = process.env.SUPPORT_EMAIL?.trim();

  if (email) {
    return <a href={`mailto:${email}`}>{email}</a>;
  }

  return <span>[support email]</span>;
}
