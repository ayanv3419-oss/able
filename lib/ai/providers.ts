import { createGroq } from "@ai-sdk/groq";
import { customProvider, type LanguageModel } from "ai";
import { isTestEnvironment } from "../constants";
import { CHAT_MODEL_ID, TITLE_MODEL_ID } from "./models";

const groq = createGroq({ apiKey: process.env.GROQ_API_KEY });

// Tests must never reach Groq, so they run against the mock models.
const mockProvider = isTestEnvironment
  ? (() => {
      const {
        chatModel,
        titleModel: mockTitleModel,
      } = require("./models.mock");
      return customProvider({
        languageModels: {
          "chat-model": chatModel,
          "title-model": mockTitleModel,
        },
      });
    })()
  : null;

export function getChatModel(): LanguageModel {
  if (mockProvider) {
    return mockProvider.languageModel("chat-model");
  }
  return groq(CHAT_MODEL_ID);
}

export function getTitleModel(): LanguageModel {
  if (mockProvider) {
    return mockProvider.languageModel("title-model");
  }
  return groq(TITLE_MODEL_ID);
}
