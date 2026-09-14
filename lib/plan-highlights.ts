import { PLANS, type Plan, type PlanId } from "@/lib/plans";

/** One ticked line on a plan card. */
export type PlanFeature = {
  text: string;
  /** Shown with a "Coming soon" tag until the feature is built. */
  soon?: boolean;
};

/** What one plan card says, in the ChatGPT-style layout the owner picked. */
export type PlanCopy = {
  /** One short line under the plan name. */
  tagline: string;
  /** The ticked lines, in the owner's order. */
  features: PlanFeature[];
};

function folders(plan: Plan): string {
  const limit = plan.projectFolderLimit;
  if (limit === null) {
    return "Unlimited project folders";
  }
  if (limit === 1) {
    return "1 project folder";
  }
  return `${limit} project folders`;
}

/**
 * Every line is true for its plan: messages follow dailyMessages, uploads
 * follow dailyUploads, voice counts toward the daily allowance, understanding
 * follows contextMemories, and depth follows reasoningEffort. Features that
 * are not built yet carry `soon`.
 */
const COPY: Record<PlanId, PlanCopy> = {
  basic: {
    features: [
      { text: folders(PLANS.basic) },
      { text: "Limited messages" },
      { text: "Limited PDF creation" },
      { text: "Limited uploads" },
      { text: "Limited voice input" },
      { text: "Limited deep explanations with architecture diagrams" },
      { text: "Limited understanding of you" },
    ],
    tagline: "Everyday study help",
  },
  plus: {
    features: [
      { text: "More messages" },
      { text: `${folders(PLANS.plus)}, each with its own instructions` },
      { text: "More uploads" },
      { text: "More voice input" },
      { text: "More deep explanations with architecture diagrams" },
      { text: "More understanding of you" },
      { text: "High-end PDF creation" },
      { text: "High-end deep research and explanations" },
      { soon: true, text: "Assistant system, with limits" },
    ],
    tagline: "More reasoning for harder subjects",
  },
  pro: {
    features: [
      { text: "Unlimited messages" },
      { text: folders(PLANS.pro) },
      { text: "Unlimited uploads" },
      { text: "Unlimited voice input" },
      { text: "Advanced deep research" },
      { text: "Advanced architecture explanations and diagrams" },
      { text: "Advanced understanding of you" },
      { text: "Advanced PDF creation" },
      { soon: true, text: "High-level assistant system" },
      { text: "Thinks before it answers, for the most advanced explanations" },
    ],
    tagline: "Most capable",
  },
};

/** The words on a plan's card. */
export function planCopy(id: PlanId): PlanCopy {
  return COPY[id];
}
