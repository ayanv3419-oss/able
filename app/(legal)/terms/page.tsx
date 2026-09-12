import type { Metadata } from "next";
import Link from "next/link";
import { SupportEmail } from "../_components/support-email";

export const metadata: Metadata = {
  title: "Terms of Service",
};

export default function Page() {
  return (
    <>
      <h1>Terms of Service</h1>

      <p>Last updated: [date of launch]</p>

      <p>
        These terms are an agreement between you and [Owner's full legal name],
        who runs Able ("we", "us"). By signing in to Able, you agree to them. If
        you don't agree, don't use Able.
      </p>

      <h2>1. What Able is</h2>

      <p>
        Able is an AI chat assistant. You type or speak a question, and Able
        answers using an AI model provided by Groq. Able can also search the
        web, read files you upload, and remember things you ask it to remember.
      </p>

      <h2>2. Who can use Able</h2>

      <p>
        Anyone can use Able. If you are under 18, you must have permission from
        a parent or guardian, and they are responsible for your use of Able.
      </p>

      <h2>3. Your account</h2>

      <p>
        You sign in with a Google account. Keep that account secure. Don't share
        your Able account with anyone else. We may suspend accounts that are
        shared, used by automated scripts, or used to break these terms.
      </p>

      <h2>4. Plans and payment</h2>

      <p>
        Able has three paid plans. Each lasts 30 days from the moment we approve
        your payment.
      </p>

      <table>
        <thead>
          <tr>
            <th>Plan</th>
            <th>Price</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Basic</td>
            <td>₹250</td>
          </tr>
          <tr>
            <td>Plus</td>
            <td>₹800</td>
          </tr>
          <tr>
            <td>Pro</td>
            <td>₹1,200</td>
          </tr>
        </tbody>
      </table>

      <ul>
        <li>
          You pay by UPI to the account shown on the payment page, then enter
          your UPI reference number.
        </li>
        <li>
          We check each payment by hand. Your plan starts when we approve it,
          which can take several hours.
        </li>
        <li>
          Plans do not renew automatically. To keep using Able, pay again before
          your plan ends.
        </li>
        <li>
          Renewing the same plan early adds 30 days to your current end date.
          Buying a different plan starts it immediately and ends your old plan
          without a partial refund.
        </li>
        <li>
          Prices may change. A change never affects a plan you have already paid
          for.
        </li>
      </ul>

      <h2>5. Daily limits and fair use</h2>

      <p>
        Each plan has a daily message allowance, shown in the app. Messages that
        search the web or read large files use more of your allowance, because
        they cost more to answer. The Pro plan is shown as unlimited, but a
        fair-use limit applies to stop automated or shared use. Allowances reset
        at midnight India time.
      </p>

      <h2>6. Acceptable use</h2>

      <p>Don't use Able to:</p>

      <ul>
        <li>break any law or help someone else break one;</li>
        <li>
          create content that sexually exploits anyone, promotes violence or
          harassment, or targets people for who they are;
        </li>
        <li>try to get around limits, security or payments;</li>
        <li>overload, scrape or attack the service;</li>
        <li>claim that Able's answers were written by a human expert.</li>
      </ul>

      <h2>7. AI answers can be wrong</h2>

      <p>
        Able's answers come from an AI model. They can be incomplete, out of
        date or simply wrong, even when they sound confident. Check important
        answers yourself, especially for exams, health, money or legal matters.
        Able is not a substitute for a teacher, doctor, lawyer or other
        professional.
      </p>

      <h2>8. Your content</h2>

      <p>
        You own what you type and upload. You give us permission to store it and
        send it to our service providers only to run Able for you. We don't sell
        your content. You are responsible for having the right to upload any
        file you share with Able.
      </p>

      <h2>9. Availability</h2>

      <p>
        Able depends on outside services, including Groq, Google, and our
        hosting and database providers. We don't promise that Able will always
        be available or error-free, and we may change or stop features.
      </p>

      <h2>10. Refunds</h2>

      <p>
        Refunds follow our Refund Policy at{" "}
        <Link href="/refunds">/refunds</Link>.
      </p>

      <h2>11. Ending your use</h2>

      <p>
        You can delete your account at any time from Settings. We may suspend or
        close an account that breaks these terms. If we close your account
        without cause while a plan is active, we will refund the unused days.
      </p>

      <h2>12. Liability</h2>

      <p>
        To the extent the law allows, Able is provided "as is", and our total
        liability to you for any claim is limited to the amount you paid us in
        the 30 days before the claim.
      </p>

      <h2>13. Governing law</h2>

      <p>
        These terms are governed by the laws of India. Disputes go to the courts
        of [city], [state].
      </p>

      <h2>14. Changes</h2>

      <p>
        We may update these terms. If a change is significant, we will show a
        notice in the app before it applies.
      </p>

      <h2>15. Contact</h2>

      <p>
        Questions about these terms: <SupportEmail />.
      </p>
    </>
  );
}
