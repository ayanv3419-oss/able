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
  /** Files a student may upload per India day, or null for no daily cap. */
  dailyUploads: number | null;
  /**
   * Saved memories, and past-chat excerpts inside a project, that each answer
   * may draw on. Higher plans understand the student better per answer.
   */
  contextMemories: number;
  /** Successful PDF downloads per India day. */
  dailyPdfs: number;
};

/** Every plan runs for 30 days from approval. */
export const PLAN_DAYS = 30;

export const PLANS: Record<PlanId, Plan> = {
  basic: {
    contextMemories: 3,
    dailyMessages: 40,
    dailyPdfs: 5,
    dailyUploads: 5,
    displayUnlimited: false,
    id: "basic",
    name: "Basic",
    priceInr: 250,
    priceUsdDisplay: "$2.99",
    projectFolderLimit: 3,
    reasoningEffort: "low",
  },
  plus: {
    contextMemories: 6,
    dailyMessages: 100,
    dailyPdfs: 20,
    dailyUploads: 20,
    displayUnlimited: false,
    id: "plus",
    name: "Plus",
    priceInr: 800,
    priceUsdDisplay: "$8.99",
    projectFolderLimit: 20,
    reasoningEffort: "medium",
  },
  pro: {
    contextMemories: 10,
    dailyMessages: 150,
    dailyPdfs: 50,
    dailyUploads: null,
    displayUnlimited: true,
    id: "pro",
    name: "Pro",
    priceInr: 1200,
    priceUsdDisplay: "$12.99",
    projectFolderLimit: 40,
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
