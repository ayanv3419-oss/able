"use client";

import {
  type MouseEvent,
  useActionState,
  useCallback,
  useEffect,
  useRef,
  useTransition,
} from "react";
import { toast } from "sonner";
import { addApiKeyAction, removeApiKeyAction } from "@/app/settings/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type SafeApiKey = {
  id: string;
  label: string | null;
  preview: string;
  provider: "groq" | "gemini";
  status: "active" | "disabled";
};

export function ApiKeyManager({ apiKeys }: { apiKeys: SafeApiKey[] }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, adding] = useActionState(addApiKeyAction, null);
  const [removing, startRemoving] = useTransition();

  useEffect(() => {
    if (!state) {
      return;
    }
    if (state.success) {
      formRef.current?.reset();
      toast.success("API key added to Able's shared pool");
    } else {
      toast.error(state.error);
    }
  }, [state]);

  const remove = useCallback((event: MouseEvent<HTMLButtonElement>) => {
    const id = event.currentTarget.dataset.keyId;
    if (!id) {
      return;
    }
    startRemoving(async () => {
      try {
        await removeApiKeyAction(id);
        toast.success("API key removed");
      } catch {
        toast.error("Able couldn't remove that key.");
      }
    });
  }, []);

  return (
    <div className="flex flex-col gap-5">
      <p className="text-muted-foreground text-sm">
        Keys added here power the shared Able service for every student. They
        are encrypted before storage and are never shown again.
      </p>

      {apiKeys.length ? (
        <ul className="flex flex-col gap-2">
          {apiKeys.map((key) => (
            <li
              className="flex items-center justify-between gap-3 rounded-lg border p-3"
              key={key.id}
            >
              <div className="min-w-0 text-sm">
                <p className="truncate font-medium">
                  {key.label ||
                    (key.provider === "groq" ? "Groq key" : "Gemini key")}
                </p>
                <p className="text-muted-foreground">
                  {key.provider === "groq" ? "Groq" : "Gemini"} · {key.preview}{" "}
                  · {key.status}
                </p>
              </div>
              <Button
                data-key-id={key.id}
                disabled={removing}
                onClick={remove}
                size="sm"
                type="button"
                variant="outline"
              >
                Remove
              </Button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-muted-foreground text-sm">
          No contributed keys yet.
        </p>
      )}

      <form action={formAction} className="grid gap-4" ref={formRef}>
        <div className="grid gap-2 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="api-key-provider">Provider</Label>
            <select
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              defaultValue="groq"
              id="api-key-provider"
              name="provider"
            >
              <option value="groq">Groq</option>
              <option value="gemini">Gemini</option>
            </select>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="api-key-label">Label</Label>
            <Input
              id="api-key-label"
              maxLength={60}
              name="label"
              placeholder="e.g. My backup key"
            />
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="api-key-secret">API key</Label>
          <Input
            autoComplete="off"
            id="api-key-secret"
            maxLength={500}
            name="apiKey"
            placeholder="Paste the provider key"
            required
            type="password"
          />
        </div>
        <Button className="self-start" disabled={adding} type="submit">
          {adding ? "Checking key…" : "Add shared key"}
        </Button>
      </form>
    </div>
  );
}
