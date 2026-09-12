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
| AI provider | Groq only. Model `openai/gpt-oss-120b` for answers | OWNER |
| Capacity | Owner applies to Groq for higher limits. Launch waits for approval | OWNER |
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
| `pro` | Pro | ₹1,200 / 30 days | $12.99 | `high` | shown as Unlimited, hidden fair-use ceiling of 150 | unlimited |

Display names are a default; the owner described the plans but did not name them. Prices are charged in rupees only. Dollar amounts are shown for reference.

Every plan includes: streaming chat, stop, regenerate, edit-and-resend, chat history with search, rename and delete, project folders, Markdown with code blocks and maths, a collapsible reasoning view, web search, file uploads, voice input, memory, custom instructions, dark mode and a phone-friendly layout.

## 2. Defaults chosen by the builder

These fill gaps the interview did not cover. Keep them unless the owner overrides.

- Daily limits reset at midnight Asia/Kolkata.
- Web search is a toggle in the composer, like ChatGPT's search button. The model only gets the search tool when the toggle is on.
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

Added: `@ai-sdk/groq` for all model calls, `qrcode` for UPI QR images, `unpdf` for PDF text, `mammoth` for DOCX text, `vitest` for unit tests, `embedded-postgres` for a local database, `resend` for optional email.

Removed: the Vercel AI Gateway, and `@vercel/blob` for uploads.

## 4. Data model

Existing template tables stay: `User`, `Chat`, `Message_v2`, `Vote_v2`, `Document`, `Suggestion`, `Stream`. Changes:

- `User.email` widens to `varchar(255)`. Password stays nullable and unused.
- `Chat.projectId`: nullable uuid referencing `Project.id`, set to null when the project is deleted.

New tables, all with uuid primary keys and `createdAt` timestamps:

| Table | Columns |
|---|---|
| `Project` | `userId` → User, `name` text up to 60 chars, `instructions` text nullable, `updatedAt` |
| `Payment` | `userId` → User nullable with set-null on delete, `planId` enum basic/plus/pro, `amountInr` int, `utr` varchar(32) unique, `studentNote` text nullable, `status` enum pending/approved/rejected/refunded, `reviewNote` text nullable, `reviewedAt` nullable, `reviewedBy` text nullable |
| `Subscription` | `userId` → User, `planId`, `paymentId` → Payment unique, `startsAt`, `endsAt`, `status` enum active/superseded/revoked/refunded, `reminderSentAt` nullable |
| `RefundRequest` | `paymentId` → Payment unique, `userId` → User, `reason` text, `status` enum open/refunded/declined, `resolvedAt` nullable, `resolvedBy` text nullable |
| `UsageEvent` | `userId` → User, `chatId` nullable, `kind` enum chat/transcription/title, `planId` nullable, `inputTokens`, `cachedInputTokens`, `outputTokens`, `reasoningTokens`, `webSearches`, `audioSeconds` ints default 0, `costMicros` int (US dollars times one million), `countsTowardLimit` boolean. Index on (`userId`, `createdAt`) |
| `Memory` | `userId` → User, `content` text up to 500 chars, `projectId` → Project nullable (project memory; deleted with its project) |
| `UserSettings` | `userId` primary key → User, `aboutMe` text up to 1,500 chars, `responseStyle` text up to 1,500 chars, `memoryEnabled` boolean default true, `profile` json (name, role, interests, learning and response preferences, reply language), `updatedAt` |
| `Attachment` | `userId` → User, `chatId` nullable, `name`, `mediaType`, `text`, `charCount` int |

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

- Provider: `createGroq({ apiKey: process.env.GROQ_API_KEY })`. Chat model `openai/gpt-oss-120b` with `providerOptions.groq.reasoningEffort` set from the plan. Title model `openai/gpt-oss-20b`.
- Test runs keep the template's mock models when `isTestEnvironment` is true. No test may call Groq.
- System prompt: Able is a helpful, clear assistant like ChatGPT, family-safe for all ages. `lib/ai/personalization-context.ts` then assembles the student's context, applied in this priority order: system and safety rules, project instructions, custom instructions, profile and relevant memory, project context (name, relevant project memories, and relevant excerpts from the same project's other chats, capped at 12,000 characters), the conversation, and the current message. Only relevant memories are sent (at most 10), never another project's memories or chats, and none when memory is off. The context is marked as data: it cannot override system rules, and Able must never invent profile facts, memories or history.
- Reply language: an explicit request in the current message wins, then the profile's saved language, then the language and mixing style detected in the message (English, Hindi, Hinglish, Gujarati).
- Tools: the template's document tools (`createDocument`, `editDocument`, `updateDocument`, `requestSuggestions`) stay, with text, code and sheet kinds. `saveMemory({ content, scope })` saves an explicitly stated durable fact or preference, to the current project (`scope: "project"`) or across Able (`scope: "global"`), only when memory is on. `browser_search: groq.tools.browserSearch({})` is added only when the request's `webSearch` flag is true.
- Reasoning is streamed and shown in the existing collapsible reasoning component.

## 7. Flows

**Sign-in.** The local v1 opens directly into one persisted sample workspace, with no login page or Google provider. Run `pnpm dev:preview` to enable it. `/login` redirects to `/`, and the local session is available without cookies. This mode is disabled in production. Connected mode retains Google sign-in: signed-out visitors go to `/login`, and the first sign-in creates the `User` row by email. The `test-login` credentials provider exists only in non-production test runs outside local preview mode.

**Paywall.** A student without a current plan sees the chat layout, but the composer is replaced by a card: choose a plan, waiting for approval, plan expired, or daily limit reached.

**Pay.** `/pricing` shows three plan cards with rupee prices and dollar references. It says payment is by UPI only and gives a contact email for students outside India. `/pay/[plan]` shows a QR code generated from `UPI_ID`, `UPI_PAYEE_NAME`, the amount and a note like `Able plus 1a2b3c`, a copy button for the UPI ID, and a "Pay with UPI app" link for phones. The student then enters the UPI reference number and submits. References are 10 to 24 letters or digits, stored in upper case, and must be unique. A student can have only one pending payment at a time. After submitting they see a waiting-for-approval screen.

**Approve.** On approval of a payment for plan X at time T: if the student has a current subscription on plan X, the new period starts at its `endsAt` and runs 30 days. Otherwise the new period starts at T and runs 30 days, and any current subscription on another plan is marked `superseded` with `endsAt` set to T. Rejecting records a reason the student can see.

**Renew.** A banner appears from three days before `endsAt`. A daily Vercel cron at `/api/cron/reminders`, protected by `CRON_SECRET`, emails students whose plan ends within three days and sets `reminderSentAt`.

**Refund.** Within 7 days of approval, the student can request a refund from settings with a reason. The admin pays them back over UPI outside the app, then marks the request refunded. That sets the payment to `refunded` and the subscription to `refunded`, ending access at once. Declining records who declined it.

**Admin.** `/admin` is allowed only for emails listed in `ADMIN_EMAILS`, checked on the server in the layout and in every action. It shows a pending-payments count, a payments queue with approve and reject, subscriptions with revoke and extend-by-days, refund requests, user search with today's usage, and today's and the last 30 days' AI cost in dollars and in rupees at ₹95.44 per dollar.

**Projects.** A "Projects" section in the sidebar lists folders, with create, rename and delete. Chat rows get "Move to project" and "Remove from project". `/project/[id]` lists the project's chats, offers a new chat inside it, and edits its instructions. Creating a project beyond the plan's limit is blocked with an upgrade prompt.

**Settings.** `/settings` holds the profile (name, role, interests, learning and response preferences, reply language), custom instructions, the memory switch and memory list with delete and delete-all, plan status with days and messages left, payment history, the refund request, sign out, and delete account. Deleting an account removes the student's chats, messages, projects, memories, settings, usage and attachments. It keeps payment records with the user link cleared.

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
| `GROQ_API_KEY` | Groq |
| `POSTGRES_URL` | Postgres; Neon in production |
| `ADMIN_EMAILS` | Comma-separated admin Google emails |
| `UPI_ID`, `UPI_PAYEE_NAME` | Payment QR details |
| `SUPPORT_EMAIL` | Shown on pricing and contact pages |
| `CRON_SECRET` | Protects the reminder cron |
| `NEXT_PUBLIC_APP_URL` | Absolute links in emails |
| `RESEND_API_KEY`, `EMAIL_FROM` | Optional email |
| `REDIS_URL` | Optional, template rate limits and resumable streams |

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
3. Neon: create a free database and copy its pooled connection string.
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
