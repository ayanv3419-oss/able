import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("local model health", () => {
  it("reports an unreachable local endpoint as unavailable before selection", async () => {
    vi.stubEnv("LOCAL_MODEL_URL", "http://192.0.2.1:8080/v1");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));

    const { checkLocalHealth } = await import("@/lib/ai/local-model");

    await expect(checkLocalHealth()).resolves.toBe(false);
    expect(fetch).toHaveBeenCalledOnce();
  });

  it("recognizes a healthy OpenAI-compatible endpoint", async () => {
    vi.stubEnv("LOCAL_MODEL_URL", "http://127.0.0.1:8080/v1/");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("{}", { status: 200 }))
    );

    const { checkLocalHealth } = await import("@/lib/ai/local-model");

    await expect(checkLocalHealth()).resolves.toBe(true);
    expect(fetch).toHaveBeenCalledWith(
      "http://127.0.0.1:8080/v1/models",
      expect.objectContaining({ method: "GET" })
    );
  });
});
