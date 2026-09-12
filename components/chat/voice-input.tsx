"use client";

import { Loader2, Mic, Square } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useSWRConfig } from "swr";
import { Button } from "@/components/ui/button";
import { ENTITLEMENT_URL } from "@/hooks/use-entitlement";

const MAX_RECORDING_MS = 60_000;

export function VoiceInput({
  disabled,
  onTranscript,
}: {
  disabled: boolean;
  onTranscript: (text: string) => void;
}) {
  const [phase, setPhase] = useState<
    "idle" | "permission" | "recording" | "transcribing"
  >("idle");
  const recorderRef = useRef<MediaRecorder | null>(null);
  const mediaRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const requestRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);
  const busyRef = useRef(false);
  const { mutate } = useSWRConfig();

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      clearTimeout(timerRef.current);
      requestRef.current?.abort();
      const recorder = recorderRef.current;
      if (recorder) {
        recorder.onstop = null;
        if (recorder.state !== "inactive") {
          recorder.stop();
        }
      }
      for (const track of mediaRef.current?.getTracks() ?? []) {
        track.stop();
      }
    };
  }, []);

  const startRecording = useCallback(async () => {
    if (busyRef.current || disabled) {
      return;
    }
    if (
      !navigator.mediaDevices?.getUserMedia ||
      typeof MediaRecorder === "undefined"
    ) {
      toast.error("Voice input is not supported in this browser.");
      return;
    }
    busyRef.current = true;
    setPhase("permission");
    try {
      const media = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!mountedRef.current) {
        for (const track of media.getTracks()) {
          track.stop();
        }
        return;
      }
      mediaRef.current = media;
      const preferred = [
        "audio/webm;codecs=opus",
        "audio/mp4",
        "audio/ogg;codecs=opus",
      ].find((type) => MediaRecorder.isTypeSupported(type));
      const recorder = new MediaRecorder(
        media,
        preferred ? { mimeType: preferred } : undefined
      );
      recorderRef.current = recorder;
      const chunks: Blob[] = [];
      const started = performance.now();
      recorder.ondataavailable = (event) => {
        if (event.data.size) {
          chunks.push(event.data);
        }
      };
      recorder.onstop = async () => {
        clearTimeout(timerRef.current);
        for (const track of media.getTracks()) {
          track.stop();
        }
        if (!mountedRef.current) {
          return;
        }
        setPhase("transcribing");
        const controller = new AbortController();
        requestRef.current = controller;
        const type = recorder.mimeType || "audio/webm";
        const extension = type.includes("mp4")
          ? "m4a"
          : type.includes("ogg")
            ? "ogg"
            : "webm";
        const form = new FormData();
        form.set("file", new Blob(chunks, { type }), `recording.${extension}`);
        form.set(
          "durationSeconds",
          String(Math.min(60, (performance.now() - started) / 1000))
        );
        try {
          const response = await fetch(
            `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/api/transcribe`,
            { body: form, method: "POST", signal: controller.signal }
          );
          const result = await response.json();
          if (!response.ok) {
            throw new Error(
              result.message || "Could not transcribe the recording."
            );
          }
          if (mountedRef.current) {
            onTranscript(result.text);
          }
        } catch (error) {
          if (!controller.signal.aborted) {
            toast.error(
              error instanceof Error
                ? error.message
                : "Could not transcribe the recording."
            );
          }
        } finally {
          mutate(ENTITLEMENT_URL);
          busyRef.current = false;
          if (mountedRef.current) {
            setPhase("idle");
          }
        }
      };
      recorder.start();
      setPhase("recording");
      timerRef.current = setTimeout(() => {
        if (recorder.state !== "inactive") {
          recorder.stop();
        }
      }, MAX_RECORDING_MS);
    } catch {
      for (const track of mediaRef.current?.getTracks() ?? []) {
        track.stop();
      }
      busyRef.current = false;
      if (mountedRef.current) {
        setPhase("idle");
        toast.error(
          "Microphone access was unavailable. Allow microphone access to record."
        );
      }
    }
  }, [disabled, mutate, onTranscript]);

  const recording = phase === "recording";
  const handleRecordClick = useCallback(() => {
    if (recording) {
      recorderRef.current?.stop();
    } else {
      startRecording();
    }
  }, [recording, startRecording]);
  const waiting = phase === "permission" || phase === "transcribing";
  return (
    <Button
      aria-label={
        recording
          ? "Stop recording"
          : waiting
            ? "Transcribing voice"
            : "Record voice message"
      }
      className="h-7 gap-1.5 rounded-lg px-2"
      data-testid="voice-button"
      disabled={waiting || (disabled && !recording)}
      onClick={handleRecordClick}
      title="Record up to 60 seconds"
      type="button"
      variant={recording ? "destructive" : "ghost"}
    >
      {waiting ? (
        <Loader2 className="size-4 animate-spin" />
      ) : recording ? (
        <Square className="size-3" />
      ) : (
        <Mic className="size-4" />
      )}
      {recording && (
        <span className="text-xs" role="status">
          Recording · Stop
        </span>
      )}
    </Button>
  );
}
