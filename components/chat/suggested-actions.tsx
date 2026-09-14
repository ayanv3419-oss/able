"use client";

import type { UseChatHelpers } from "@ai-sdk/react";
import { motion } from "framer-motion";
import { memo, useCallback } from "react";
import { suggestions } from "@/lib/suggestions";
import type { ChatMessage } from "@/lib/types";
import { Suggestion } from "../ai-elements/suggestion";
import type { VisibilityType } from "./visibility-selector";

type SuggestedActionsProps = {
  chatId: string;
  sendMessage: UseChatHelpers<ChatMessage>["sendMessage"];
  selectedVisibilityType: VisibilityType;
};

function PureSuggestedActions({ chatId, sendMessage }: SuggestedActionsProps) {
  const suggestedActions = suggestions;
  const handleSuggestionClick = useCallback(
    (suggestion: string) => {
      window.history.pushState(
        {},
        "",
        `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/chat/${chatId}`
      );
      sendMessage({
        parts: [{ text: suggestion, type: "text" }],
        role: "user",
      });
    },
    [chatId, sendMessage]
  );

  return (
    <div
      className="grid w-full grid-cols-2 gap-2.5"
      data-testid="suggested-actions"
    >
      {suggestedActions.map((suggestedAction, index) => (
        <motion.div
          animate={{ opacity: 1, y: 0 }}
          className="min-w-0"
          exit={{ opacity: 0, y: 16 }}
          initial={{ opacity: 0, y: 16 }}
          key={suggestedAction}
          transition={{
            delay: 0.06 * index,
            duration: 0.4,
            ease: [0.22, 1, 0.36, 1],
          }}
        >
          <Suggestion
            className="h-full min-h-[64px] w-full whitespace-normal rounded-2xl border border-border/60 bg-card/55 px-3 py-3 text-center text-[12px] leading-snug text-muted-foreground shadow-[var(--shadow-card)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-card hover:text-foreground hover:shadow-[var(--shadow-float)] sm:min-h-[56px] sm:px-4 sm:text-[13px]"
            onClick={handleSuggestionClick}
            suggestion={suggestedAction}
          >
            {suggestedAction}
          </Suggestion>
        </motion.div>
      ))}
    </div>
  );
}

export const SuggestedActions = memo(
  PureSuggestedActions,
  (prevProps, nextProps) => {
    if (prevProps.chatId !== nextProps.chatId) {
      return false;
    }
    if (prevProps.selectedVisibilityType !== nextProps.selectedVisibilityType) {
      return false;
    }

    return true;
  }
);
