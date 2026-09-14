import { describe, expect, it } from "vitest";
import {
  detectInstallBrowser,
  detectInstallPlatform,
  getManualInstallHint,
} from "@/lib/install";

describe("install helpers", () => {
  it("detects Android and iOS devices", () => {
    expect(
      detectInstallPlatform({ userAgent: "Mozilla/5.0 (Linux; Android 14)" })
    ).toBe("android");
    expect(
      detectInstallPlatform({
        userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0)",
      })
    ).toBe("ios");
  });

  it("detects touch iPads that identify as Mac", () => {
    expect(
      detectInstallPlatform({
        maxTouchPoints: 5,
        platform: "MacIntel",
        userAgent: "Mozilla/5.0 (Macintosh)",
      })
    ).toBe("ios");
  });

  it("detects Edge before Chrome", () => {
    expect(
      detectInstallBrowser(
        "Mozilla/5.0 Chrome/124.0.0.0 Safari/537.36 Edg/124.0.0.0"
      )
    ).toBe("edge");
  });

  it("gives device-specific manual instructions", () => {
    expect(getManualInstallHint("ios", "safari")).toContain(
      "Add to Home Screen"
    );
    expect(getManualInstallHint("windows", "edge")).toContain("Apps");
  });
});
