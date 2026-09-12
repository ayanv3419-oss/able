/**
 * The three Able plans, exactly as decided in docs/SPEC.md §1.
 * Prices are charged in rupees; the dollar amounts are shown for reference only.
 */

export const PLAN_IDS = ["basic", "plus", "pro"] as const;

export type PlanId = (typeof PLAN_IDS)[number];

export type ReasoningEffort = "low" | "medium" | "high";

export type Plan = {
  /** Stable identifier, also stored in the database. */
  id: PlanId;
  /** Name shown to students. */
  name: string;
  /** Price in rupees for one period. */
  priceInr: number;
  /** Dollar reference shown next to the rupee price. */
  priceUsdDisplay: string;
  /** Groq reasoning effort used for answers on this plan. */
  reasoningEffort: ReasoningEffort;
  /** Messages a student may send per day. Enforced even when hidden. */
  dailyMessages: number;
  /** When true the daily allowance is shown as "Unlimited". */
  displayUnlimited: boolean;
  /** Project folders allowed, or null for unlimited. */
  projectFolderLimit: number | null;
};

/** Every plan runs for 30 days from approval. */
export const PLAN_DAYS = 30;

export const PLANS: Record<PlanId, Plan> = {
  basic: {
    dailyMessages: 40,
    displayUnlimited: false,
    id: "basic",
    name: "Basic",
    priceInr: 250,
    priceUsdDisplay: "$2.99",
    projectFolderLimit: 3,
    reasoningEffort: "low",
  },
  plus: {
    dailyMessages: 100,
    displayUnlimited: false,
    id: "plus",
    name: "Plus",
    priceInr: 800,
    priceUsdDisplay: "$8.99",
    projectFolderLimit: 20,
    reasoningEffort: "medium",
  },
  pro: {
    dailyMessages: 150,
    displayUnlimited: true,
    id: "pro",
    name: "Pro",
    priceInr: 1200,
    priceUsdDisplay: "$12.99",
    projectFolderLimit: null,
    reasoningEffort: "high",
  },
};

export function isPlanId(value: unknown): value is PlanId {
  return (
    typeof value === "string" && (PLAN_IDS as readonly string[]).includes(value)
  );
}

export function getPlan(id: PlanId): Plan {
  return PLANS[id];
}
