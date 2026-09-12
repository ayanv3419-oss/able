import Link from "next/link";
import { signInWithGoogle } from "@/app/(auth)/actions";
import { SubmitButton } from "@/components/chat/submit-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Plan } from "@/lib/plans";

/** Plain-words description of a plan's Groq reasoning effort. */
const REASONING_EFFORT_LABEL: Record<Plan["reasoningEffort"], string> = {
  high: "Most capable answers",
  low: "Quick answers",
  medium: "Careful answers",
};

/** Shared across every plan, per docs/SPEC.md §1. */
const SHARED_FEATURES = [
  "Streaming chat with stop and regenerate",
  "Edit and resend any message",
  "Chat history with search, rename and delete",
  "Project folders",
  "Markdown with code blocks and maths",
  "Collapsible reasoning view",
  "Web search",
  "File uploads",
  "Voice input",
  "Memory and custom instructions",
  "Dark mode and a phone-friendly layout",
] as const;

function formatProjectLimit(limit: number | null): string {
  if (limit === null) {
    return "Unlimited project folders";
  }

  return `${limit} project folder${limit === 1 ? "" : "s"}`;
}

function formatDailyMessages(plan: Plan): string {
  if (plan.displayUnlimited) {
    return "Unlimited messages";
  }

  return `${plan.dailyMessages} messages a day`;
}

export function PlanCard({
  highlight = false,
  isSignedIn,
  plan,
}: {
  plan: Plan;
  isSignedIn: boolean;
  highlight?: boolean;
}) {
  const payHref = `/pay/${plan.id}`;

  return (
    <div
      className={`flex flex-col gap-5 rounded-xl border p-6 ${
        highlight
          ? "border-primary bg-primary/[0.03] shadow-sm"
          : "border-border bg-background"
      }`}
    >
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <h2 className="font-semibold text-lg">{plan.name}</h2>
          {highlight ? <Badge>Most popular</Badge> : null}
        </div>
        <p className="flex items-baseline gap-1.5">
          <span className="font-semibold text-2xl tracking-tight">
            ₹{plan.priceInr.toLocaleString("en-IN")}
          </span>
          <span className="text-muted-foreground text-sm">/ 30 days</span>
        </p>
        <p className="text-muted-foreground text-xs">
          {plan.priceUsdDisplay} reference
        </p>
      </div>

      <dl className="flex flex-col gap-1.5 text-sm">
        <div className="flex items-center justify-between gap-2">
          <dt className="text-muted-foreground">Answers</dt>
          <dd>{REASONING_EFFORT_LABEL[plan.reasoningEffort]}</dd>
        </div>
        <div className="flex items-center justify-between gap-2">
          <dt className="text-muted-foreground">Daily messages</dt>
          <dd>{formatDailyMessages(plan)}</dd>
        </div>
        <div className="flex items-center justify-between gap-2">
          <dt className="text-muted-foreground">Project folders</dt>
          <dd>{formatProjectLimit(plan.projectFolderLimit)}</dd>
        </div>
      </dl>

      <ul className="flex flex-1 flex-col gap-1.5 text-muted-foreground text-sm">
        {SHARED_FEATURES.map((feature) => (
          <li className="flex items-start gap-2" key={feature}>
            <span aria-hidden="true" className="mt-0.5 text-foreground">
              ✓
            </span>
            {feature}
          </li>
        ))}
      </ul>

      {isSignedIn ? (
        <Button asChild className="w-full">
          <Link href={payHref}>Choose {plan.name}</Link>
        </Button>
      ) : (
        <form action={signInWithGoogle} className="w-full">
          <input name="callbackUrl" type="hidden" value={payHref} />
          <SubmitButton isSuccessful={false}>Choose {plan.name}</SubmitButton>
        </form>
      )}
    </div>
  );
}
