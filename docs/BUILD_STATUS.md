# Local v1 build status

Updated 13 September 2026. The local app runs at http://localhost:3105/ without Google sign-in. Keep this server running until the owner asks to stop it.

## Implemented

- Live Groq chat, streaming, stop, edit and regenerate; persisted conversations.
- Web-search toggle, persisted source links, and actual search usage accounting. The Groq raw `executed_tools` stream adapter covers the field omitted by the installed provider.
- PDF/DOCX/TXT/MD/CSV extraction with size, text-length, plan and ownership checks; voice transcription up to 60 seconds.
- Custom instructions, saved memories, project folders and project instructions.
- Project navigation: `/projects` → `/project/[id]` → `/project/[id]/folder` → the existing `/chat/[id]`. Includes real conversation counts, creation timestamps, empty/loading/error states and server-side ownership checks on both the project and chats. No database schema change.
- Personalized project intelligence: every chat receives the student's profile, custom instructions, only the relevant memories, and, inside a project, its name, instructions, relevant project memories and relevant excerpts from the project's other chats, in the priority order in `docs/SPEC.md` §6. Project memories and chats never reach chats outside their project or another student. Replies match the language of the message (English, Hindi, Hinglish, Gujarati), with an optional saved reply language. `saveMemory` saves to the current project or globally. Settings has a profile section and labels project memories.
- Malformed stored JSON, such as a message or profile saved as a string, degrades gracefully instead of breaking project chats or Settings.
- Plan usage and daily cost limits, manual UPI submissions and approval, queued renewals, plan changes, refunds and admin views.
- Serialized payment approvals/project creation and a database constraint preventing multiple pending payments per student.
- Optional payment review/reminder emails; failed email delivery remains retryable.
- Separate test database, browser test server and build directory; CI uses its own Postgres service.
- Payment, refund and project controls wait for hydration, so early typing or clicks cannot be lost while the page loads.

Every plan uses the owner's FamX UPI account, configured only in `.env.local` (`UPI_ID`) and verified against the supplied QR code. QR codes and mobile payment links prefill the plan amount; submitted references still need manual approval. Local payment configuration is read from `.env.local` without restarting the server. Production authentication remains enabled; the no-login workspace is limited to development mode.

## Verification, 13 September 2026

- 96 unit and database integration tests passed, including checks that project memories and chats never leak across projects or owners, and that malformed stored JSON is tolerated.
- 29 of 30 browser scenarios passed in a full run. The remaining one, the settings flow, was updated for the new profile form and labels and passed in a focused rerun with the other full-flow tests.
- Production build passed, including TypeScript and all 37 generated pages.
- TypeScript and Biome passed for the whole repository.
- Live Groq check on the running app: inside a project, the answer followed the project's instruction and continued the previous day's conversation from another chat in that project. Outside it, the answer was in Hinglish, used the profile name and ignored the project's instruction. All temporary test data was removed afterwards.

### Earlier checks, 12 September 2026

- Live Groq chat, voice transcription and web search (10 source links persisted, one search recorded in usage) returned successful responses.
- Live memory save was verified in chat, the database and Settings, then deleted through Settings.
- The complete payment approval and refund lifecycle was tested, with access revoked after refunding. The three payment pages' QR codes decoded to the configured account with amounts of ₹250, ₹800 and ₹1,200.

## Before a public launch

- Configure hosted Postgres, the deployment URL, production Google OAuth and the owner's admin email.
- Configure the FamX account in the production environment, confirm support/contact details, and review the legal-page placeholders.
- Configure a verified email sender and Resend key if email notifications are wanted.
- Set the production cron secret, confirm the Groq account limits for expected traffic, and create a fresh Groq API key for production.

No code has been pushed or deployed. The owner can use the local app now.
