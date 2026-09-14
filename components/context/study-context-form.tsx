"use client";

import { useActionState, useCallback, useId, useState } from "react";
import {
  createStudyContextAction,
  updateStudyContextAction,
} from "@/app/context/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { StudyContext } from "@/lib/db/schema";
import { STUDY_CONTEXT_MAX_CHARS } from "@/lib/study-context";

export function StudyContextForm({
  folderId,
  material,
}: {
  folderId: string;
  material?: StudyContext;
}) {
  const titleId = useId();
  const contentId = useId();
  const serverAction = material
    ? updateStudyContextAction
    : createStudyContextAction;
  const [state, action, pending] = useActionState(serverAction, null);
  const [length, setLength] = useState(material?.content.length ?? 0);
  const updateLength = useCallback(
    (event: React.ChangeEvent<HTMLTextAreaElement>) =>
      setLength(event.target.value.length),
    []
  );

  return (
    <form action={action} className="flex flex-col gap-5">
      <input name="folderId" type="hidden" value={folderId} />
      {material ? <input name="id" type="hidden" value={material.id} /> : null}
      <div className="flex flex-col gap-2">
        <Label htmlFor={titleId}>Title</Label>
        <Input
          defaultValue={material?.title}
          id={titleId}
          maxLength={120}
          name="title"
          placeholder="e.g. Electrostatics chapter notes"
          required
        />
      </div>
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-3">
          <Label htmlFor={contentId}>Study material</Label>
          <span className="text-muted-foreground text-xs tabular-nums">
            {length.toLocaleString("en-IN")} /{" "}
            {STUDY_CONTEXT_MAX_CHARS.toLocaleString("en-IN")}
          </span>
        </div>
        <Textarea
          className="min-h-72 resize-y font-mono text-sm leading-relaxed"
          defaultValue={material?.content}
          id={contentId}
          maxLength={STUDY_CONTEXT_MAX_CHARS}
          name="content"
          onChange={updateLength}
          placeholder="Paste your notes, textbook section, lecture transcript, or other study text here…"
          required
        />
      </div>
      <p className="text-muted-foreground text-sm">
        {material
          ? "The title and text lock 10 minutes after the original save."
          : "Saving uses one of today's uploads and immediately starts lesson part 1. You can edit or remove it for 10 minutes."}
      </p>
      {state?.success === false ? (
        <p className="text-destructive text-sm" role="alert">
          {state.error}
        </p>
      ) : null}
      {state?.success ? (
        <p className="text-sm text-emerald-600">Saved.</p>
      ) : null}
      <Button className="self-start" disabled={pending} type="submit">
        {pending
          ? "Saving…"
          : material
            ? "Save changes"
            : "Save and start lesson"}
      </Button>
    </form>
  );
}
