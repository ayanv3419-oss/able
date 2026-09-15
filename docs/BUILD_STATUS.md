# Local v1 build status

## Shared AI key pool, 16 September 2026

- Added encrypted student-contributed Groq and Gemini keys in Settings. Secrets use AES-256-GCM, are fingerprinted for duplicate prevention, and are never returned to the browser after submission.
- Groq keys rotate across the app with Redis-backed cursors and cooldowns; the owner environment key remains a pool member. Text-only calls can fall back to Gemini, while search, research and transcription remain Groq-only.
- Invalid stored keys disable automatically. Throttled Groq keys cool for 60 seconds and Gemini keys for about six hours. A process-local fallback keeps development usable without Redis.
- Added migration `0009_flaky_stranger.sql`, provider validation, removal controls, privacy disclosure and unit coverage. This work remains local until the owner explicitly authorizes a push/deployment.

## Android startup fix, 15 September 2026

- Reproduced the v1.0.3 APK's immediate startup crash on Android 10 (API 29) and Android 15 (API 35): `IllegalArgumentException: Component class ...ManageDataLauncherActivity does not exist in app.able.mobile`.
- Registered the settings activity required by Android Browser Helper and configured its Able URL. The Android update is version 1.0.4 / version code 2, with the existing production signing certificate.
- GitHub Actions run `34916658360` built and signed the APK, reproduced the old crash, installed the update over the old APK, and passed first-launch and reopening checks on both emulators. All four updated launch crash logs were empty; captured UI dumps show the live Google sign-in button. Android 15 screenshots show the styled sign-in screen; Android 10's bundled old Chrome renders the page without modern styles, so the old-emulator result verifies startup, not current-browser styling.
- Added emulator launch checks to the release publishing requirements. Web application code and the production database are unchanged by this fix.

## Native downloads, 15 September 2026

- Added reproducible release builds for a Windows `.exe` installer, signed Android `.apk`, and macOS `.dmg`. A tagged release builds all three on their native GitHub runners and publishes stable download filenames.
- Windows and macOS use the system's Chrome/Edge app mode, and Android uses a verified Trusted Web Activity. This preserves browser-owned Google authentication instead of using an embedded WebView that Google blocks.
- Added Android signing secrets and Digital Asset Links for `app.able.mobile`. The public download page now detects the visitor's system and offers the matching native installer.
- A true iPhone build remains gated on an Apple Developer account, signing certificate and App Store/TestFlight setup; the existing Home Screen version remains available until those credentials exist.
- Local verification: repository lint, TypeScript, five focused unit tests, two browser tests, Windows launcher compilation, workflow YAML parsing and Digital Asset Links JSON parsing.

## Installable Able app, 15 September 2026

- Added a complete public `/download` page with a responsive product overview, platform-specific installation help, FAQs and install calls to action.
- Able is now an installable web app on Windows, macOS, Android, iPhone and iPad. It uses a web manifest, generated app icons and a safe service worker that does not cache private chats or API responses.
- Added entry points from sign-in and the account menu. Able still requires the internet because authentication, AI responses and chat syncing run through its cloud services.
- Verified with repository lint, TypeScript, a production build, four focused unit tests and two Chromium browser tests, including a 390px phone layout with no horizontal overflow.

## Payment workflow update, 15 September 2026

- Follows the owner's board: plan page, UPI payment, a Request button with no reference number, then the owner allows or rejects. Rejecting blocks the student until the owner unblocks them on the Requests page or the student's detail page.
- Students without a plan start on `/pricing`. A sent request shows `/waiting`, which opens the chat once allowed; a rejected one shows `/blocked`. Students whose plan ended can still open old chats. Admins are never redirected.
- Built on the live approval page, with the PDF and research work rebased onto it (`02ceafc`; its migration is now `0006_feature_runs`). This adds migration `0007_request_flow` (`Payment.utr` nullable, `User.blockedAt`). The local database got `0005_approve_gate` by hand, because Drizzle skips migrations older than the last one applied.
- Verified: 125 unit/database tests on a freshly migrated test database, and 31 browser scenarios across approval, complete flows, projects, pricing, home screen, sign-in and chat. The approval scenario covers the plan-page start, the Request button, the waiting screen, a confirmed Reject that blocks everywhere, Unblock, and Allow opening the chat. TypeScript and Biome pass.
- Fixed a development-only connection leak: `lib/db/client.ts` opened a new pool on every hot reload and filled all 100 connections of the local database. It now keeps one pool per process and closes idle connections after 20 seconds.
- Not pushed or deployed.

## Payment approval update, 14 September 2026

- Built on `feat/approve-gate` in `D:\able-wt\approve-gate`. The isolated, no-login demo runs at http://localhost:3107/admin/payments with synthetic sample payments.
- The admin menu shows the exact pending count. Payment reviews use cards on phones and a table on desktop, with the resulting plan dates and any lost paid days shown before one-tap approval or rejection.
- Rejections show a fixed retry/support message. Rejected UTRs can be submitted again, while pending, approved and refunded references remain protected by a database unique index. The submitted plan is authoritative and the optional student note is removed.
- Verified: 111 unit/database tests, both focused browser scenarios (approval/resubmission/access controls and the existing payment/refund flow), TypeScript and repository lint. Phone and desktop screenshots were inspected. Cold compilation required a longer local browser-test timeout.
- The owner authorized production publication on 14 September. Migration `0005_approve_gate` runs through the existing production build command; it preserves payment history.

Updated 14 September 2026. The local app runs at http://localhost:3105/ without Google sign-in. Keep this server running until the owner asks to stop it.

## Implemented

- PDF exports: completed answers have **Save as PDF** and text documents have **Download PDF**. Playwright/Chromium produces selectable A4 PDFs with tables, code, KaTeX maths, Mermaid diagrams and English/Hindi/Gujarati fonts. Document previews can be opened by keyboard. The document tool can preserve full supplied content instead of regenerating from only a title.
- Deep research: Plus runs two evidence passes (3 reports/day), Pro four (10/day), then Groq writes a report with persisted source links. Verified bracketed URL citations are converted to clickable Markdown without interrupting streaming. Search/model usage is metered; failed or cancelled reports release the report reservation.
- PDF limits (Basic 5, Plus 20, Pro 50/day), research limits and upload insertion use transactional reservations/locks. Source ownership and active plans are checked on the server. Migration `0005_feature_runs` is applied to the local preview and isolated test databases. Limits and rendering setup are documented in `SPEC.md` section 13 and the README.
- Pricing copy now exposes the built PDF/research features; only the assistant system remains marked Coming soon. Pro's folder-cap message no longer asks users to upgrade beyond Pro.
- Live Groq chat, streaming, stop, edit and regenerate; persisted conversations.
- Web-search toggle, persisted source links, and actual search usage accounting. The Groq raw `executed_tools` stream adapter covers the field omitted by the installed provider.
- PDF/DOCX/TXT/MD/CSV extraction with size, text-length, plan and ownership checks; voice transcription up to 60 seconds.
- Custom instructions, saved memories, project folders and project instructions.
- Project navigation: the sidebar's single "Projects" entry opens `/projects`, a grid of gray folders sorted A to Z that show only their names. Each folder's "…" menu renames or deletes it. A folder opens `/project/[id]`, its chat list, and each chat opens the existing `/chat/[id]`. The old `/project/[id]/folder` address redirects to `/project/[id]`. Includes creation timestamps, empty/loading/error states and server-side ownership checks on both the project and chats. No database schema change.
- Home screen: an empty chat says "Good morning", "Good afternoon" or "Good evening" by the student's clock, with the Settings nickname or the Google first name, and the four suggestions sit right under it. The top-bar sharing lock, the sidebar "Delete all" button, the /purge command and the delete-all-chats API are removed. The usage card left the chat screen; one line with Renew shows only when fewer than 10 messages are left today or the plan ends within three days.
- Personalized project intelligence: every chat receives the student's profile, custom instructions, only the relevant memories, and, inside a project, its name, instructions, relevant project memories and relevant excerpts from the project's other chats, in the priority order in `docs/SPEC.md` §6. Project memories and chats never reach chats outside their project or another student. Replies match the language of the message (English, Hindi, Hinglish, Gujarati), with an optional saved reply language. `saveMemory` saves to the current project or globally. Settings has a profile section and labels project memories.
- Malformed stored JSON, such as a message or profile saved as a string, degrades gracefully instead of breaking project chats or Settings.
- Plan usage and daily cost limits, manual UPI submissions and approval, queued renewals, plan changes, refunds and admin views.
- Serialized payment approvals/project creation and a database constraint preventing multiple pending payments per student.
- Optional payment review/reminder emails; failed email delivery remains retryable.
- Separate test database, browser test server and build directory; CI uses its own Postgres service.
- Payment, refund and project controls wait for hydration, so early typing or clicks cannot be lost while the page loads.

Every plan uses the owner's FamX UPI account, configured only in `.env.local` (`UPI_ID`) and verified against the supplied QR code. QR codes and mobile payment links prefill the plan amount; submitted references still need manual approval. Local payment configuration is read from `.env.local` without restarting the server. Production authentication remains enabled; the no-login workspace is limited to development mode.

## Verification, 14 September 2026

- All 42 browser scenarios passed in one run, including both real PDF downloads, saved research sources and usage, plan/ownership limits, concurrent uploads, normal chat, editing/regeneration, projects, payments and refunds. Downloaded PDFs were also parsed to verify their text; a sample with maths, diagrams and Hindi/Gujarati was visually inspected.
- The full unit/database run passed 117 tests; the subsequent citation-stream test also passed, covering URLs split between chunks and unverified citations.
- The production build and TypeScript passed. Biome passed across the repository and on the final changed code. The PDF function trace contains Chromium, Mermaid, KaTeX and all three embedded language fonts, with no missing files (about 127 MB of unique files; repeated symlink paths are counted once).
- A live Groq research check collected 18 source URLs through three searches and produced a report. Its bracketed citation format prompted the streaming normalization fix. The repeat live check was blocked by the account's 200,000-token daily quota; no further live requests were made.
- These changes are local on `codex/finish-able`; they have not been pushed or deployed. The assistant-system feature remains future work.

## Earlier verification, 13 September 2026

- Evening, after the Projects folder grid and the home screen changes: 104 unit and database tests and all 35 browser scenarios passed, and TypeScript and Biome are clean for the whole repository. The production build was not re-run for these two changes.
- 96 unit and database integration tests passed, including checks that project memories and chats never leak across projects or owners, and that malformed stored JSON is tolerated.
- 29 of 30 browser scenarios passed in a full run. The remaining one, the settings flow, was updated for the new profile form and labels and passed in a focused rerun with the other full-flow tests.
- Production build passed, including TypeScript and all 37 generated pages.
- TypeScript and Biome passed for the whole repository.
- Live Groq check on the running app: inside a project, the answer followed the project's instruction and continued the previous day's conversation from another chat in that project. Outside it, the answer was in Hinglish, used the profile name and ignored the project's instruction. All temporary test data was removed afterwards.

### Earlier checks, 12 September 2026

- Live Groq chat, voice transcription and web search (10 source links persisted, one search recorded in usage) returned successful responses.
- Live memory save was verified in chat, the database and Settings, then deleted through Settings.
- The complete payment approval and refund lifecycle was tested, with access revoked after refunding. The three payment pages' QR codes decoded to the configured account with amounts of ₹250, ₹800 and ₹1,200.

## Live deployment, 13 September 2026

Able runs at https://able-alpha.vercel.app on the Vercel project `able`. The code is public at https://github.com/ayanv3419-oss/able, and the Vercel project is connected to that repository, so every push to `main` deploys to production automatically.

- Server functions are set to run in Mumbai (`bom1`), next to the database.
- The database is a separate Supabase project connected through Vercel Storage (Mumbai, Free plan), which sets `POSTGRES_URL`. The build ran the migrations.
- Google sign-in uses Able's own Google Cloud project with the app name "Able", published for any Google account.
- Production has fresh `AUTH_SECRET` and `CRON_SECRET` values, the owner's admin, UPI and support settings, `NEXT_PUBLIC_APP_URL`, and the Google keys.
- A check without logging in confirmed that the Google button uses Able's key and returns to the live site, the legal pages load, and the cron route rejects requests without its secret.

## Before selling

- Replace the Groq API key, because the current one was pasted into a Codex chat, and confirm the Groq limits for expected traffic.
- Move Vercel to Pro, because the Hobby plan is non-commercial, and Supabase to Pro so the database never pauses.
- Review the legal-page placeholders and confirm the support and contact details.
- Configure a verified email sender and Resend key if email notifications are wanted.

The owner can also keep using the local app at http://localhost:3105/.
