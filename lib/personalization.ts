import { z } from "zod";

export const profileSchema = z.object({
  displayName: z.string().trim().max(80).default(""),
  interests: z.string().trim().max(400).default(""),
  learningPreferences: z.string().trim().max(400).default(""),
  preferredLanguage: z
    .enum(["auto", "English", "Hindi", "Hinglish", "Gujarati"])
    .default("auto"),
  responsePreferences: z.string().trim().max(400).default(""),
  role: z.string().trim().max(120).default(""),
});

export type UserProfile = z.infer<typeof profileSchema>;

export const PROFILE_FIELDS = [
  { key: "displayName", label: "Name or nickname", maxLength: 80 },
  { key: "role", label: "Occupation or student status", maxLength: 120 },
  { key: "interests", label: "Interests", maxLength: 400 },
  { key: "learningPreferences", label: "Learning preferences", maxLength: 400 },
  { key: "responsePreferences", label: "Response preferences", maxLength: 400 },
] as const;

/** A hint for the model; an explicit language request takes precedence. */
export function responseLanguage(input: string, preferred = "auto") {
  const explicit = [
    ...input.matchAll(
      /(?:in|into|using|speak|use|reply|respond|answer)\s+(English|Hindi|Hinglish|Gujarati)\b|\b(English|Hindi|Hinglish|Gujarati)\s+(?:mein|me|mai|ma)\b/gi
    ),
  ].at(-1);
  if (explicit) {
    return { language: explicit[1] || explicit[2], source: "current request" };
  }
  if (/ગુજરાતીમાં/.test(input)) {
    return { language: "Gujarati", source: "current request" };
  }
  if (/हिंदी में|हिन्दी में/.test(input)) {
    return { language: "Hindi", source: "current request" };
  }
  if (preferred !== "auto") {
    return { language: preferred, source: "saved preference" };
  }
  if (/[\u0A80-\u0AFF]/u.test(input)) {
    return {
      language: "Gujarati; preserve natural mixing",
      source: "current input",
    };
  }
  if (/[\u0900-\u097F]/u.test(input)) {
    return {
      language: "Hindi; preserve natural mixing",
      source: "current input",
    };
  }
  if (
    /\b(?:samjhao|samjha|kya|kaise|kyun|mujhe|batao|hai|hain|karna|chahiye|nahi)\b/i.test(
      input
    )
  ) {
    return { language: "Hinglish", source: "current input" };
  }
  return {
    language:
      "Match the current message's language and style, including mixed languages",
    source: "current input",
  };
}

const STOP_WORDS = new Set(
  "the a an and or to of in is it this that for my me we you with what how please again explain about our are was were have had from can do did doing yesterday continue".split(
    " "
  )
);

export function contextTerms(text: string): Set<string> {
  return new Set(
    (text.toLocaleLowerCase().match(/[\p{L}\p{N}]+/gu) ?? []).filter(
      (word) => word.length > 2 && !STOP_WORDS.has(word)
    )
  );
}

export function relevanceScore(text: string, terms: Set<string>) {
  const words = contextTerms(text);
  let score = 0;
  for (const term of terms) {
    if (words.has(term)) {
      score += 1;
    }
  }
  return score;
}

export function isContinuation(input: string) {
  return /\b(?:again|continue|yesterday|last time|earlier|previous|where we|what we|this|that|it)\b|फिर|कल|પાછું|ગઈકાલ|\b(?:phir|kal|wahi)\b/i.test(
    input
  );
}

export type ContextMemory = { content: string; projectId: string | null };

/** Select a small, relevant subset; never cross project scope. */
export function selectRelevantMemories<T extends ContextMemory>(
  memories: T[],
  query: string,
  projectId: string | null
) {
  const terms = contextTerms(query);
  const personalQuestion =
    /\b(?:about me|my name|my preferences|remember about|who am i)\b/i.test(
      query
    );
  const ranked = memories
    .filter((item) => item.projectId === null || item.projectId === projectId)
    .map((item, index) => {
      const preference =
        /\b(?:prefer|preference|learn best|respond|reply|explain|language|call me)\b/i.test(
          item.content
        );
      return {
        index,
        item,
        score:
          relevanceScore(item.content, terms) * 4 +
          (preference && !item.projectId ? 2 : 0) +
          (personalQuestion && !item.projectId ? 2 : 0) +
          (item.projectId && isContinuation(query) ? 1 : 0),
      };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || a.index - b.index);
  return ranked
    .slice(0, 10)
    .map(({ item }) => ({ ...item, content: item.content.slice(0, 500) }));
}

export type ProjectExcerpt = {
  chatId: string;
  title: string;
  role: string;
  createdAt: Date;
  text: string;
};

/** Candidates arrive newest first. Return selected excerpts in conversation order. */
export function selectProjectHistory(
  candidates: ProjectExcerpt[],
  query: string,
  now = new Date()
) {
  const terms = contextTerms(query);
  const continuation = isContinuation(query);
  const yesterday = /yesterday|कल|ગઈકાલ|\bkal\b/i.test(query);
  const indiaDay = (date: Date) =>
    Math.floor((date.getTime() + 19_800_000) / 86_400_000);
  const ranked = candidates
    .map((item, index) => ({
      index,
      item,
      score:
        relevanceScore(`${item.title} ${item.text}`, terms) * 4 +
        (continuation ? 1 : 0) +
        (yesterday && indiaDay(item.createdAt) === indiaDay(now) - 1 ? 20 : 0),
    }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score || a.index - b.index);
  let budget = 12_000;
  const selected: ProjectExcerpt[] = [];
  for (const { item } of ranked.slice(0, 10)) {
    if (budget <= 0) {
      break;
    }
    const text = item.text.slice(0, Math.min(2000, budget));
    if (!text.trim()) {
      continue;
    }
    selected.push({ ...item, text });
    budget -= text.length;
  }
  return selected.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
}
