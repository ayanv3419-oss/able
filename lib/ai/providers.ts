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
  provider: "groq" | "gemini";
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

export async function getChatModelSelection({
  allowGemini = true,
}: {
  allowGemini?: boolean;
} = {}): Promise<ModelSelection> {
  if (mockProvider) {
    return {
      groqClient: mockGroq ?? undefined,
      keyId: "mock",
      model: mockProvider.languageModel("chat-model"),
      provider: "groq",
    };
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
  return selection.raw ? markAIKeyFailure(selection.raw, error) : false;
}

export async function markModelSelectionHealthy(selection: ModelSelection) {
  if (selection.raw) {
    await markAIKeyHealthy(selection.raw);
  }
}
