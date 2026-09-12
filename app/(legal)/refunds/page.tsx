import type { Metadata } from "next";
import Link from "next/link";
import { SupportEmail } from "../_components/support-email";

export const metadata: Metadata = {
  title: "Refund Policy",
};

export default function Page() {
  return (
    <>
      <h1>Refund Policy</h1>

      <p>Last updated: [date of launch]</p>

      <h2>7-day money back</h2>

      <p>
        If you're not happy with Able, you can ask for a full refund within 7
        days of the moment your plan was approved.
      </p>

      <ol>
        <li>
          Open <strong>Settings</strong>, then <strong>Billing</strong>, and
          choose <strong>Request a refund</strong>.
        </li>
        <li>
          Tell us briefly why. Your reason helps us improve Able, but it doesn't
          affect your refund.
        </li>
        <li>
          We send the full amount back to the UPI account you paid from, usually
          within [number] working days.
        </li>
      </ol>

      <p>Your plan ends as soon as the refund is marked as sent.</p>

      <h2>Always refunded in full</h2>

      <ul>
        <li>You paid twice for the same plan by mistake.</li>
        <li>You paid, but your plan was never activated.</li>
      </ul>

      <p>
        Email <SupportEmail /> with your UPI reference number if either happens
        to you.
      </p>

      <h2>Not refunded</h2>

      <ul>
        <li>Requests made more than 7 days after your plan was approved.</li>
        <li>The unused days of a plan when you switch to a different plan.</li>
        <li>
          Plans suspended because the account broke our{" "}
          <Link href="/terms">Terms of Service</Link>.
        </li>
      </ul>

      <h2>Questions</h2>

      <p>
        Email <SupportEmail />.
      </p>
    </>
  );
}
