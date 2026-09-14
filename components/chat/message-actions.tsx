import equal from "fast-deep-equal";
import { Download, Loader2, RotateCcw } from "lucide-react";
import { memo, useCallback, useState } from "react";
import { toast } from "sonner";
import { useSWRConfig } from "swr";
import { useCopyToClipboard } from "usehooks-ts";
import type { Vote } from "@/lib/db/schema";
import { downloadPdf } from "@/lib/pdf/download";
import type { ChatMessage } from "@/lib/types";
import {
  MessageAction as Action,
  MessageActions as Actions,
} from "../ai-elements/message";
import { CopyIcon, PencilEditIcon, ThumbDownIcon, ThumbUpIcon } from "./icons";

export function PureMessageActions({
  chatId,
  message,
  vote,
  isLoading,
  onEdit,
  onRegenerate,
}: {
  chatId: string;
  message: ChatMessage;
  vote: Vote | undefined;
  isLoading: boolean;
  onEdit?: () => void;
  onRegenerate?: () => void;
}) {
  const { mutate } = useSWRConfig();
  const [isExporting, setIsExporting] = useState(false);
  const handleExport = useCallback(async () => {
    setIsExporting(true);
    try {
      await downloadPdf({ id: message.id, kind: "message" });
    } finally {
      setIsExporting(false);
    }
  }, [message.id]);
  const [_, copyToClipboard] = useCopyToClipboard();

  const textFromParts = message.parts
    ?.filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("\n")
    .trim();

  const handleCopy = useCallback(async () => {
    if (!textFromParts) {
      toast.error("There's no text to copy!");
      return;
    }

    await copyToClipboard(textFromParts);
    toast.success("Copied to clipboard!");
  }, [copyToClipboard, textFromParts]);

  const handleUpvote = useCallback(() => {
    const upvote = fetch(
      `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/api/vote`,
      {
        body: JSON.stringify({
          chatId,
          messageId: message.id,
          type: "up",
        }),
        method: "PATCH",
      }
    );

    toast.promise(upvote, {
      error: "Failed to upvote response.",
      loading: "Upvoting Response...",
      success: () => {
        mutate<Vote[]>(
          `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/api/vote?chatId=${chatId}`,
          (currentVotes) => {
            if (!currentVotes) {
              return [];
            }

            const votesWithoutCurrent = currentVotes.filter(
              (currentVote) => currentVote.messageId !== message.id
            );

            return [
              ...votesWithoutCurrent,
              {
                chatId,
                isUpvoted: true,
                messageId: message.id,
              },
            ];
          },
          { revalidate: false }
        );

        return "Upvoted Response!";
      },
    });
  }, [chatId, message.id, mutate]);

  const handleDownvote = useCallback(() => {
    const downvote = fetch(
      `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/api/vote`,
      {
        body: JSON.stringify({
          chatId,
          messageId: message.id,
          type: "down",
        }),
        method: "PATCH",
      }
    );

    toast.promise(downvote, {
      error: "Failed to downvote response.",
      loading: "Downvoting Response...",
      success: () => {
        mutate<Vote[]>(
          `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/api/vote?chatId=${chatId}`,
          (currentVotes) => {
            if (!currentVotes) {
              return [];
            }

            const votesWithoutCurrent = currentVotes.filter(
              (currentVote) => currentVote.messageId !== message.id
            );

            return [
              ...votesWithoutCurrent,
              {
                chatId,
                isUpvoted: false,
                messageId: message.id,
              },
            ];
          },
          { revalidate: false }
        );

        return "Downvoted Response!";
      },
    });
  }, [chatId, message.id, mutate]);

  if (isLoading) {
    return null;
  }

  if (message.role === "user") {
    return (
      <Actions className="-mr-0.5 justify-end opacity-0 transition-opacity duration-150 group-hover/message:opacity-100">
        <div className="flex items-center gap-0.5">
          {onEdit ? (
            <Action
              className="size-7 text-muted-foreground/50 hover:text-foreground"
              data-testid="message-edit-button"
              onClick={onEdit}
              tooltip="Edit"
            >
              <PencilEditIcon />
            </Action>
          ) : null}
          <Action
            className="size-7 text-muted-foreground/50 hover:text-foreground"
            onClick={handleCopy}
            tooltip="Copy"
          >
            <CopyIcon />
          </Action>
        </div>
      </Actions>
    );
  }

  return (
    <Actions className="-ml-0.5 opacity-100 transition-opacity duration-150 md:opacity-0 md:group-hover/message:opacity-100 focus-within:opacity-100">
      {textFromParts && (
        <Action
          aria-label="Save as PDF"
          disabled={isExporting}
          onClick={handleExport}
          tooltip="Save as PDF"
        >
          {isExporting ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Download className="size-4" />
          )}
        </Action>
      )}
      {Boolean(onRegenerate) && (
        <Action
          data-testid="message-regenerate"
          onClick={onRegenerate}
          tooltip="Regenerate response"
        >
          <RotateCcw className="size-4" />
        </Action>
      )}
      <Action
        className="text-muted-foreground/50 hover:text-foreground"
        onClick={handleCopy}
        tooltip="Copy"
      >
        <CopyIcon />
      </Action>

      <Action
        className="text-muted-foreground/50 hover:text-foreground"
        data-testid="message-upvote"
        disabled={vote?.isUpvoted}
        onClick={handleUpvote}
        tooltip="Upvote Response"
      >
        <ThumbUpIcon />
      </Action>

      <Action
        className="text-muted-foreground/50 hover:text-foreground"
        data-testid="message-downvote"
        disabled={vote && !vote.isUpvoted}
        onClick={handleDownvote}
        tooltip="Downvote Response"
      >
        <ThumbDownIcon />
      </Action>
    </Actions>
  );
}

export const MessageActions = memo(
  PureMessageActions,
  (prevProps, nextProps) => {
    if (
      prevProps.message !== nextProps.message ||
      prevProps.onEdit !== nextProps.onEdit ||
      prevProps.onRegenerate !== nextProps.onRegenerate
    ) {
      return false;
    }
    if (!equal(prevProps.vote, nextProps.vote)) {
      return false;
    }
    if (prevProps.isLoading !== nextProps.isLoading) {
      return false;
    }

    return true;
  }
);
