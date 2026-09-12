"use client";

import { useActionState, useEffect, useId } from "react";
import { toast } from "sonner";
import { updatePersonalizationAction } from "@/app/settings/actions";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Personalization } from "@/lib/db/personalization-queries";

const INSTRUCTIONS_MAX_LENGTH = 1500;

/** Custom instructions plus the memory on/off switch (SPEC §7 Settings, a). */
export function InstructionsForm({ settings }: { settings: Personalization }) {
  const aboutMeId = useId();
  const responseStyleId = useId();
  const memoryId = useId();
  const [state, formAction, isPending] = useActionState(
    updatePersonalizationAction,
    null
  );

  useEffect(() => {
    if (!state) {
      return;
    }

    if (state.success) {
      toast.success("Saved");
    } else {
      toast.error(state.error);
    }
  }, [state]);

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <Label htmlFor={aboutMeId}>What should Able know about you?</Label>
        <Textarea
          defaultValue={settings.aboutMe}
          id={aboutMeId}
          maxLength={INSTRUCTIONS_MAX_LENGTH}
          name="aboutMe"
          placeholder="Your course, year, and anything else Able should know about you."
          rows={4}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor={responseStyleId}>How should Able respond to you?</Label>
        <Textarea
          defaultValue={settings.responseStyle}
          id={responseStyleId}
          maxLength={INSTRUCTIONS_MAX_LENGTH}
          name="responseStyle"
          placeholder="e.g. Be concise. Show every step for maths."
          rows={4}
        />
      </div>

      <div className="flex items-center justify-between gap-4 rounded-xl border border-border px-4 py-3">
        <div>
          <Label htmlFor={memoryId}>Memory</Label>
          <p className="text-muted-foreground text-sm">
            Let Able remember facts you ask it to, across chats.
          </p>
        </div>
        <label
          className="relative inline-flex h-6 w-10 shrink-0 cursor-pointer items-center"
          htmlFor={memoryId}
        >
          <input
            className="peer sr-only"
            defaultChecked={settings.memoryEnabled}
            id={memoryId}
            name="memoryEnabled"
            type="checkbox"
          />
          <span className="absolute inset-0 rounded-full bg-muted transition-colors peer-checked:bg-primary peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2" />
          <span className="absolute left-1 size-4 rounded-full bg-background shadow-sm transition-transform peer-checked:translate-x-4" />
        </label>
      </div>

      <Button className="self-start" disabled={isPending} type="submit">
        {isPending ? "Saving…" : "Save"}
      </Button>
    </form>
  );
}
