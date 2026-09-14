import { describe, expect, it } from "vitest";
import { type StudentPage, studentRedirect } from "@/lib/access-rules";
import type { EntitlementStatus } from "@/lib/entitlements";

const PAGES: StudentPage[] = [
  "home",
  "chat",
  "projects",
  "settings",
  "billing",
  "pricing",
  "pay",
  "waiting",
  "blocked",
];

function routes(status: EntitlementStatus) {
  return Object.fromEntries(
    PAGES.map((page) => [page, studentRedirect(status, page)])
  );
}

describe("studentRedirect", () => {
  it("opens the plan page first for a student who never had a plan", () => {
    expect(routes("none")).toEqual({
      billing: null,
      blocked: "/",
      chat: "/pricing",
      home: "/pricing",
      pay: null,
      pricing: null,
      projects: "/pricing",
      settings: null,
      waiting: "/pricing",
    });
  });

  it("shows the waiting screen after a request", () => {
    expect(routes("pending")).toEqual({
      billing: null,
      blocked: "/",
      chat: null,
      home: "/waiting",
      pay: "/waiting",
      pricing: null,
      projects: null,
      settings: null,
      waiting: null,
    });
  });

  it("lets an allowed student into the app", () => {
    expect(routes("active")).toEqual({
      billing: null,
      blocked: "/",
      chat: null,
      home: null,
      pay: null,
      pricing: null,
      projects: null,
      settings: null,
      waiting: "/",
    });
  });

  it("keeps old chats readable after a plan ends", () => {
    expect(routes("expired")).toEqual({
      billing: null,
      blocked: "/",
      chat: null,
      home: "/pricing",
      pay: null,
      pricing: null,
      projects: null,
      settings: null,
      waiting: "/pricing",
    });
  });

  it("sends a blocked student only to the blocked screen", () => {
    const blocked = routes("blocked");
    expect(blocked.blocked).toBeNull();
    for (const page of PAGES.filter((item) => item !== "blocked")) {
      expect(blocked[page]).toBe("/blocked");
    }
  });
});
