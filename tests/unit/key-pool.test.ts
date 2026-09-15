import { APICallError } from "ai";
import { describe, expect, it } from "vitest";
import {
  classifyProviderError,
  pickAvailableCredential,
} from "@/lib/ai/key-pool";

const credentials = [{ id: "a" }, { id: "b" }, { id: "c" }];

describe("shared AI key pool", () => {
  it("rotates over active keys and skips cooldowns", () => {
    expect(pickAvailableCredential(credentials, new Set(), 0)?.id).toBe("a");
    expect(pickAvailableCredential(credentials, new Set(), 1)?.id).toBe("b");
    expect(pickAvailableCredential(credentials, new Set(["b"]), 1)?.id).toBe(
      "c"
    );
    expect(
      pickAvailableCredential(credentials, new Set(["a", "b", "c"]), 2)
    ).toBeNull();
  });

  it("classifies only invalid and throttled provider failures", () => {
    const apiError = (statusCode: number) =>
      new APICallError({
        message: "provider error",
        requestBodyValues: {},
        statusCode,
        url: "https://provider.invalid",
      });
    expect(classifyProviderError(apiError(401))).toBe("invalid");
    expect(classifyProviderError(apiError(403))).toBe("invalid");
    expect(classifyProviderError(apiError(429))).toBe("throttled");
    expect(classifyProviderError(apiError(500))).toBeNull();
    expect(classifyProviderError(new Error("network"))).toBeNull();
  });
});
