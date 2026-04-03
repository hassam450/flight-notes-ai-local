import * as FileSystem from "expo-file-system/legacy";

import type { RecordingDraft } from "@/types/recorder";

type ExpoAudioModule = {
  getPermissionsAsync: () => Promise<{
    status: string;
    granted: boolean;
    canAskAgain: boolean;
  }>;
  requestPermissionsAsync: () => Promise<{
    status: string;
    granted: boolean;
    canAskAgain: boolean;
  }>;
  setAudioModeAsync: (mode: {
    allowsRecordingIOS: boolean;
    playsInSilentModeIOS: boolean;
  }) => Promise<void>;
  Recording: {
    new (): {
      prepareToRecordAsync: (options: unknown) => Promise<void>;
      startAsync: () => Promise<void>;
      pauseAsync: () => Promise<void>;
      stopAndUnloadAsync: () => Promise<void>;
      getURI: () => string | null;
      getStatusAsync: () => Promise<{ durationMillis?: number }>;
    };
  };
  RecordingOptionsPresets: {
    HIGH_QUALITY: unknown;
  };
};

export type RecorderSession = {
  id: string;
  startedAtMs: number;
  mode: "native" | "mock";
  nativeRecording?: {
    pauseAsync: () => Promise<void>;
    stopAndUnloadAsync: () => Promise<void>;
    getURI: () => string | null;
    getStatusAsync: () => Promise<{ durationMillis?: number }>;
    startAsync: () => Promise<void>;
  };
};

let expoAudio: ExpoAudioModule | null = null;

try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const maybeExpoAv = require("expo-av") as { Audio?: ExpoAudioModule };
  expoAudio = maybeExpoAv.Audio ?? null;
} catch {
  expoAudio = null;
}

function createSessionId() {
  return `rec_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function durationFrom(session: RecorderSession, elapsedMs: number) {
  if (elapsedMs > 0) return elapsedMs;
  return Math.max(0, Date.now() - session.startedAtMs);
}

export type MicPermissionResult = {
  granted: boolean;
  canAskAgain: boolean;
  status: string;
  available: boolean;
};

export async function requestMicPermission(prompt = true): Promise<MicPermissionResult> {
  if (!expoAudio) {
    return {
      granted: false,
      canAskAgain: false,
      status: "unavailable",
      available: false,
    };
  }

  const current = await expoAudio.getPermissionsAsync();
  if (current.granted) {
    return { ...current, available: true };
  }

  if (!prompt) {
    return { ...current, available: true };
  }

  const requested = await expoAudio.requestPermissionsAsync();
  return { ...requested, available: true };
}

export async function startRecording(): Promise<RecorderSession> {
  const session: RecorderSession = {
    id: createSessionId(),
    startedAtMs: Date.now(),
    mode: expoAudio ? "native" : "mock",
  };

  if (!expoAudio) {
    return session;
  }

  await expoAudio.setAudioModeAsync({
    allowsRecordingIOS: true,
    playsInSilentModeIOS: true,
  });

  const recording = new expoAudio.Recording();
  await recording.prepareToRecordAsync(expoAudio.RecordingOptionsPresets.HIGH_QUALITY);
  await recording.startAsync();

  return {
    ...session,
    nativeRecording: recording,
  };
}

export async function pauseRecording(session: RecorderSession) {
  if (session.mode === "native" && session.nativeRecording) {
    await session.nativeRecording.pauseAsync();
  }
}

export async function resumeRecording(session: RecorderSession) {
  if (session.mode === "native" && session.nativeRecording) {
    await session.nativeRecording.startAsync();
  }
}

export async function stopRecording(
  session: RecorderSession,
  elapsedMs: number,
): Promise<RecordingDraft> {
  const durationMs = durationFrom(session, elapsedMs);

  if (session.mode === "native" && session.nativeRecording) {
    await session.nativeRecording.stopAndUnloadAsync();
    const status = await session.nativeRecording.getStatusAsync();
    const uri = session.nativeRecording.getURI();

    if (!uri) {
      throw new Error("Recording did not produce a file.");
    }

    return {
      id: session.id,
      startedAt: new Date(session.startedAtMs).toISOString(),
      durationMs: status.durationMillis ?? durationMs,
      fileUri: uri,
    };
  }

  const cacheDirectory = FileSystem.cacheDirectory;
  if (!cacheDirectory) {
    throw new Error("Cache directory unavailable.");
  }

  const fileUri = `${cacheDirectory}${session.id}.m4a`;
  await FileSystem.writeAsStringAsync(fileUri, "", {
    encoding: "utf8",
  });

  return {
    id: session.id,
    startedAt: new Date(session.startedAtMs).toISOString(),
    durationMs,
    fileUri,
  };
}

export async function cleanupRecording(fileUri: string) {
  try {
    const info = await FileSystem.getInfoAsync(fileUri);
    if (info.exists) {
      await FileSystem.deleteAsync(fileUri, { idempotent: true });
    }
  } catch {
    // Best effort cleanup for local recording files.
  }
}
