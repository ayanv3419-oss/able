# Able: product and build spec

Able is a paid, ChatGPT-style assistant for students. This file is the single source of truth for every agent working on it. It records the owner's decisions from a design interview on 2026-09-11. Do not change a decision marked **OWNER**; raise it in your report instead.

## 1. Product decisions

| Area | Decision | Source |
|---|---|---|
| Purpose | A learning app for studies that behaves like ChatGPT | OWNER |
| Audience | Any student, worldwide sign-up | OWNER |
| Positioning | Pure ChatGPT clone. No study-specific features beyond ChatGPT's | OWNER |
| Minimum age | None | OWNER |
| Money | Paid only. No free plan, no trial | OWNER |
| AI provider | Shared Groq key pool for answers, with Gemini text-only fallback | OWNER update, 2026-09-16 |
| Capacity | Owner base key plus encrypted student-contributed Groq/Gemini keys | OWNER update, 2026-09-16 |
| Sign-in | Local v1 opens without sign-in (owner update, 2026-09-12); Google retained for connected mode | OWNER |
| Payment | Owner's own UPI QR code. No payment company | OWNER |
| Activation | Owner approves each payment by hand on an admin page. No alerts | OWNER |
| Plan length | 30 days from approval | default |
| Refunds | 7-day money back, paid back by hand over UPI | OWNER |
| Metering | Messages weighted by real cost. Owner had no preference | default, re-confirm |
| Name | Able | OWNER |
| Code | Public GitHub repo, pushed only when the owner says go | OWNER |
| Hosting | Vercel free plan at launch | OWNER |
| Base | vercel/ai-chatbot template, Apache-2.0 | OWNER |

### Plans

| Plan id | Display name | Price | Dollar reference | Reasoning effort | Daily messages | Project folders |
|---|---|---|---|---|---|---|
| `basic` | Basic | ₹250 / 30 days | $2.99 | `low` | 40 | 3 |
| `plus` | Plus | ₹800 / 30 days | $8.99 | `medium` | 100 | 20 |
| `pro` | Pro | ₹1,200 / 30 days | $12.99 | `high` | shown as Unlimited, hidden fair-use ceiling of 150 | 40 |

Daily file uploads are capped per plan: Basic 5, Plus 20, Pro none. The count resets at midnight India time, like messages. Each answer draws on at most 3 (Basic), 6 (Plus) or 10 (Pro) saved memories and, inside a project, the same number of past-chat excerpts.

Display names are a default; the owner described the plans but did not name them. Prices are charged in rupees only. Dollar amounts are shown for reference.

Every plan includes: streaming chat, stop, regenerate, edit-and-resend, chat history with search, rename and delete, project folders, Markdown with code blocks and maths, a collapsible reasoning view, web search, file uploads, voice input, memory, custom instructions, dark mode and a phone-friendly layout.

## 2. Defaults chosen by the builder

These fill gaps the interview did not cover. Keep them unless the owner overrides.

- Daily limits reset at midnight Asia/Kolkata.
- Web search is a toggle in the composer, like ChatGPT's search button. The server also enables search automatically for clearly freshness-sensitive requests (current news, live information, product specifications, launch dates, prices and availability) so Able does not guess changeable facts.
- Answers are family-safe for every user, because there is no age limit.
- Titles for new chats come from `openai/gpt-oss-20b` on Groq. Title cost is recorded but never charged to the student's daily budget.
- Plan changes are not pro-rated. Renewing the same plan early extends the end date. Paying for a different plan starts it immediately and ends the old period.
- An expired or refunded student can still read old chats but cannot send messages.
- Deleting a project moves its chats out of the project. It never deletes chats.
- Uploaded files are stored as extracted text only. Images are rejected with a clear message, because Groq has no vision model.
- Groq rate-limit errors show "Able is busy right now, try again in a minute" and cost the student nothing.
- Students get an email when their plan is approved or rejected and three days before it ends, but only if `RESEND_API_KEY` is set.
- The template's weather tool, image artifacts, model picker, guest login and email-and-password sign-up are removed.

## 3. Stack

From the template, unchanged unless listed: Next.js 16 App Router with `proxy.ts`, React 19, AI SDK 7 (`ai`, `@ai-sdk/react`), Auth.js v5 (`next-auth` beta), Drizzle ORM with the `postgres` driver, shadcn/ui with Tailwind 4, Biome through `ultracite`, Playwright e2e tests, pnpm through corepack.

Added: `@ai-sdk/groq` and `@ai-sdk/google` for model calls, `qrcode` for UPI QR images, `unpdf` for PDF text, `mammoth` for DOCX text, `vitest` for unit tests, `embedded-postgres` for a local database, `resend` for optional email.

Removed: the Vercel AI Gateway, and `@vercel/blob` for uploads.

## 4. Data model

Existing template tables stay: `User`, `Chat`, `Message_v2`, `Vote_v2`, `Document`, `Suggestion`, `Stream`. Changes:

- `User.email` widens to `varchar(255)`. Password stays nullable and unused.
- `Chat.projectId`: nullable uuid referencing `Project.id`, set to null when the project is deleted.
- `User.blockedAt`: nullable timestamp, set when the owner rejects a request and cleared by Unblock.

New tables, all with uuid primary keys and `createdAt` timestamps:

| Table | Columns |
|---|---|
| `Project` | `userId` → User, `name` text up to 60 chars, `instructions` text nullable, `updatedAt` |
| `Payment` | `userId` → User nullable with set-null on delete, `planId` enum basic/plus/pro, `amountInr` int, `utr` varchar(32) nullable (only on requests sent before 15 September 2026; unique except rejected), `studentNote` text nullable, `status` enum pending/approved/rejected/refunded, `reviewNote` text nullable, `reviewedAt` nullable, `reviewedBy` text nullable |
| `Subscription` | `userId` → User, `planId`, `paymentId` → Payment unique, `startsAt`, `endsAt`, `status` enum active/superseded/revoked/refunded, `reminderSentAt` nullable |
| `RefundRequest` | `paymentId` → Payment unique, `userId` → User, `reason` text, `status` enum open/refunded/declined, `resolvedAt` nullable, `resolvedBy` text nullable |
| `UsageEvent` | `userId` → User, `chatId` nullable, `kind` enum chat/transcription/title, `planId` nullable, `inputTokens`, `cachedInputTokens`, `outputTokens`, `reasoningTokens`, `webSearches`, `audioSeconds` ints default 0, `costMicros` int (US dollars times one million), `countsTowardLimit` boolean. Index on (`userId`, `createdAt`) |
| `Memory` | `userId` → User, `content` text up to 500 chars, `projectId` → Project nullable (project memory; deleted with its project) |
| `UserSettings` | `userId` primary key → User, `aboutMe` text up to 1,500 chars, `responseStyle` text up to 1,500 chars, `memoryEnabled` boolean default true, `profile` json (name, role, interests, learning and response preferences, reply language), `updatedAt` |
| `Attachment` | `userId` → User, `chatId` nullable, `name`, `mediaType`, `text`, `charCount` int |
| `ApiKey` | contributor `userId` → User (cascade delete), provider `groq`/`gemini`, optional label, AES-256-GCM encrypted secret, masked preview, unique SHA-256 fingerprint, active/disabled status and last failure |

A subscription is current when its status is `active` and `startsAt <= now < endsAt`. "Expired" is derived from `endsAt`, never stored.

## 5. Metering

All prices are US dollars per million tokens unless stated. Confirm them on Groq's billing page before launch.

| Item | Price |
|---|---|
| gpt-oss-120b input | 0.15 |
| gpt-oss-120b cached input | 0.075 |
| gpt-oss-120b output, reasoning included | 0.60 |
| openai/gpt-oss-20b input / output | 0.075 / 0.30 |
| Web search | 0.005 per search, from third-party trackers |
| Whisper large v3 turbo | 0.04 per hour of audio |

- `costMicros` for a request = uncached input × 0.15 + cached input × 0.075 + output × 0.60, per million tokens and converted to micro-dollars, plus searches × 5,000, plus audio seconds × 0.04 ÷ 3,600 × 1,000,000. Round up.
- A plan's reference message cost = 3,000 input tokens at the input price plus a reference output of 700 tokens for `low`, 1,500 for `medium` and 3,000 for `high`. That gives 870, 1,350 and 2,250 micro-dollars.
- Daily budget = daily messages × reference message cost.
- Messages left today = floor((budget − cost counted today) ÷ reference message cost).
- A student may send when messages left is at least 1. One expensive message may overshoot slightly; that is accepted.
- Pro shows "Unlimited" but enforces the 150-message ceiling. Its block message says the daily fair-use limit was reached.
- Record usage from the AI SDK's reported usage after every assistant response, including aborted ones where usage exists. Count provider-executed `browser_search` calls as searches.

## 6. AI behaviour

- Provider: each request selects an active shared key. Groq keys rotate with a Redis cursor; `GROQ_API_KEY` is the synthetic `env` member. A 429 cools Groq for 60 seconds and Gemini for about six hours; a 401/403 disables a stored key. With Redis unavailable, one process uses random selection and in-memory cooldowns. Text-only work falls back to `gemini-2.5-flash` after Groq is unavailable. Web search, research and transcription stay Groq-only. Chat uses `openai/gpt-oss-120b`; titles use `openai/gpt-oss-20b`.
- Test runs keep the template's mock models when `isTestEnvironment` is true. No test may call Groq.
- System prompt: Able is a helpful, clear assistant like ChatGPT, family-safe for all ages. `lib/ai/personalization-context.ts` then assembles the student's context, applied in this priority order: system and safety rules, project instructions, custom instructions, profile and relevant memory, project context (name, relevant project memories, and relevant excerpts from the same project's other chats, capped at 12,000 characters), the conversation, and the current message. Only relevant memories are sent (at most 3/6/10 for Basic/Plus/Pro), never another project's memories or chats, and none when memory is off. The context is marked as data: it cannot override system rules, and Able must never invent profile facts, memories or history.
- Reply language: Settings offers only English and Hindi, defaulting to English. Hindi means Roman Hindi (Hindi in English letters), including Context lessons. An explicit supported language request wins, then the saved preference. Older Hinglish preferences map to Hindi; removed Gujarati and automatic preferences fall back to English without losing other profile fields.
- Tools: the template's document tools (`createDocument`, `editDocument`, `updateDocument`, `requestSuggestions`) stay, with text, code and sheet kinds. `saveMemory({ content, scope })` saves an explicitly stated durable fact or preference, to the current project (`scope: "project"`) or across Able (`scope: "global"`), only when memory is on. `browser_search: groq.tools.browserSearch({})` is added when the student turns on Search or the server's conservative freshness check identifies a current/live fact that must be verified.
- Reasoning is streamed and shown in the existing collapsible reasoning component.

## 7. Flows

**Sign-in.** The local v1 opens directly into one persisted sample workspace, with no login page or Google provider. Run `pnpm dev:preview` to enable it. `/login` redirects to `/`, and the local session is available without cookies. This mode is disabled in production. Connected mode retains Google sign-in: signed-out visitors go to `/login`, and the first sign-in creates the `User` row by email. The `test-login` credentials provider exists only in non-production test runs outside local preview mode.

**Paywall and routing.** A signed-in student without an active plan never lands in the chat. No plan goes to `/pricing`, a waiting request to `/waiting`, and a rejected one to `/blocked`. A student whose plan ended starts on `/pricing`, which links to their old chats; those chats and projects stay readable, with the composer replaced by a card (plan expired, waiting for approval, request rejected, or daily limit reached). Admins are never redirected.

**Pay.** `/pricing` shows three plan cards with rupee prices and dollar references. The cards follow the pricing layout of ChatGPT: plan name and a short line, a large rupee price with a small dollar price, a full-width Get button, then a tick list of that plan's own features in the owner's words. Features not built yet (the assistant system) carry a Coming soon tag. Plus is marked Popular. It says payment is by UPI only and gives a contact email for students outside India. `/pay/[plan]` shows a QR code generated from `UPI_ID`, `UPI_PAYEE_NAME`, the amount and a note like `Able plus 1a2b3c`, a copy button for the UPI ID, and a "Pay with UPI app" link for phones. After paying, the student taps "I've paid — send request"; there is no reference-number box. The owner matches the payment in their UPI app by amount, time and that note. A student can have only one pending request at a time, and a blocked student cannot send one. After sending they see `/waiting`, which checks every 15 seconds and opens the chat once the owner allows the request.

**Approve.** On approval of a payment for plan X at time T: if all unexpired active periods are on plan X, the new period starts after the latest queued period ends and runs 30 days. Otherwise it starts at T for 30 days and all unexpired active periods are marked `superseded`. The payment determines the plan; there is no plan override. The queue previews the new end date, queued renewals, or paid days lost on a switch. The buttons read Allow and Reject. Allow takes one tap. Reject asks for confirmation, then rejects the request and blocks the student (see Payment workflow). These are OWNER decisions from 14 and 15 September 2026.

**Approval queue update (OWNER, 14 September 2026).** The account menu includes an Admin link with an exact pending-payment count, visible only to admins and refreshed when the menu opens. Pending and recently resolved payments use phone cards and laptop tables. The optional student-note box is removed, retaining historical notes in the database. UTR uniqueness now applies only to pending, approved and refunded payments; rejected UTRs can be submitted again, with the prior review history preserved. This replaces the unconditional UTR uniqueness described above. Migration `0005_approve_gate.sql` applies this rule at the database level, including concurrent submissions. Since 15 September 2026, requests carry no UTR.

**Payment workflow (OWNER, 15 September 2026, from the owner's board).** Plan selection, then UPI payment, then the Request button, then the owner allows or rejects. Allow lets the student use Able within the plan and its limits. Reject blocks the whole cycle: `User.blockedAt` is set, and the student sees `/blocked` ("Request rejected", with the support email) everywhere. A blocked student cannot chat or send another request, even over a paid period. The admin Requests page lists blocked students with an Unblock button, which is also on the student's detail page. Unblocking sends the student back to the plan page. Migration `0007_request_flow` makes `Payment.utr` nullable and adds `User.blockedAt`.

**Renew.** From three days before `endsAt`, one line above the message box says when the plan ends, with a Renew button. The same line appears when fewer than 10 messages are left today. A daily Vercel cron at `/api/cron/reminders`, protected by `CRON_SECRET`, emails students whose plan ends within three days and sets `reminderSentAt`.

**Refund.** Within 7 days of approval, the student can request a refund from settings with a reason. The admin pays them back over UPI outside the app, then marks the request refunded. That sets the payment to `refunded` and the subscription to `refunded`, ending access at once. Declining records who declined it.

**Admin.** `/admin` is allowed only for emails listed in `ADMIN_EMAILS`, checked on the server in the layout and in every action. It shows a pending-payments count, a requests queue with Allow and Reject, blocked students with Unblock, subscriptions with revoke and extend-by-days, refund requests, user search with today's usage, and today's and the last 30 days' AI cost in dollars and in rupees at ₹95.44 per dollar.

**Home screen.** An empty chat greets the student by the time of day on their own clock and by name, for example "Good evening, Ayan". The name is the nickname from Settings, else the first name on the Google account. The four suggested prompts sit right under the greeting. The top bar has no sharing lock; sharing stays in each chat's menu in the sidebar. There is no way to delete all chats at once. The plan usage card lives in Settings and Billing only.

**Projects.** The sidebar has one "Projects" entry that opens `/projects`. That page shows the student's projects as gray folders sorted A to Z, with only the name underneath; long names wrap to two lines, then end with "…". Five folders fit per row on a laptop and three on a phone. Each folder has a "…" menu with rename and delete, shown on hover and always on touch screens. A "New project" button sits at the top right. Chat rows get "Move to project" and "Remove from project". `/project/[id]` lists the project's chats, offers a new chat inside it, and edits its instructions. Creating a project beyond the plan's limit is blocked with an upgrade prompt.

**Settings.** `/settings` holds the profile (name, role, interests, learning and response preferences, reply language), custom instructions, the memory switch and memory list with delete and delete-all, plan status with days and messages left, shared AI keys, payment history, the refund request, sign out, and delete account. A contributed key is validated with a tiny provider call, encrypted with AES-256-GCM, shown only as a masked preview, and may serve any Able student until its contributor removes it. Deleting an account removes the student's chats, messages, projects, memories, settings, usage, attachments and contributed keys. It keeps payment records with the user link cleared.

**Files.** Uploads accept PDF, DOCX, TXT, MD and CSV up to 10 MB. The server extracts the text and stores it as an `Attachment`. Files over about 60,000 tokens, estimated as characters ÷ 4, are rejected with a message asking the student to split the file. The message carries a file part with the URL `attachment://<id>`. Before calling the model, the chat route swaps each such part for a text part with the stored text, after checking the attachment belongs to the student.

**Voice.** A microphone button records up to 60 seconds and posts it to `/api/transcribe`. The server checks the plan, transcribes with `whisper-large-v3-turbo`, records usage, and returns text that goes into the composer.

**Legal.** `/terms`, `/privacy`, `/refunds` and `/contact` are linked from the login page, pricing page and settings. They are drafts the owner must review. The privacy page names Groq as the AI processor and Google as the sign-in provider, says payments are manual UPI transfers, and asks users under 18 to use Able with a parent's or guardian's permission.

**Branding.** The name is Able everywhere: metadata, greeting, sidebar and login. Replace the template's suggested prompts with general ones a student would ask ChatGPT.

## 8. Environment

`.env.example` lists every variable with a placeholder. `.env.local` is never committed.

| Variable | Purpose |
|---|---|
| `AUTH_SECRET` | Auth.js secret |
| `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET` | Google OAuth client |
| `GROQ_API_KEY` | Base Groq key appended to the shared pool as `env` |
| `ENCRYPTION_KEY` | Base64-encoded 32-byte AES key for contributed provider secrets |
| `POSTGRES_URL` | Postgres; Able's own Supabase project in production (pooled connection string) |
| `ADMIN_EMAILS` | Comma-separated admin Google emails |
| `UPI_ID`, `UPI_PAYEE_NAME` | Payment QR details |
| `SUPPORT_EMAIL` | Shown on pricing and contact pages |
| `CRON_SECRET` | Protects the reminder cron |
| `NEXT_PUBLIC_APP_URL` | Absolute links in emails |
| `RESEND_API_KEY`, `EMAIL_FROM` | Optional email |
| `REDIS_URL` | Optional locally; production cursor/cooldown authority plus rate limits and resumable streams |

## 9. Local development and tests

- There is no Docker or system Postgres on the build machine. `embedded-postgres` runs a real local Postgres. `corepack pnpm db:local` starts it on port 5433 with data in `.localdb/`, which is gitignored. `corepack pnpm db:create <name>` creates a database on it.
- Use `corepack pnpm` for every package command. Keep the pnpm store on `D:/.pnpm-store`.
- Unit tests: `corepack pnpm test:unit` with vitest, covering plans, metering, entitlements, UTR validation, approval rules and refund eligibility.
- End-to-end: `corepack pnpm test` with Playwright, mock models and the `test-login` provider.
- Done means: `tsc --noEmit` clean, `corepack pnpm check` clean, unit and e2e tests passing, and `corepack pnpm build` succeeding against the local database.

## 10. Rules for every agent

- Work only in your assigned directory and on the files you own. If you need a change in a file you don't own, describe it in your final report.
- Commit locally in small commits. Stage only your own files by path, never `git add -A`. End every commit message with `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`. Never use `--no-verify`; fix what the hook reports.
- Never push, never deploy, never create a remote repository.
- Never commit secrets or real keys. Use placeholders.
- Keep `LICENSE` and `docs/UPSTREAM.md`; the template is Apache-2.0.
- No test may call Groq, Google or Resend.
- End with a report: what you built, files changed, commands run with their results, and anything unfinished.

## 11. Owner steps before launch

1. Groq: create an API key, move to the Developer plan, and request higher limits for gpt-oss-120b. Base limits for the whole app are 30 requests a minute, 1,000 a day, 8,000 tokens a minute and 200,000 tokens a day.
2. Google Cloud: create a web OAuth client with redirect URIs for localhost and the Vercel domain, and fill in the consent screen with the privacy page link.
3. Supabase: create a separate project for Able, never MetricAi's, in the Mumbai region and on the Pro plan so it never pauses. Copy its pooled (transaction) connection string into `POSTGRES_URL`. The daily reminder cron also keeps the database active.
4. Provide the UPI ID and payee name, and the admin email or emails.
5. Optional: a Resend key and sender address.
6. Review the legal drafts.
7. Say go before anything is pushed to GitHub or deployed to Vercel.

## 12. Known risks the owner accepted

- Vercel's free plan is for non-commercial use only, so Vercel may pause a paid app on it. The fix is the Pro plan at $20 a month.
- With no age limit, the owner alone is responsible for laws on minors, such as parental consent in India and US rules for under-13s. Groq's Services Agreement puts that responsibility on the customer.
- Groq's base limits can serve only a few dozen reasoning messages a day for the whole app.
- Only students with Indian UPI can pay.
- Manual approval means students wait until the owner checks the admin page.


## 13. PDF creation and deep research (14 September 2026)

Owner decisions: build PDF creation first, then deep research. Text documents have Download PDF; completed answers have Save as PDF. Both use a server-side Chromium engine for a real, selectable PDF, including maths, Mermaid diagrams, tables and code. The existing text document tool can receive the full document content, preserving the student's request and context.

Builder defaults, adjustable in code:

| Plan | PDF downloads/day | Research reports/day | Research evidence passes |
|---|---:|---:|---:|
| Basic | 5 | 0 | 0 |
| Plus | 20 | 3 | 2 |
| Pro | 50 | 10 | 4 |

Allowances reset at midnight India time. All plans get the same PDF rendering quality; PDF input is limited to 240,000 characters. Exports require an active plan and source ownership. They include visible answer text and public sources, never reasoning or tool inputs. Documents export their currently displayed editable content. PDFs are generated in an isolated browser with network access blocked and returned directly, without storing PDF files. Failed exports release their reservation.

Research is an explicit composer mode for Plus/Pro. Groq gathers evidence in multiple passes, then writes a report with public source links, limitations and comparisons. Source links and final reports are saved in the existing chat/message tables and reports can be downloaded with Save as PDF. Model calls and searches count toward the existing AI allowance. Progress and stop controls use the existing chat stream. No verified sources means a clear error, not a fabricated research report. Failed or cancelled reports release the report allowance; model work already completed is still metered.

FeatureRun stores a pending/completed/failed reservation and timestamps for PDF/research quotas. Per-student row locks prevent concurrent requests from bypassing a cap. Pending reservations expire after five minutes for recovery from a stopped server. Account deletion cascades to these reservations. Daily upload checks and insertion also share one student lock.
