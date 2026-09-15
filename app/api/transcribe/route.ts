import { transcribe } from "ai";
import { auth } from "@/app/(auth)/auth";
import { withAIKeyFailover } from "@/lib/ai/key-pool";
import { useMockAI } from "@/lib/constants";
import { insertUsageEvent } from "@/lib/db/usage-queries";
import { getEntitlement } from "@/lib/entitlements";
import { ChatbotError } from "@/lib/errors";
import { costMicros } from "@/lib/metering";

const MAX_FILE_BYTES = 10 * 1024 * 1024;
/** The composer's mic button is specced to record up to 60 seconds. */
const MAX_RECORDING_SECONDS = 60;
async function transcribeWithGroq(file: Blob, signal: AbortSignal) {
  const audio = new Uint8Array(await file.arrayBuffer());
  return withAIKeyFailover(
    (selection) => {
      if (selection.provider !== "groq") {
        throw new Error("Transcription requires Groq.");
      }
      return transcribe({
        abortSignal: signal,
        audio,
        maxRetries: 0,
        model: selection.client.transcription("whisper-large-v3-turbo"),
        providerOptions: { groq: { responseFormat: "verbose_json" } },
      });
    },
    { allowGemini: false }
  );
}

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return new ChatbotError("unauthorized:auth").toResponse();
  }

  const entitlement = await getEntitlement(session.user.id);

  if (!entitlement.canSend) {
    return new ChatbotError("forbidden:plan").toResponse();
  }

  let formData: FormData;

  try {
    formData = await request.formData();
  } catch {
    return new ChatbotError("bad_request:api").toResponse();
  }

  const file = formData.get("file");

  if (!(file instanceof Blob) || file.size === 0) {
    return new ChatbotError("bad_request:api").toResponse();
  }

  if (file.size > MAX_FILE_BYTES) {
    return Response.json(
      {
        message:
          "That recording is too large. Please record a shorter message.",
      },
      { status: 400 }
    );
  }

  const reported = Number(formData.get("durationSeconds"));
  if (
    !Number.isFinite(reported) ||
    reported <= 0 ||
    reported > MAX_RECORDING_SECONDS
  ) {
    return Response.json(
      { message: "Record between 1 and 60 seconds of audio." },
      { status: 400 }
    );
  }
  if (!file.type.startsWith("audio/") && file.type !== "video/webm") {
    return Response.json(
      { message: "Upload an audio recording." },
      { status: 400 }
    );
  }

  try {
    const result = useMockAI
      ? {
          durationInSeconds: reported,
          text: "This is a mock transcription for tests.",
        }
      : await transcribeWithGroq(file, request.signal);
    const audioSeconds = Math.ceil(
      result.durationInSeconds ?? Math.max(reported, 60)
    );
    const { text } = result;
    await insertUsageEvent({
      audioSeconds,
      costMicros: costMicros({ audioSeconds, model: "chat" }),
      countsTowardLimit: true,
      kind: "transcription",
      planId: entitlement.planId,
      userId: session.user.id,
    });

    if (audioSeconds > MAX_RECORDING_SECONDS + 1) {
      return Response.json(
        {
          message:
            "The recording exceeds 60 seconds. Please record a shorter message.",
        },
        { status: 400 }
      );
    }
    return Response.json({ text });
  } catch (error) {
    console.error("transcription failed", error);

    return Response.json(
      { message: "Able couldn't transcribe that. Please try again." },
      { status: 500 }
    );
  }
}
