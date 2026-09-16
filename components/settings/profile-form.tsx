"use client";

import { useActionState, useEffect, useId } from "react";
import { toast } from "sonner";
import { updateProfileAction } from "@/app/settings/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PROFILE_FIELDS, type UserProfile } from "@/lib/personalization";

type ProfileFieldKey = (typeof PROFILE_FIELDS)[number]["key"];

const PLACEHOLDERS: Record<ProfileFieldKey, string> = {
  displayName: "What should Able call you?",
  interests: "Topics, hobbies, or subjects you enjoy",
  learningPreferences:
    "Examples first, visual explanations, practice questions…",
  responsePreferences: "Short answers, step-by-step help, simple language…",
  role: "Student, teacher, developer, or another role",
};

const SHORT_FIELDS = new Set<ProfileFieldKey>(["displayName", "role"]);

const LANGUAGE_OPTIONS = [
  { label: "English", value: "English" },
  { label: "Hindi", value: "Hindi" },
] as const;

/**
 * The student's profile (docs/SPEC.md §7 Settings). Every field is optional,
 * and Able only uses what the student typed here.
 */
export function ProfileForm({ profile }: { profile: UserProfile }) {
  const id = useId();
  const languageId = `${id}-language`;
  const [state, formAction, isPending] = useActionState(
    updateProfileAction,
    null
  );

  useEffect(() => {
    if (!state) {
      return;
    }

    if (state.success) {
      toast.success("Profile saved");
    } else {
      toast.error(state.error);
    }
  }, [state]);

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {PROFILE_FIELDS.map((field) => {
        const fieldId = `${id}-${field.key}`;

        return (
          <div className="flex flex-col gap-2" key={field.key}>
            <Label htmlFor={fieldId}>{field.label}</Label>
            {SHORT_FIELDS.has(field.key) ? (
              <Input
                defaultValue={profile[field.key]}
                id={fieldId}
                maxLength={field.maxLength}
                name={field.key}
                placeholder={PLACEHOLDERS[field.key]}
              />
            ) : (
              <Textarea
                defaultValue={profile[field.key]}
                id={fieldId}
                maxLength={field.maxLength}
                name={field.key}
                placeholder={PLACEHOLDERS[field.key]}
                rows={2}
              />
            )}
          </div>
        );
      })}

      <div className="flex flex-col gap-2">
        <Label htmlFor={languageId}>Reply language</Label>
        <select
          className="h-9 rounded-md border border-input bg-background px-3 text-sm shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
          defaultValue={profile.preferredLanguage}
          id={languageId}
          name="preferredLanguage"
        >
          {LANGUAGE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <p className="text-muted-foreground text-sm">
          Hindi replies use English letters (Roman Hindi), like “main taiyar
          hoon”. You can switch between English and Roman Hindi in chat.
        </p>
      </div>

      <Button className="self-start" disabled={isPending} type="submit">
        {isPending ? "Saving…" : "Save profile"}
      </Button>
    </form>
  );
}
