import { Check, ChevronRight } from "lucide-react";
import Link from "next/link";
import { signInWithGoogle } from "@/app/(auth)/actions";
import { SubmitButton } from "@/components/chat/submit-button";
import { Button } from "@/components/ui/button";
import { planCopy } from "@/lib/plan-highlights";
import type { Plan } from "@/lib/plans";

/**
 * One plan in ChatGPT's pricing layout: name and a short line, a large
 * price, a full-width "Get" button, then a tick list. Features that are not
 * built yet carry a small "Coming soon" tag.
 */
export function PlanCard({
  highlight = false,
  isSignedIn,
  plan,
}: {
  plan: Plan;
  isSignedIn: boolean;
  highlight?: boolean;
}) {
  const copy = planCopy(plan.id);
  const payHref = `/pay/${plan.id}`;
  const label = `Get ${plan.name}`;
  const buttonClass = "h-11 w-full rounded-full text-sm";

  return (
    <section
      aria-label={`${plan.name} plan`}
      className="flex flex-col rounded-2xl border border-border bg-background p-6"
    >
      <div className="flex items-center gap-2">
        <h2 className="font-medium text-2xl tracking-tight">{plan.name}</h2>
        {highlight ? (
          <span className="rounded-full bg-muted px-2 py-0.5 font-semibold text-[11px] text-foreground uppercase tracking-wide">
            Popular
          </span>
        ) : null}
      </div>
      <p className="mt-1 min-h-10 text-muted-foreground text-sm">
        {copy.tagline}
      </p>

      <p className="mt-5 flex items-baseline gap-1.5">
        <span className="font-medium text-5xl tabular-nums tracking-tight">
          ₹{plan.priceInr.toLocaleString("en-IN")}
        </span>
        <span className="text-muted-foreground text-sm">/ 30 days</span>
      </p>
      <p className="mt-1 text-muted-foreground text-xs">
        about {plan.priceUsdDisplay}
      </p>

      <div className="mt-5">
        {isSignedIn ? (
          <Button asChild className={buttonClass}>
            <Link href={payHref}>
              {label}
              <ChevronRight aria-hidden className="size-4" />
            </Link>
          </Button>
        ) : (
          <form action={signInWithGoogle} className="w-full">
            <input name="callbackUrl" type="hidden" value={payHref} />
            <SubmitButton className={buttonClass} isSuccessful={false}>
              {label}
              <ChevronRight aria-hidden className="size-4" />
            </SubmitButton>
          </form>
        )}
      </div>

      <ul className="mt-6 flex flex-1 flex-col gap-3 border-border border-t pt-5 text-sm">
        {copy.features.map((feature) => (
          <li className="flex items-start gap-3" key={feature.text}>
            <Check
              aria-hidden
              className="mt-0.5 size-4 shrink-0"
              strokeWidth={1.75}
            />
            <span>
              {feature.text}{" "}
              {feature.soon ? (
                <span className="ml-1 inline-flex -translate-y-px rounded-full bg-muted px-1.5 py-0.5 align-middle font-medium text-[10px] text-muted-foreground uppercase tracking-wide">
                  Coming soon
                </span>
              ) : null}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
