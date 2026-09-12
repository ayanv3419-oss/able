import { createGroq } from "@ai-sdk/groq";
import { customProvider, type LanguageModel } from "ai";
import { useMockAI } from "../constants";
import { CHAT_MODEL_ID, TITLE_MODEL_ID } from "./models";

const groq = createGroq({ apiKey: process.env.GROQ_API_KEY });

// Tests must never reach Groq, so they run against the mock models.
const mockProvider = useMockAI
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

/**
 * The Groq provider instance, exposed so the chat route can add
 * `groq.tools.browserSearch({})` when the student turns web search on
 * (SPEC §6). Tests never reach this because the route only adds the tool
 * when the `webSearch` flag is true, and mock chats never set it.
 */
export { groq };
