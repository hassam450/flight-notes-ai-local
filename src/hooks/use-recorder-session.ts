import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  cleanupRecording,
  pauseRecording,
  requestMicPermission,
  resumeRecording,
  startRecording,
  stopRecording,
  type MicPermissionResult,
  type RecorderSession,
} from "@/services/recorder/audio-recorder";
import { appendSavedRecording } from "@/services/recorder/recordings-store";
import type { RecorderUiState, RecordingDraft, SavedRecordingMeta } from "@/types/recorder";

function formatDuration(ms: number) {
  const totalSec = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSec / 60)
    .toString()
    .padStart(2, "0");
  const seconds = (totalSec % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function defaultFlightName(dateIso: string) {
  const date = new Date(dateIso);
  const fmt = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });

  return `Flight - ${fmt.format(date)}`;
}

function fileNameFromUri(uri: string) {
  const parts = uri.split("/");
  const last = parts[parts.length - 1];
  return last || "recording.m4a";
}

export function useRecorderSession() {
  const [uiState, setUiState] = useState<RecorderUiState>("idle");
  const [elapsedMs, setElapsedMs] = useState(0);
  const [isBusy, setIsBusy] = useState(false);
  const [completionVisible, setCompletionVisible] = useState(false);
  const [flightName, setFlightName] = useState("");
  const [lastError, setLastError] = useState<string | null>(null);
  const [hasMicPermission, setHasMicPermission] = useState(false);

  const activeSessionRef = useRef<RecorderSession | null>(null);
  const timerStartRef = useRef<number | null>(null);
  const draftRef = useRef<RecordingDraft | null>(null);

  useEffect(() => {
    if (uiState !== "recording") return;

    const timer = setInterval(() => {
      if (timerStartRef.current == null) return;
      setElapsedMs(Math.max(0, Date.now() - timerStartRef.current));
    }, 200);

    return () => clearInterval(timer);
  }, [uiState]);

  const reset = useCallback(() => {
    activeSessionRef.current = null;
    timerStartRef.current = null;
    draftRef.current = null;
    setFlightName("");
    setElapsedMs(0);
    setCompletionVisible(false);
    setUiState("idle");
  }, []);

  const ensurePermission = useCallback(async (prompt = true): Promise<MicPermissionResult> => {
    const permission = await requestMicPermission(prompt);
    setHasMicPermission(permission.granted);
    return permission;
  }, []);

  const onStart = useCallback(async () => {
    if (isBusy || uiState !== "idle") return;

    setIsBusy(true);
    setLastError(null);

    try {
      if (!hasMicPermission) {
        const permission = await ensurePermission(true);
        if (!permission.granted) {
          throw new Error("Microphone permission is required.");
        }
      }

      const session = await startRecording();
      activeSessionRef.current = session;
      timerStartRef.current = Date.now();
      setElapsedMs(0);
      setUiState("recording");
    } catch (error) {
      setLastError(error instanceof Error ? error.message : "Could not start recording.");
      reset();
    } finally {
      setIsBusy(false);
    }
  }, [ensurePermission, hasMicPermission, isBusy, reset, uiState]);

  const onPause = useCallback(async () => {
    if (isBusy || uiState !== "recording") return;
    const session = activeSessionRef.current;
    if (!session) return;

    setIsBusy(true);
    setLastError(null);

    try {
      await pauseRecording(session);
      if (timerStartRef.current != null) {
        setElapsedMs(Math.max(0, Date.now() - timerStartRef.current));
      }
      timerStartRef.current = null;
      setUiState("paused");
    } catch (error) {
      setLastError(error instanceof Error ? error.message : "Could not pause recording.");
    } finally {
      setIsBusy(false);
    }
  }, [isBusy, uiState]);

  const onResume = useCallback(async () => {
    if (isBusy || uiState !== "paused") return;
    const session = activeSessionRef.current;
    if (!session) return;

    setIsBusy(true);
    setLastError(null);

    try {
      await resumeRecording(session);
      timerStartRef.current = Date.now() - elapsedMs;
      setUiState("recording");
    } catch (error) {
      setLastError(error instanceof Error ? error.message : "Could not resume recording.");
    } finally {
      setIsBusy(false);
    }
  }, [elapsedMs, isBusy, uiState]);

  const onStop = useCallback(async () => {
    if (isBusy || (uiState !== "recording" && uiState !== "paused")) return;

    const session = activeSessionRef.current;
    if (!session) return;

    setIsBusy(true);
    setLastError(null);

    try {
      const finalElapsed =
        uiState === "recording" && timerStartRef.current != null
          ? Math.max(0, Date.now() - timerStartRef.current)
          : elapsedMs;

      const draft = await stopRecording(session, finalElapsed);
      draftRef.current = draft;
      setElapsedMs(draft.durationMs);
      setFlightName(defaultFlightName(draft.startedAt));
      setUiState("stopped");
      setCompletionVisible(true);
      timerStartRef.current = null;
      activeSessionRef.current = null;
    } catch (error) {
      setLastError(error instanceof Error ? error.message : "Could not stop recording.");
      reset();
    } finally {
      setIsBusy(false);
    }
  }, [elapsedMs, isBusy, reset, uiState]);

  const onDiscard = useCallback(async () => {
    const draft = draftRef.current;
    if (draft?.fileUri) {
      await cleanupRecording(draft.fileUri);
    }

    reset();
  }, [reset]);

  const onSaveAndGenerate = useCallback(async (userId: string, category: string): Promise<SavedRecordingMeta | null> => {
    const draft = draftRef.current;
    if (!draft || !userId) return null;

    setIsBusy(true);
    setLastError(null);

    try {
      const now = new Date().toISOString();
      const flight = flightName.trim() || defaultFlightName(draft.startedAt);
      const saved: SavedRecordingMeta = {
        id: draft.id,
        userId,
        name: flight,
        createdAt: draft.startedAt,
        updatedAt: now,
        durationSec: Math.floor(draft.durationMs / 1000),
        localFileUri: draft.fileUri,
        status: "uploading",
        uploadProgress: 0,
        uploadError: null,
        sourceType: "recorded",
        category,
        originalFileName: fileNameFromUri(draft.fileUri),
        mimeType: "audio/mp4",
      };

      await appendSavedRecording(saved);
      reset();
      return saved;
    } catch (error) {
      setLastError(error instanceof Error ? error.message : "Could not save recording.");
      return null;
    } finally {
      setIsBusy(false);
    }
  }, [flightName, reset]);

  const timerText = useMemo(() => formatDuration(elapsedMs), [elapsedMs]);

  return {
    uiState,
    elapsedMs,
    timerText,
    isBusy,
    completionVisible,
    flightName,
    lastError,
    hasMicPermission,
    ensurePermission,
    setFlightName,
    onStart,
    onPause,
    onResume,
    onStop,
    onDiscard,
    onSaveAndGenerate,
  };
}
