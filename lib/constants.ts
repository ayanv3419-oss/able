export const isProductionEnvironment = process.env.NODE_ENV === "production";
// The local v1 uses one sample workspace without an OAuth or cookie session.
export const isLocalPreview =
  !isProductionEnvironment && process.env.ABLE_LOCAL_PREVIEW === "true";
export const isTestEnvironment = Boolean(
  process.env.PLAYWRIGHT_TEST_BASE_URL ||
    process.env.PLAYWRIGHT ||
    process.env.CI_PLAYWRIGHT
);
export const useMockAI =
  isTestEnvironment || process.env.ABLE_MOCK_AI === "true";
