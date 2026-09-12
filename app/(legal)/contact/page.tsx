import type { Metadata } from "next";
import { SupportEmail } from "../_components/support-email";

export const metadata: Metadata = {
  title: "Contact",
};

export default function Page() {
  return (
    <>
      <h1>Contact</h1>

      <p>Able is run by [Owner's full legal name].</p>

      <ul>
        <li>
          <strong>Email:</strong> <SupportEmail />
        </li>
        <li>
          <strong>Payments and refunds:</strong> include your UPI reference
          number so we can find your payment quickly.
        </li>
        <li>
          <strong>Outside India?</strong> Payment is by UPI only for now. Email
          us and we'll let you know if another way to pay becomes available.
        </li>
      </ul>

      <p>We usually reply within [number] working days.</p>
    </>
  );
}
