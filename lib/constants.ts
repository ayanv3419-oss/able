export const isProductionEnvironment = process.env.NODE_ENV === "production";
export const isTestEnvironment = Boolean(
  process.env.PLAYWRIGHT_TEST_BASE_URL ||
    process.env.PLAYWRIGHT ||
    process.env.CI_PLAYWRIGHT
);

export const suggestions = [
  "Explain photosynthesis in simple terms",
  "Help me write an essay about climate change",
  "Make me a study plan for my exams next week",
  "Explain this Python code and find the bug",
];
