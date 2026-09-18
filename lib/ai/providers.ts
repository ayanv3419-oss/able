import { createGroq, type GroqProvider } from "@ai-sdk/groq";
import { customProvider, type LanguageModel } from "ai";
import { useMockAI } from "../constants";
import {
  markAIKeyFailure,
  markAIKeyHealthy,
  modelForSelection,
  type SelectedAIKey,
  selectAIKey,
  withAIKeyFailover,
} from "./key-pool";
import {
  checkLocalHealth,
  isLocalAvailable,
  isLocalConfigured,
  localChatModel,
  markLocalFailure,
  markLocalHealthy,
} from "./local-model";

// Tests must never reach Groq, so they run against the mock models.
const mockProvider = useMockAI
  ? (() => {
      const { chatModel, titleModel } = require("./models.mock");
      return customProvider({
        languageModels: {
          "chat-model": chatModel,
          "title-model": titleModel,
        },
      });
    })()
  : null;
const mockGroq = useMockAI ? createGroq({ apiKey: "mock" }) : null;

export type ModelSelection = {
  groqClient?: GroqProvider;
  keyId: string;
  model: LanguageModel;
  provider: "groq" | "gemini" | "local";
  raw?: SelectedAIKey;
};

function toModelSelection(
  selected: SelectedAIKey,
  purpose: "chat" | "title"
): ModelSelection {
  return {
    groqClient: selected.provider === "groq" ? selected.client : undefined,
    keyId: selected.keyId,
    model: modelForSelection(selected, purpose),
    provider: selected.provider,
    raw: selected,
  };
}

/** Thrown when a request needs vision but the local model is unavailable. */
export class LocalVisionUnavailableError extends Error {
  constructor() {
    super("The local vision model is offline.");
    this.name = "LocalVisionUnavailableError";
  }
}

function localSelection(): ModelSelection {
  return { keyId: "local", model: localChatModel(), provider: "local" };
}

export async function getChatModelSelection({
  allowGemini = true,
  allowLocal = true,
  requireLocal = false,
}: {
  allowGemini?: boolean;
  allowLocal?: boolean;
  requireLocal?: boolean;
} = {}): Promise<ModelSelection> {
  if (mockProvider) {
    return {
      groqClient: mockGroq ?? undefined,
      keyId: "mock",
      model: mockProvider.languageModel("chat-model"),
      provider: "groq",
    };
  }
  // Images can only be read by the local vision model; never fall back to Groq.
  if (requireLocal) {
    if (isLocalConfigured() && (await checkLocalHealth())) {
      return localSelection();
    }
    throw new LocalVisionUnavailableError();
  }
  // Prefer the local box when configured and healthy; otherwise the Groq/Gemini
  // key pool serves the request exactly as before.
  if (allowLocal && isLocalAvailable() && (await checkLocalHealth())) {
    return localSelection();
  }
  return toModelSelection(await selectAIKey({ allowGemini }), "chat");
}

export function withTitleModelFailover<T>(
  operation: (selection: ModelSelection) => Promise<T>
): Promise<T> {
  if (mockProvider) {
    return operation({
      groqClient: mockGroq ?? undefined,
      keyId: "mock",
      model: mockProvider.languageModel("title-model"),
      provider: "groq",
    });
  }
  return withAIKeyFailover((selection) =>
    operation(toModelSelection(selection, "title"))
  );
}

export function markModelSelectionFailure(
  selection: ModelSelection,
  error: unknown
) {
  if (selection.provider === "local") {
    markLocalFailure();
    return true;
  }
  return selection.raw ? markAIKeyFailure(selection.raw, error) : false;
}

export async function markModelSelectionHealthy(selection: ModelSelection) {
  if (selection.provider === "local") {
    markLocalHealthy();
    return;
  }
  if (selection.raw) {
    await markAIKeyHealthy(selection.raw);
  }
}

/** Whether an image request can be served right now (local vision, healthy). */
export async function isVisionModelAvailable(): Promise<boolean> {
  return (
    isLocalConfigured() && isLocalAvailable() && (await checkLocalHealth())
  );
}
