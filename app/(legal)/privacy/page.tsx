import type { Metadata } from "next";
import { SupportEmail } from "../_components/support-email";

export const metadata: Metadata = {
  title: "Privacy Policy",
};

export default function Page() {
  return (
    <>
      <h1>Privacy Policy</h1>

      <p>Last updated: [date of launch]</p>

      <p>
        This policy explains what Able collects, why, and what you can do about
        it. Able is run by [Owner's full legal name] ("we", "us").
      </p>

      <h2>What we collect</h2>

      <div className="overflow-x-auto">
        <table className="min-w-[34rem]">
          <thead>
            <tr>
              <th>Data</th>
              <th>Where it comes from</th>
              <th>Why we need it</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>AI provider API keys you choose to contribute</td>
              <td>You, in Settings</td>
              <td>
                To add encrypted capacity to Able's shared pool for all students
              </td>
            </tr>
            <tr>
              <td>Your name, email address and profile picture</td>
              <td>Google, when you sign in</td>
              <td>To create your account and show who is signed in</td>
            </tr>
            <tr>
              <td>Your messages, the AI's answers, and chat titles</td>
              <td>You and the AI</td>
              <td>To show your chat history and continue conversations</td>
            </tr>
            <tr>
              <td>Text extracted from files you upload</td>
              <td>You</td>
              <td>So Able can answer questions about them</td>
            </tr>
            <tr>
              <td>Memories and custom instructions</td>
              <td>You, or Able when you ask it to remember something</td>
              <td>To personalise answers</td>
            </tr>
            <tr>
              <td>
                Payment records: plan, amount, UPI reference number, dates
              </td>
              <td>You, when you pay</td>
              <td>To check payments, run your plan and handle refunds</td>
            </tr>
            <tr>
              <td>
                Usage records: message counts, token counts, web searches, dates
              </td>
              <td>Our servers</td>
              <td>To apply daily limits and track our costs</td>
            </tr>
            <tr>
              <td>Basic technical logs, such as IP address and browser type</td>
              <td>Your browser</td>
              <td>To keep the service secure and fix problems</td>
            </tr>
          </tbody>
        </table>
      </div>

      <p>
        We don't collect your UPI PIN or bank details. We only see what you type
        on the payment page and what arrives in our bank account.
      </p>

      <h2>Who we share it with</h2>

      <p>We share data only with the providers that run Able:</p>

      <ul>
        <li>
          <strong>Groq</strong> processes your messages, files and voice
          recordings to produce answers.
        </li>
        <li>
          <strong>Google</strong> handles sign-in and may process text-only AI
          requests through Gemini when Groq capacity is unavailable.
        </li>
        <li>
          <strong>Vercel</strong> hosts the app.
        </li>
        <li>
          <strong>Neon</strong> stores the database.
        </li>
        <li>
          <strong>Resend</strong> sends emails, such as plan reminders, if we
          have turned email on.
        </li>
      </ul>

      <p>
        Some of these providers process data outside India. We don't sell your
        data or use it for advertising.
      </p>

      <p>
        A provider key contributed in Settings can serve requests from other
        Able students. The secret is encrypted before storage, is never shown
        again, and can be removed by its contributor at any time.
      </p>

      <h2>How long we keep it</h2>

      <p>
        We keep your account data until you delete your account. Payment records
        are kept for as long as tax and accounting laws require, even after you
        delete your account, but they are no longer linked to your profile.
      </p>

      <h2>Your choices and rights</h2>

      <ul>
        <li>
          <strong>Delete memories</strong> one by one or all at once in
          Settings, or turn memory off.
        </li>
        <li>
          <strong>Delete chats</strong> from the sidebar.
        </li>
        <li>
          <strong>Delete your account</strong> in Settings. This removes your
          chats, files, memories, settings and usage records.
        </li>
        <li>
          <strong>Ask us</strong> for a copy of your data, a correction, or
          deletion by emailing <SupportEmail />. We aim to reply within [number]
          days.
        </li>
      </ul>

      <h2>Children</h2>

      <p>
        Anyone can use Able. If you are under 18, please use Able only with your
        parent's or guardian's permission. A parent or guardian can ask us to
        delete a child's account by emailing <SupportEmail />.
      </p>

      <h2>Security</h2>

      <p>
        Data travels over encrypted connections, and access to our systems is
        limited to what is needed to run Able. No system is perfectly secure, so
        please don't upload anything you would be unwilling to have exposed.
      </p>

      <h2>Grievances</h2>

      <p>
        If you have a complaint about how we handle your data, contact our
        grievance officer, [name], at <SupportEmail />.
      </p>

      <h2>Changes</h2>

      <p>
        We will post any change to this policy here and show a notice in the app
        if the change is significant.
      </p>
    </>
  );
}
