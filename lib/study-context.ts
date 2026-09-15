export const STUDY_CONTEXT_MAX_CHARS = 15_000;
export const STUDY_CONTEXT_EDIT_WINDOW_MS = 10 * 60 * 1000;

export type TeachingMode =
  | "lesson"
  | "explain"
  | "summary"
  | "quiz"
  | "important";

export function canEditStudyContext(
  createdAt: Date,
  now = new Date()
): boolean {
  return now.getTime() - createdAt.getTime() < STUDY_CONTEXT_EDIT_WINDOW_MS;
}

export function teachingRequest(mode: TeachingMode): string {
  switch (mode) {
    case "lesson":
      return "Teach me this study material as a lesson. Start with part 1.";
    case "explain":
      return "Explain this study material simply.";
    case "summary":
      return "Summarize this study material.";
    case "quiz":
      return "Quiz me on this study material, one question at a time.";
    case "important":
      return "Give me the important exam questions from this study material, with concise model answers.";
    default:
      return "Teach me this study material.";
  }
}
