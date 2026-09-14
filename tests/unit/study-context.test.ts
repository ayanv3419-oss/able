import { describe, expect, it } from "vitest";
import { systemPrompt } from "@/lib/ai/prompts";
import {
  canEditStudyContext,
  STUDY_CONTEXT_EDIT_WINDOW_MS,
  teachingRequest,
} from "@/lib/study-context";

const requestHints = {
  city: "Pune",
  country: "India",
  latitude: "18.52",
  longitude: "73.85",
};

describe("Study Context rules", () => {
  it("locks exactly ten minutes after the original save", () => {
    const now = new Date("2026-09-15T12:00:00.000Z");
    expect(
      canEditStudyContext(
        new Date(now.getTime() - STUDY_CONTEXT_EDIT_WINDOW_MS + 1),
        now
      )
    ).toBe(true);
    expect(
      canEditStudyContext(
        new Date(now.getTime() - STUDY_CONTEXT_EDIT_WINDOW_MS),
        now
      )
    ).toBe(false);
  });

  it("uses dedicated prompts for lessons and each Teach me choice", () => {
    expect(teachingRequest("lesson")).toContain("part 1");
    expect(teachingRequest("explain")).toContain("simply");
    expect(teachingRequest("summary")).toContain("Summarize");
    expect(teachingRequest("quiz")).toContain("one question at a time");
    expect(teachingRequest("important")).toContain("important exam questions");
  });

  it("adds saved material only to a dedicated Context chat", () => {
    const normal = systemPrompt({ requestHints });
    const teaching = systemPrompt({
      requestHints,
      studyMaterials: [
        {
          content: "Coulomb's law is an inverse-square law.",
          title: "Electrostatics",
        },
      ],
    });
    expect(normal).not.toContain("study_context_json");
    expect(teaching).toContain("study_context_json");
    expect(teaching).toContain("Coulomb's law");
    expect(teaching).toContain("Indian example");
  });
});
