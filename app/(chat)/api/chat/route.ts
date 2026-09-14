import type { GroqProviderOptions } from "@ai-sdk/groq";
import { geolocation, ipAddress } from "@vercel/functions";
import {
  APICallError,
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  generateId,
  isStepCount,
  type LanguageModelUsage,
  type StepResult,
  streamText,
  type Tool,
  type ToolSet,
  toUIMessageStream,
} from "ai";
import { checkBotId } from "botid/server";
import { after } from "next/server";
import { createResumableStreamContext } from "resumable-stream";
import { auth } from "@/app/(auth)/auth";
import { generateChatTitle } from "@/lib/ai/generate-title";
import { GroqSearchTracker } from "@/lib/ai/groq-search";
import { buildPersonalizationContext } from "@/lib/ai/personalization-context";
import { type RequestHints, systemPrompt } from "@/lib/ai/prompts";
import { getChatModel, groq } from "@/lib/ai/providers";
import {
  collectResearch,
  RESEARCH_LIMITS,
  ResearchError,
  researchReportInstructions,
} from "@/lib/ai/research";
import { normalizeResearchCitations } from "@/lib/ai/research-citations";
import { createDocument } from "@/lib/ai/tools/create-document";
import { editDocument } from "@/lib/ai/tools/edit-document";
import { requestSuggestions } from "@/lib/ai/tools/request-suggestions";
import { saveMemory } from "@/lib/ai/tools/save-memory";
import { updateDocument } from "@/lib/ai/tools/update-document";
import { usageForBilling } from "@/lib/ai/usage";
import { isProductionEnvironment } from "@/lib/constants";
import { getAttachments } from "@/lib/db/attachment-queries";
import { finishFeature, reserveFeature } from "@/lib/db/feature-queries";
import {
  createStreamId,
  deleteChatById,
  deleteMessagesByChatIdAfterTimestamp,
  getChatById,
  getMessagesByChatId,
  saveChat,
  saveMessages,
  updateChatTitleById,
  updateMessage,
} from "@/lib/db/queries";
import type { DBMessage } from "@/lib/db/schema";
import { insertUsageEvent } from "@/lib/db/usage-queries";
import { getEntitlement } from "@/lib/entitlements";
import { ChatbotError } from "@/lib/errors";
import { costMicros } from "@/lib/metering";
import { getPlan, type PlanId } from "@/lib/plans";
import { checkIpRateLimit } from "@/lib/ratelimit";
import type { ChatMessage, WaitingStatusData } from "@/lib/types";
import { convertToUIMessages, generateUUID } from "@/lib/utils";
import { type PostRequestBody, postRequestBodySchema } from "./schema";

export const maxDuration = 180;

const STILL_WAITING_DELAY_MS = 9000;
const ATTACHMENT_URL_PREFIX = "attachment://";

function isModelStreamActivity(chunk: { type: string }) {
  return !["start", "start-step", "finish-step", "finish", "raw"].includes(
    chunk.type
  );
}

function getStreamContext() {
  try {
    return createResumableStreamContext({ waitUntil: after });
  } catch {
    return null;
  }
}

export { getStreamContext };

type FilePart = {
  type: "file";
  mediaType: string;
  filename?: string;
  url: string;
};

function isFilePart(part: { type: string }): part is FilePart {
  return part.type === "file";
}

/**
 * Swaps every `attachment://<id>` file part for a text part carrying the
 * stored extraction, after checking the attachment belongs to the caller.
 * Reject missing or foreign attachments before sending anything to the model.
 */
async function resolveAttachmentParts(
  messages: ChatMessage[],
  userId: string
): Promise<ChatMessage[]> {
  const ids = new Set<string>();

  for (const message of messages) {
    for (const part of message.parts) {
      if (isFilePart(part) && part.url.startsWith(ATTACHMENT_URL_PREFIX)) {
        ids.add(part.url.slice(ATTACHMENT_URL_PREFIX.length));
      }
    }
  }

  if (ids.size === 0) {
    return messages;
  }

  const attachments = await getAttachments({ ids: [...ids], userId });
  const byId = new Map(
    attachments.map((attachment) => [attachment.id, attachment])
  );

  return messages.map((message) => ({
    ...message,
    parts: message.parts.flatMap((part) => {
      if (!isFilePart(part) || !part.url.startsWith(ATTACHMENT_URL_PREFIX)) {
        return [part];
      }

      const attachment = byId.get(part.url.slice(ATTACHMENT_URL_PREFIX.length));

      if (!attachment) {
        throw new ChatbotError(
          "bad_request:api",
          "An attachment is missing or belongs to another account."
        );
      }

      return [
        {
          text: `Attached file "${attachment.name}": ${attachment.text}`,
          type: "text" as const,
        },
      ];
    }),
  })) as ChatMessage[];
}

/** Billing numbers summed across every step of one assistant turn. */
type StepBilling = {
  inputTokens: number;
  cachedInputTokens: number;
  outputTokens: number;
  reasoningTokens: number;
  searchCount: number;
};

function aggregateStepsForBilling<TOOLS extends ToolSet>(
  steps: readonly StepResult<TOOLS>[]
): StepBilling {
  return steps.reduce<StepBilling>(
    (acc, step) => {
      const { usage } = step;
      return {
        cachedInputTokens:
          acc.cachedInputTokens +
          (usage.inputTokenDetails?.cacheReadTokens ?? 0),
        inputTokens: acc.inputTokens + usageForBilling(usage).inputTokens,
        outputTokens: acc.outputTokens + (usage.outputTokens ?? 0),
        reasoningTokens:
          acc.reasoningTokens +
          (usage.outputTokenDetails?.reasoningTokens ?? 0),
        searchCount:
          acc.searchCount +
          step.toolCalls.filter((call) => call.toolName === "browser_search")
            .length,
      };
    },
    {
      cachedInputTokens: 0,
      inputTokens: 0,
      outputTokens: 0,
      reasoningTokens: 0,
      searchCount: 0,
    }
  );
}

function billingFromUsage(
  usage: LanguageModelUsage,
  searchCount: number
): StepBilling {
  return {
    cachedInputTokens: usage.inputTokenDetails?.cacheReadTokens ?? 0,
    inputTokens: usageForBilling(usage).inputTokens,
    outputTokens: usage.outputTokens ?? 0,
    reasoningTokens: usage.outputTokenDetails?.reasoningTokens ?? 0,
    searchCount,
  };
}

/** Records what one assistant turn cost. Never throws into the chat stream. */
async function recordChatUsage({
  billing,
  chatId,
  planId,
  userId,
}: {
  userId: string;
  chatId: string;
  planId: PlanId;
  billing: StepBilling;
}) {
  try {
    await insertUsageEvent({
      audioSeconds: 0,
      cachedInputTokens: billing.cachedInputTokens,
      chatId,
      costMicros: costMicros({
        cachedInputTokens: billing.cachedInputTokens,
        inputTokens: billing.inputTokens,
        model: "chat",
        outputTokens: billing.outputTokens,
        webSearches: billing.searchCount,
      }),
      countsTowardLimit: true,
      inputTokens: billing.inputTokens,
      kind: "chat",
      outputTokens: billing.outputTokens,
      planId,
      reasoningTokens: billing.reasoningTokens,
      userId,
      webSearches: billing.searchCount,
    });
  } catch (error) {
    console.error("Failed to record chat usage:", error);
  }
}

function textOfParts(parts: ChatMessage["parts"]): string {
  return parts
    .map((part) => (part.type === "text" ? part.text : ""))
    .filter(Boolean)
    .join("\n");
}

/** The newest user message's text, used to pick relevant memories and the reply language. */
function latestUserText(messages: ChatMessage[]): string {
  const latest = messages.findLast((item) => item.role === "user");
  return latest ? textOfParts(latest.parts) : "";
}

/** A short tail of the conversation, so follow-ups like "explain that again" stay on topic. */
function recentConversationText(messages: ChatMessage[]): string {
  return messages
    .slice(-6)
    .map((item) => textOfParts(item.parts))
    .join("\n")
    .slice(-1500);
}

export async function POST(request: Request) {
  let requestBody: PostRequestBody;

  try {
    const json = await request.json();
    requestBody = postRequestBodySchema.parse(json);
  } catch {
    return new ChatbotError("bad_request:api").toResponse();
  }

  try {
    const {
      id,
      message,
      messages,
      selectedVisibilityType,
      webSearch,
      deepResearch,
      trigger,
    } = requestBody;

    const [botIdResult, session] = await Promise.all([
      isProductionEnvironment ? checkBotId().catch(() => null) : null,
      auth(),
    ]);

    if (botIdResult?.isBot) {
      return new ChatbotError("forbidden:api").toResponse();
    }

    if (!session?.user) {
      return new ChatbotError("unauthorized:chat").toResponse();
    }

    await checkIpRateLimit(ipAddress(request));

    const userId = session.user.id;

    // Entitlements and metering gate every model call (SPEC §1, §5, §6).
    const entitlement = await getEntitlement(userId);

    if (!entitlement.canSend || !entitlement.planId) {
      if (
        entitlement.blockReason === "daily-limit" ||
        entitlement.blockReason === "fair-use-limit"
      ) {
        return new ChatbotError(
          "rate_limit:chat",
          entitlement.blockReason
        ).toResponse();
      }

      return new ChatbotError(
        "forbidden:plan",
        entitlement.blockReason ?? undefined
      ).toResponse();
    }

    const { planId } = entitlement;
    if (deepResearch && RESEARCH_LIMITS[planId].daily === 0) {
      return new ChatbotError(
        "forbidden:research",
        "Deep research is available on Plus and Pro."
      ).toResponse();
    }

    const isToolApprovalFlow = Boolean(messages);

    const chat = await getChatById({ id });
    let messagesFromDb: DBMessage[] = [];
    let titlePromise: Promise<string> | null = null;

    if (chat) {
      if (chat.userId !== session.user.id) {
        return new ChatbotError("forbidden:chat").toResponse();
      }
      messagesFromDb = await getMessagesByChatId({ id });
      const existingIndex = message
        ? messagesFromDb.findIndex((item) => item.id === message.id)
        : -1;
      if (existingIndex >= 0) {
        if (
          trigger !== "regenerate-message" ||
          messagesFromDb[existingIndex].role !== "user"
        ) {
          return new ChatbotError(
            "bad_request:api",
            "This message has already been sent."
          ).toResponse();
        }
        await resolveAttachmentParts([message as ChatMessage], userId);
        await deleteMessagesByChatIdAfterTimestamp({
          chatId: id,
          timestamp: messagesFromDb[existingIndex].createdAt,
        });
        messagesFromDb = messagesFromDb.slice(0, existingIndex);
      }
    } else if (message?.role === "user") {
      await resolveAttachmentParts([message as ChatMessage], userId);
      await saveChat({
        id,
        title: "New chat",
        userId: session.user.id,
        visibility: selectedVisibilityType,
      });
      titlePromise = generateChatTitle({ chatId: id, message, userId }).catch(
        () => "New chat"
      );
    } else {
      return new ChatbotError("not_found:chat").toResponse();
    }

    let uiMessages: ChatMessage[];

    if (isToolApprovalFlow && messages) {
      const dbMessages = convertToUIMessages(messagesFromDb);
      const approvalStates = new Map(
        messages.flatMap(
          (m) =>
            m.parts
              ?.filter(
                (p: Record<string, unknown>) =>
                  p.state === "approval-responded" ||
                  p.state === "output-denied"
              )
              .map((p: Record<string, unknown>) => [
                String(p.toolCallId ?? ""),
                p,
              ]) ?? []
        )
      );
      uiMessages = dbMessages.map((msg) => ({
        ...msg,
        parts: msg.parts.map((part) => {
          if (
            "toolCallId" in part &&
            approvalStates.has(String(part.toolCallId))
          ) {
            return { ...part, ...approvalStates.get(String(part.toolCallId)) };
          }
          return part;
        }),
      })) as ChatMessage[];
    } else {
      uiMessages = [
        ...convertToUIMessages(messagesFromDb),
        message as ChatMessage,
      ];
    }

    const { longitude, latitude, city, country } = geolocation(request);

    const requestHints: RequestHints = {
      city,
      country,
      latitude,
      longitude,
    };

    // Personalized context: profile, custom instructions, relevant memories,
    // project instructions and same-project history, in docs/SPEC.md §6 order.
    // buildPersonalizationContext re-checks project ownership itself.
    const personal = await buildPersonalizationContext({
      // Higher plans draw on more memories per answer (lib/plans.ts).
      contextMemories: getPlan(planId).contextMemories,
      conversationHint: recentConversationText(uiMessages),
      currentChatId: id,
      currentInput: latestUserText(uiMessages),
      projectId: chat?.projectId ?? null,
      userId,
    });
    const userSettings = personal.settings;

    const resolvedMessages = await resolveAttachmentParts(uiMessages, userId);
    const textLength = resolvedMessages.reduce(
      (total, item) =>
        total +
        item.parts.reduce(
          (length, part) =>
            length + (part.type === "text" ? part.text.length : 0),
          0
        ),
      0
    );
    if (textLength > 360_000) {
      return new ChatbotError(
        "bad_request:api",
        "This conversation is too long. Start a new chat or use smaller files."
      ).toResponse();
    }
    const modelMessages = await convertToModelMessages(resolvedMessages);
    const researchReservation = deepResearch
      ? await reserveFeature({
          kind: "research",
          limit: RESEARCH_LIMITS[planId].daily,
          userId,
        })
      : null;
    if (researchReservation && "error" in researchReservation) {
      return new ChatbotError(
        "rate_limit:research",
        researchReservation.error === "busy"
          ? "A research report is already running. Wait for it to finish."
          : `You've used today's ${RESEARCH_LIMITS[planId].daily} research reports. They reset at midnight India time.`
      ).toResponse();
    }
    try {
      if (message?.role === "user") {
        await saveMessages({
          messages: [
            {
              attachments: [],
              chatId: id,
              createdAt: new Date(),
              id: message.id,
              parts: message.parts,
              role: "user",
            },
          ],
        });
      }
    } catch (error) {
      if (researchReservation) {
        await finishFeature(researchReservation.id, false);
      }
      throw error;
    }

    let researchFinished = false;
    const completeResearch = async (successful: boolean) => {
      if (!researchReservation || researchFinished) {
        return;
      }
      researchFinished = true;
      await finishFeature(researchReservation.id, successful);
    };
    const modelSignal = deepResearch
      ? AbortSignal.any([request.signal, AbortSignal.timeout(165_000)])
      : request.signal;

    const stream = createUIMessageStream({
      execute: async ({ writer: dataStream }) => {
        let researchInstructions = "";
        let researchSources: { url: string }[] = [];
        if (deepResearch) {
          try {
            const evidence = await collectResearch({
              messages: modelMessages,
              onProgress: (text) =>
                dataStream.write({
                  data: { message: text, phase: "thinking" },
                  transient: true,
                  type: "data-waiting-status",
                }),
              onSource: (source) =>
                dataStream.write({ type: "source-url", ...source }),
              onUsage: (usage, searches) =>
                recordChatUsage({
                  billing: billingFromUsage(usage, searches),
                  chatId: id,
                  planId,
                  userId,
                }),
              planId,
              signal: modelSignal,
            });
            researchInstructions = researchReportInstructions(evidence);
            researchSources = evidence.sources;
          } catch (error) {
            await completeResearch(false);
            throw error;
          }
        }
        let usageRecorded = false;
        let hasModelActivity = false;
        let stillWaitingTimer: ReturnType<typeof setTimeout> | undefined;

        const clearStillWaitingTimer = () => {
          if (stillWaitingTimer) {
            clearTimeout(stillWaitingTimer);
          }
        };

        const writeWaitingStatus = (
          phase: WaitingStatusData["phase"],
          messageText: string
        ) => {
          if (hasModelActivity && phase !== "thinking") {
            return;
          }
          dataStream.write({
            data: { message: messageText, phase },
            transient: true,
            type: "data-waiting-status",
          });
        };

        writeWaitingStatus(
          "waiting",
          deepResearch ? "Writing your research report…" : "Waiting..."
        );

        stillWaitingTimer = setTimeout(() => {
          writeWaitingStatus("still-waiting", "Still waiting...");
        }, STILL_WAITING_DELAY_MS);

        const markModelActive = () => {
          if (hasModelActivity) {
            return;
          }
          hasModelActivity = true;
          clearStillWaitingTimer();
          writeWaitingStatus("thinking", "Thinking...");
        };

        const stopWaitingStatus = () => {
          hasModelActivity = true;
          clearStillWaitingTimer();
        };

        const toolSet = {
          createDocument: createDocument({ dataStream, session }),
          editDocument: editDocument({ dataStream, session }),
          requestSuggestions: requestSuggestions({ dataStream, session }),
          updateDocument: updateDocument({ dataStream, session }),
          ...(userSettings.memoryEnabled
            ? {
                saveMemory: saveMemory({
                  projectId: personal.projectId,
                  userId,
                }),
              }
            : {}),
          // @ai-sdk/groq pins an older @ai-sdk/provider-utils than this repo's
          // "ai", so its tool factory's structural type doesn't quite match
          // this build's `Tool`. The cast is safe: Groq's own SDK produces it.
          ...(webSearch && !deepResearch
            ? {
                browser_search: groq.tools.browserSearch({}) as unknown as Tool,
              }
            : {}),
        };

        const searchTracker = new GroqSearchTracker();
        const result = streamText({
          abortSignal: modelSignal,
          activeTools: deepResearch
            ? []
            : (Object.keys(toolSet) as (keyof typeof toolSet)[]),
          include: { rawChunks: webSearch && !deepResearch },
          instructions:
            systemPrompt({
              personalization: personal.context,
              requestHints,
            }) + (researchInstructions ? `\n\n${researchInstructions}` : ""),
          messages: modelMessages,
          model: getChatModel(),
          async onAbort(event) {
            await completeResearch(false);
            stopWaitingStatus();
            if (usageRecorded) {
              return;
            }
            usageRecorded = true;
            const billing = aggregateStepsForBilling(event.steps);
            billing.searchCount = Math.max(
              billing.searchCount,
              searchTracker.searchCount
            );
            await recordChatUsage({ billing, chatId: id, planId, userId });
          },
          onChunk({ chunk }) {
            if (chunk.type === "start-step") {
              searchTracker.startStep();
            }
            if (chunk.type === "raw") {
              for (const source of searchTracker.read(chunk.rawValue)) {
                dataStream.write({ type: "source-url", ...source });
              }
            }
            if (isModelStreamActivity(chunk)) {
              markModelActive();
            }
          },
          async onEnd(event) {
            stopWaitingStatus();
            if (usageRecorded) {
              return;
            }
            usageRecorded = true;
            const billing = billingFromUsage(
              event.usage,
              Math.max(
                searchTracker.searchCount,
                event.toolCalls.filter(
                  (call) => call?.toolName === "browser_search"
                ).length
              )
            );
            await recordChatUsage({ billing, chatId: id, planId, userId });
          },
          async onError() {
            await completeResearch(false);
            stopWaitingStatus();
          },
          providerOptions: {
            groq: {
              reasoningEffort: entitlement.reasoningEffort,
            } satisfies GroqProviderOptions,
          },
          stopWhen: isStepCount(5),
          telemetry: {
            functionId: "stream-text",
            isEnabled: isProductionEnvironment,
          },
          tools: toolSet,
        });

        dataStream.merge(
          toUIMessageStream({
            sendReasoning: true,
            sendSources: true,
            stream: deepResearch
              ? normalizeResearchCitations(result.stream, researchSources)
              : result.stream,
          })
        );

        if (titlePromise) {
          try {
            const title = await titlePromise;
            dataStream.write({ data: title, type: "data-chat-title" });
            await updateChatTitleById({ chatId: id, title });
          } catch {
            /* non-fatal */
          }
        }
      },
      generateId: generateUUID,
      onEnd: async ({ messages: finishedMessages }) => {
        if (isToolApprovalFlow) {
          await Promise.all(
            finishedMessages.map(async (finishedMsg) => {
              const existingMsg = uiMessages.find(
                (m) => m.id === finishedMsg.id
              );
              if (existingMsg) {
                await updateMessage({
                  id: finishedMsg.id,
                  parts: finishedMsg.parts,
                });
                return;
              }

              await saveMessages({
                messages: [
                  {
                    attachments: [],
                    chatId: id,
                    createdAt: new Date(),
                    id: finishedMsg.id,
                    parts: finishedMsg.parts,
                    role: finishedMsg.role,
                  },
                ],
              });
            })
          );
        } else if (finishedMessages.length > 0) {
          await saveMessages({
            messages: finishedMessages.map((currentMessage) => ({
              attachments: [],
              chatId: id,
              createdAt: new Date(),
              id: currentMessage.id,
              parts: currentMessage.parts,
              role: currentMessage.role,
            })),
          });
        }
        await completeResearch(
          finishedMessages.some((item) =>
            item.parts.some((part) => part.type === "text" && part.text.trim())
          )
        );
      },
      onError: (error) => {
        if (error instanceof ResearchError) {
          return error.message;
        }
        if (deepResearch && modelSignal.aborted) {
          return "This research took too long. Try a narrower question.";
        }
        return APICallError.isInstance(error) && error.statusCode === 429
          ? "Able is busy right now, try again in a minute."
          : "Able could not finish this response. Please try again.";
      },
      originalMessages: isToolApprovalFlow ? uiMessages : undefined,
    });

    return createUIMessageStreamResponse({
      async consumeSseStream({ stream: sseStream }) {
        if (!process.env.REDIS_URL) {
          return;
        }
        try {
          const streamContext = getStreamContext();
          if (streamContext) {
            const streamId = generateId();
            await createStreamId({ chatId: id, streamId });
            await streamContext.createNewResumableStream(
              streamId,
              () => sseStream
            );
          }
        } catch {
          /* non-critical */
        }
      },
      stream,
    });
  } catch (error) {
    const vercelId = request.headers.get("x-vercel-id");

    if (error instanceof ChatbotError) {
      return error.toResponse();
    }

    console.error("Unhandled error in chat API:", error, { vercelId });
    return new ChatbotError("offline:chat").toResponse();
  }
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return new ChatbotError("bad_request:api").toResponse();
  }

  const session = await auth();

  if (!session?.user) {
    return new ChatbotError("unauthorized:chat").toResponse();
  }

  const chat = await getChatById({ id });

  if (chat?.userId !== session.user.id) {
    return new ChatbotError("forbidden:chat").toResponse();
  }

  const deletedChat = await deleteChatById({ id });

  return Response.json(deletedChat, { status: 200 });
}
