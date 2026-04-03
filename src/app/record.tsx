import { MaterialIcons } from "@expo/vector-icons";
import * as FileSystem from "expo-file-system/legacy";
import { useRouter } from "expo-router";
import React, {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import {
    Alert,
    Animated,
    InteractionManager,
    KeyboardAvoidingView,
    Linking,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { UploadProgressModal } from "@/components/recorder/upload-progress-modal";
import { NOTE_CATEGORIES } from "@/constants/categories";
import { Colors } from "@/constants/theme";
import { useAuth } from "@/contexts/auth-context";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useRecorderSession } from "@/hooks/use-recorder-session";
import {
    createSummaryJob,
    createTranscriptionJob,
} from "@/services/ai/ai-jobs-service";
import {
    appendSavedRecording,
    getSavedRecordingById,
    setRecordingUploadFailed,
    setRecordingUploadProgress,
    setRecordingUploadSuccess,
} from "@/services/recorder/recordings-store";
import {
    cancelUpload,
    uploadNoteFile,
    upsertRemoteNoteMetadata,
} from "@/services/recorder/upload-service";
import type { RecordingSourceType, SavedRecordingMeta } from "@/types/recorder";

const WAVE_BARS = [8, 12, 16, 10, 20, 14, 8, 18, 24, 12, 6, 10, 16, 20, 8];

type PickerAsset = {
  uri: string;
  name?: string;
  mimeType?: string;
  size?: number;
};

type PickerResult = {
  canceled: boolean;
  assets?: PickerAsset[];
};

type DocumentPickerModule = {
  getDocumentAsync: (options: {
    type: string | string[];
    multiple: boolean;
    copyToCacheDirectory: boolean;
  }) => Promise<PickerResult>;
};

type PendingImport = {
  sourceType: RecordingSourceType;
  localFileUri: string;
  originalFileName: string;
  mimeType?: string;
  fileSizeBytes?: number;
};

function createImportId() {
  return `imp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeName(fileName: string) {
  return fileName.replace(/\.[^/.]+$/, "") || "Imported Note";
}

function isAudioAsset(asset: PickerAsset) {
  if (asset.mimeType?.toLowerCase().startsWith("audio/")) return true;
  const name = asset.name?.toLowerCase() ?? "";
  return [".mp3", ".m4a", ".wav", ".aac", ".ogg", ".flac"].some((ext) =>
    name.endsWith(ext)
  );
}

type UploadUiState = {
  visible: boolean;
  progress: number;
  fileName: string;
  sourceType: RecordingSourceType;
  uploadId: string | null;
  noteId: string | null;
};

const INITIAL_UPLOAD_UI: UploadUiState = {
  visible: false,
  progress: 0,
  fileName: "",
  sourceType: "imported_document",
  uploadId: null,
  noteId: null,
};

async function queueInitialAiJob(note: SavedRecordingMeta) {
  if (!note.remotePath) return;

  const payload = {
    noteId: note.id,
    sourceType: note.sourceType,
    remotePath: note.remotePath,
  } as const;

  if (note.sourceType === "recorded" || note.sourceType === "imported_audio") {
    await createTranscriptionJob(payload);
    return;
  }

  if (note.sourceType === "imported_document" || note.sourceType === "manual_text") {
    await createSummaryJob(payload);
  }
}

export default function RecordScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const palette = Colors[colorScheme ?? "light"];
  const isDark = colorScheme === "dark";
  const { user } = useAuth();

  const {
    uiState,
    timerText,
    isBusy,
    completionVisible,
    flightName,
    lastError,
    ensurePermission,
    setFlightName,
    onStart,
    onPause,
    onResume,
    onStop,
    onDiscard,
    onSaveAndGenerate,
  } = useRecorderSession();

  const waveformAnim = useRef(new Animated.Value(0)).current;
  const canceledUploadsRef = useRef(new Set<string>());
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [pendingImport, setPendingImport] = useState<PendingImport | null>(
    null
  );
  const [pendingRecordingSave, setPendingRecordingSave] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [uploadUi, setUploadUi] = useState<UploadUiState>(INITIAL_UPLOAD_UI);
  const [pendingHomeNav, setPendingHomeNav] = useState(false);
  const [manualTextModalVisible, setManualTextModalVisible] = useState(false);
  const [manualText, setManualText] = useState("");
  const [isSubmittingManualText, setIsSubmittingManualText] = useState(false);

  useEffect(() => {
    if (!lastError) return;
    Alert.alert("Recorder", lastError);
  }, [lastError]);

  useEffect(() => {
    const active = uiState === "recording" || uiState === "idle";
    if (!active) {
      waveformAnim.stopAnimation();
      waveformAnim.setValue(0);
      return;
    }

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(waveformAnim, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(waveformAnim, {
          toValue: 0,
          duration: 700,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();

    return () => loop.stop();
  }, [uiState, waveformAnim]);

  const headerSubtitle = useMemo(() => {
    if (uiState === "recording") return "Recording Live";
    if (uiState === "paused") return "Recording Paused";
    if (uiState === "stopped") return "Stopped";
    return "Ready to Record";
  }, [uiState]);

  const subtitleColor =
    uiState === "paused"
      ? "#f59e0b"
      : uiState === "recording" || uiState === "stopped"
        ? palette.error
        : palette.primary;

  const statusText = useMemo(() => {
    if (uiState === "recording") return "Recording in progress";
    if (uiState === "paused") return "Session Paused";
    if (uiState === "stopped") return "Recording Stopped";
    return "Ready to Record";
  }, [uiState]);

  const secondaryDisabled =
    uiState !== "idle" || isImporting || uploadUi.visible;

  const onBack = () => {
    router.replace("/(tabs)");
  };

  const onDiscardAndHome = async () => {
    await onDiscard();
    setPendingHomeNav(true);
  };

  const closeCategoryModal = useCallback(() => {
    setCategoryModalVisible(false);
    setSelectedCategory(null);
    setPendingImport(null);
    setPendingRecordingSave(false);
    setManualText("");
  }, []);

  const DOCUMENT_MIME_TYPES = [
    "application/pdf",
    "text/plain",
    "text/markdown",
    "text/html",
    "text/xml",
    "application/json",
    "text/csv",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/rtf",
  ];

  const pickDocument = useCallback(
    async (kind: "document" | "audio") => {
      if (secondaryDisabled || isImporting) return;

      let pickerModule: DocumentPickerModule | null = null;
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        pickerModule = require("expo-document-picker") as DocumentPickerModule;
      } catch {
        pickerModule = null;
      }

      if (!pickerModule?.getDocumentAsync) {
        Alert.alert(
          "File Picker Unavailable",
          "Install expo-document-picker and rebuild the app to import files."
        );
        return;
      }

      try {
        const result = await pickerModule.getDocumentAsync({
          type: kind === "document" ? DOCUMENT_MIME_TYPES : "audio/*",
          multiple: false,
          copyToCacheDirectory: true,
        });

        if (result.canceled || !result.assets?.length) return;

        let asset = result.assets[0];
        if (kind === "audio" && !isAudioAsset(asset)) {
          const fallback = await pickerModule.getDocumentAsync({
            type: "*/*",
            multiple: false,
            copyToCacheDirectory: true,
          });
          if (fallback.canceled || !fallback.assets?.length) return;
          if (!isAudioAsset(fallback.assets[0])) {
            Alert.alert("Invalid File", "Please select an audio file.");
            return;
          }
          asset = fallback.assets[0];
        }

        setPendingImport({
          sourceType: kind === "document" ? "imported_document" : "imported_audio",
          localFileUri: asset.uri,
          originalFileName: asset.name?.trim() || "Imported Note",
          mimeType: asset.mimeType,
          fileSizeBytes: asset.size,
        });
        setSelectedCategory(null);
        setCategoryModalVisible(true);
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Could not open file picker.";
        Alert.alert("Import Failed", message);
      }
    },
    [isImporting, secondaryDisabled]
  );

  const runUploadFlow = useCallback(
    async (saved: SavedRecordingMeta) => {
      const uploadId = `upl_${saved.id}_${Date.now()}`;
      let lastPersistedProgress = -1;

      setUploadUi({
        visible: true,
        progress: 0,
        fileName: saved.originalFileName ?? saved.name,
        sourceType: saved.sourceType,
        uploadId,
        noteId: saved.id,
      });

      try {
        const { remotePath } = await uploadNoteFile({
          uploadId,
          userId: saved.userId,
          noteId: saved.id,
          fileUri: saved.localFileUri,
          fileName: saved.originalFileName ?? saved.name,
          mimeType: saved.mimeType,
          onProgress: (progress) => {
            const rounded = Math.round(progress);
            setUploadUi((prev) => ({ ...prev, progress: rounded }));
            if (rounded === 100 || rounded - lastPersistedProgress >= 5) {
              lastPersistedProgress = rounded;
              void setRecordingUploadProgress(saved.id, rounded);
            }
          },
        });

        const updatedAt = new Date().toISOString();
        await setRecordingUploadSuccess(saved.id, remotePath);

        const synced: SavedRecordingMeta = {
          ...saved,
          status: "ready_for_ai",
          uploadProgress: 100,
          remotePath,
          uploadError: null,
          updatedAt,
        };

        try {
          await upsertRemoteNoteMetadata(synced);
        } catch (remoteError) {
          console.warn("Remote metadata sync failed:", remoteError);
        }
        void queueInitialAiJob(synced).catch((queueError) => {
          console.warn("Initial AI job enqueue failed:", queueError);
        });

        setUploadUi(INITIAL_UPLOAD_UI);
        router.push(`/summary/${saved.id}`);
      } catch (error) {
        const wasCanceled = canceledUploadsRef.current.has(uploadId);
        if (wasCanceled) {
          canceledUploadsRef.current.delete(uploadId);
        }
        const message = wasCanceled
          ? "Upload canceled."
          : error instanceof Error
            ? error.message
            : "Upload failed.";

        await setRecordingUploadFailed(saved.id, message);
        const failedAt = new Date().toISOString();
        const failed: SavedRecordingMeta = {
          ...saved,
          status: "upload_failed",
          uploadError: message,
          updatedAt: failedAt,
        };

        try {
          await upsertRemoteNoteMetadata(failed);
        } catch (remoteError) {
          console.warn("Remote metadata sync failed:", remoteError);
        }

        setUploadUi(INITIAL_UPLOAD_UI);
        Alert.alert("Upload failed", message, [
          {
            text: "Retry",
            onPress: () => {
              void (async () => {
                const latest = await getSavedRecordingById(saved.id);
                if (!latest) return;
                const retrying: SavedRecordingMeta = {
                  ...latest,
                  status: "uploading",
                  uploadProgress: 0,
                  uploadError: null,
                  updatedAt: new Date().toISOString(),
                };
                await appendSavedRecording(retrying);
                await runUploadFlow(retrying);
              })();
            },
          },
          { text: "OK", style: "cancel" },
        ]);
      }
    },
    [router]
  );

  const onSave = useCallback(() => {
    if (!user?.id) {
      Alert.alert("Sign In Required", "Please sign in to upload flight notes.");
      return;
    }

    setPendingRecordingSave(true);
    setSelectedCategory(null);
    setCategoryModalVisible(true);
  }, [user?.id]);

  const onConfirmRecording = useCallback(async () => {
    if (!selectedCategory || !user?.id) return;

    const saved = await onSaveAndGenerate(user.id, selectedCategory);
    if (!saved) return;
    closeCategoryModal();
    await runUploadFlow(saved);
  }, [closeCategoryModal, onSaveAndGenerate, runUploadFlow, selectedCategory, user?.id]);

  const onConfirmImport = useCallback(async () => {
    if (!pendingImport || !selectedCategory) return;
    if (!user?.id) {
      Alert.alert("Sign In Required", "Please sign in to upload flight notes.");
      return;
    }

    setIsImporting(true);
    try {
      const id = createImportId();
      const now = new Date().toISOString();

      const displayName =
        pendingImport.sourceType === "manual_text" && manualText.trim()
          ? manualText.trim().slice(0, 50).replace(/\n/g, " ")
          : normalizeName(pendingImport.originalFileName);

      const saved: SavedRecordingMeta = {
        id,
        userId: user.id,
        name: displayName || "Manual Note",
        createdAt: now,
        updatedAt: now,
        durationSec: 0,
        localFileUri: pendingImport.localFileUri,
        status: "uploading",
        uploadProgress: 0,
        uploadError: null,
        sourceType: pendingImport.sourceType,
        category: selectedCategory,
        originalFileName: pendingImport.originalFileName,
        mimeType: pendingImport.mimeType,
        fileSizeBytes: pendingImport.fileSizeBytes,
      };

      await appendSavedRecording(saved);
      closeCategoryModal();
      await runUploadFlow(saved);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Could not save imported file.";
      Alert.alert("Import Failed", message);
    } finally {
      setIsImporting(false);
    }
  }, [
    closeCategoryModal,
    manualText,
    pendingImport,
    runUploadFlow,
    selectedCategory,
    user?.id,
  ]);

  const promptMicPermission = useCallback(async () => {
    const permission = await ensurePermission(true);
    if (permission.granted) return;

    if (!permission.available) {
      Alert.alert(
        "Recorder Setup Incomplete",
        "Microphone module is not available. Install expo-av and rebuild the app."
      );
      return;
    }

    if (!permission.canAskAgain) {
      Alert.alert(
        "Microphone Permission Required",
        "Microphone access is blocked. Enable it in app settings.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Try Again", onPress: () => void promptMicPermission() },
          { text: "Open Settings", onPress: () => void Linking.openSettings() },
        ]
      );
      return;
    }

    Alert.alert(
      "Microphone Permission Required",
      "Please allow microphone access to record flight notes.",
      [{ text: "Try Again", onPress: () => void promptMicPermission() }]
    );
  }, [ensurePermission]);

  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => {
      void promptMicPermission().catch(() => {
        Alert.alert(
          "Microphone Permission Required",
          "Please allow microphone access to record flight notes."
        );
      });
    });

    return () => task.cancel();
  }, [promptMicPermission]);

  useEffect(() => {
    if (!pendingHomeNav || completionVisible) return;
    const task = InteractionManager.runAfterInteractions(() => {
      setPendingHomeNav(false);
      router.replace("/(tabs)");
    });
    return () => task.cancel();
  }, [completionVisible, pendingHomeNav, router]);

  const onCancelUpload = useCallback(async () => {
    if (!uploadUi.uploadId || !uploadUi.noteId) return;
    canceledUploadsRef.current.add(uploadUi.uploadId);
    await cancelUpload(uploadUi.uploadId);
    await setRecordingUploadFailed(uploadUi.noteId, "Upload canceled.");
    setUploadUi(INITIAL_UPLOAD_UI);
  }, [uploadUi.noteId, uploadUi.uploadId]);

  const openManualTextModal = useCallback(() => {
    if (secondaryDisabled || isImporting) return;
    setManualText("");
    setManualTextModalVisible(true);
  }, [secondaryDisabled, isImporting]);

  const closeManualTextModal = useCallback(() => {
    setManualTextModalVisible(false);
    setManualText("");
  }, []);

  const onConfirmManualText = useCallback(async () => {
    const trimmed = manualText.trim();
    if (!trimmed) return;

    setIsSubmittingManualText(true);
    try {
      const id = createImportId();
      const fileName = `manual_note_${id}.txt`;
      const localFileUri = `${FileSystem.cacheDirectory}${fileName}`;

      await FileSystem.writeAsStringAsync(localFileUri, trimmed, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      const fileInfo = await FileSystem.getInfoAsync(localFileUri);
      const fileSizeBytes = fileInfo.exists && !fileInfo.isDirectory ? fileInfo.size : trimmed.length;

      setPendingImport({
        sourceType: "manual_text",
        localFileUri,
        originalFileName: fileName,
        mimeType: "text/plain",
        fileSizeBytes,
      });

      setManualTextModalVisible(false);
      setSelectedCategory(null);
      setCategoryModalVisible(true);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Could not save manual note.";
      Alert.alert("Save Failed", message);
    } finally {
      setIsSubmittingManualText(false);
    }
  }, [manualText]);

  return (
    <View style={[styles.screen, { backgroundColor: palette.background }]}>
      <View
        style={[
          styles.container,
          { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 24 },
          (completionVisible || uploadUi.visible) && styles.dimmed,
        ]}
      >
        <View style={styles.header}>
          <Pressable
            onPress={onBack}
            disabled={isBusy || completionVisible || uploadUi.visible}
            style={[
              styles.iconButton,
              isDark ? styles.iconButtonDark : styles.iconButtonLight,
            ]}
          >
            <MaterialIcons
              name="arrow-back-ios-new"
              size={20}
              color={palette.mutedText}
            />
          </Pressable>
          <View style={styles.headerCenter}>
            <Text style={[styles.headerTitle, { color: palette.text }]}>
              New Session
            </Text>
          </View>
          <View style={styles.iconButton} />
        </View>

        <View style={styles.centerArea}>
          <View
            style={[
              styles.waveRow,
              (uiState === "paused" || uiState === "stopped") &&
                styles.waveRowMuted,
            ]}
          >
            {WAVE_BARS.map((bar, idx) => {
              const offset = (idx % 5) * 0.06;
              const scaleY = waveformAnim.interpolate({
                inputRange: [0, 0.5, 1],
                outputRange: [0.48 + offset, 1.3 - offset, 0.48 + offset],
              });

              return (
                <Animated.View
                  key={`wave-${idx}`}
                  style={[
                    styles.waveBar,
                    {
                      height: bar,
                      backgroundColor: palette.primary,
                      opacity:
                        uiState === "paused" || uiState === "stopped"
                          ? 0.35
                          : 0.95,
                      transform:
                        uiState === "paused" || uiState === "stopped"
                          ? [{ scaleY: 1 }]
                          : [{ scaleY }],
                    },
                  ]}
                />
              );
            })}
          </View>

          <Text style={[styles.timerText, { color: palette.text }]}>
            {timerText}
          </Text>
          <Text style={[styles.timerSubText, { color: palette.mutedText }]}>
            {statusText}
          </Text>
        </View>

        <View style={styles.controlsWrap}>
          {uiState === "idle" ? (
            <>
              <Pressable
                onPress={onStart}
                disabled={isBusy}
                style={[
                  styles.mainButton,
                  {
                    borderColor: palette.background,
                    backgroundColor: palette.primary,
                  },
                ]}
              >
                <MaterialIcons name="mic" size={42} color="#fff" />
              </Pressable>
              <Text style={[styles.controlHint, { color: palette.mutedText }]}>
                Tap to start recording
              </Text>
            </>
          ) : null}

          {(uiState === "recording" || uiState === "paused") && (
            <View style={styles.dualControls}>
              <View style={styles.controlItem}>
                <Pressable
                  onPress={onStop}
                  disabled={isBusy}
                  style={[styles.smallButton, styles.stopSoftButton]}
                >
                  <MaterialIcons name="stop" size={30} color={palette.text} />
                </Pressable>
                <Text
                  style={[styles.controlLabel, { color: palette.mutedText }]}
                >
                  Stop
                </Text>
              </View>
              <View style={styles.controlItem}>
                <Pressable
                  onPress={uiState === "recording" ? onPause : onResume}
                  disabled={isBusy}
                  style={[
                    styles.mainButton,
                    {
                      borderColor: palette.background,
                      backgroundColor: palette.primary,
                    },
                  ]}
                >
                  <MaterialIcons
                    name={uiState === "recording" ? "pause" : "play-arrow"}
                    size={uiState === "recording" ? 42 : 50}
                    color="#fff"
                  />
                </Pressable>
                <Text style={[styles.controlLabel, { color: palette.primary }]}>
                  {uiState === "recording" ? "Pause" : "Resume"}
                </Text>
              </View>
            </View>
          )}

          {uiState === "stopped" ? (
            <>
              <View style={[styles.mainButton, styles.stoppedButton]}>
                <MaterialIcons name="stop" size={40} color="#fff" />
              </View>
              <Text style={[styles.controlHint, { color: palette.mutedText }]}>
                Session Ended
              </Text>
            </>
          ) : null}

          <View
            style={[
              styles.secondaryGrid,
              secondaryDisabled && styles.disabledGrid,
            ]}
          >
            <Pressable
              disabled={secondaryDisabled}
              onPress={openManualTextModal}
              style={[
                styles.secondaryCard,
                {
                  backgroundColor: isDark ? palette.card : "#fff",
                  borderColor: palette.border,
                },
              ]}
            >
              <View style={styles.secondaryIcon}>
                <MaterialIcons
                  name="text-snippet"
                  size={20}
                  color={palette.primary}
                />
              </View>
              <Text style={[styles.secondaryTitle, { color: palette.text }]}>
                Manual Input
              </Text>
            </Pressable>
            <Pressable
              disabled={secondaryDisabled}
              onPress={() => void pickDocument("document")}
              style={[
                styles.secondaryCard,
                {
                  backgroundColor: isDark ? palette.card : "#fff",
                  borderColor: palette.border,
                },
              ]}
            >
              <View style={styles.secondaryIcon}>
                <MaterialIcons
                  name="upload-file"
                  size={20}
                  color={palette.primary}
                />
              </View>
              <Text style={[styles.secondaryTitle, { color: palette.text }]}>
                Upload Document
              </Text>
            </Pressable>

            <Pressable
              disabled={secondaryDisabled}
              onPress={() => void pickDocument("audio")}
              style={[
                styles.secondaryCard,
                {
                  backgroundColor: isDark ? palette.card : "#fff",
                  borderColor: palette.border,
                },
              ]}
            >
              <View style={styles.secondaryIcon}>
                <MaterialIcons
                  name="library-music"
                  size={20}
                  color={palette.primary}
                />
              </View>
              <Text style={[styles.secondaryTitle, { color: palette.text }]}>
                Import Audio
              </Text>
            </Pressable>
          </View>
        </View>
      </View>

      <Modal
        animationType="fade"
        transparent
        visible={completionVisible}
        onRequestClose={onDiscardAndHome}
      >
        <View style={styles.modalBackdrop}>
          <View
            style={[
              styles.modalCard,
              { backgroundColor: isDark ? palette.card : "#fff" },
            ]}
          >
            <View style={styles.modalTop}>
              <View style={styles.modalSuccessIcon}>
                <MaterialIcons
                  name="check-circle"
                  size={28}
                  color={palette.success}
                />
              </View>
              <Text style={[styles.modalTitle, { color: palette.text }]}>
                Session Complete
              </Text>
              <Text
                style={[styles.modalSubtitle, { color: palette.mutedText }]}
              >
                Great job! Your audio is ready.
              </Text>
            </View>

            <View style={styles.modalDurationWrap}>
              <Text
                style={[
                  styles.modalDurationLabel,
                  { color: palette.mutedText },
                ]}
              >
                Total Duration
              </Text>
              <Text
                style={[styles.modalDurationValue, { color: palette.text }]}
              >
                {timerText}
              </Text>
            </View>

            <View style={styles.modalInputWrap}>
              <Text style={[styles.modalInputLabel, { color: palette.text }]}>
                Name your flight
              </Text>
              <View
                style={[
                  styles.inputContainer,
                  {
                    borderColor: isDark
                      ? "rgba(255,255,255,0.1)"
                      : palette.border,
                    backgroundColor: isDark
                      ? "rgba(255,255,255,0.05)"
                      : "#f8fafc",
                  },
                ]}
              >
                <MaterialIcons
                  name="edit"
                  size={18}
                  color={palette.mutedText}
                />
                <TextInput
                  style={[styles.input, { color: palette.text }]}
                  value={flightName}
                  onChangeText={setFlightName}
                  placeholder="Flight name"
                  placeholderTextColor={palette.mutedText}
                />
              </View>
            </View>

            <View style={styles.modalActions}>
              <Pressable
                onPress={onSave}
                disabled={isBusy}
                style={[
                  styles.saveButton,
                  { backgroundColor: palette.primary },
                ]}
              >
                <MaterialIcons name="auto-awesome" size={18} color="#fff" />
                <Text style={styles.saveButtonText}>
                  Save & Generate AI Notes
                </Text>
              </Pressable>
              <Pressable
                onPress={onDiscardAndHome}
                disabled={isBusy}
                style={styles.discardButton}
              >
                <Text
                  style={[
                    styles.discardButtonText,
                    { color: palette.mutedText },
                  ]}
                >
                  Discard Recording
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        animationType="fade"
        transparent
        visible={categoryModalVisible}
        onRequestClose={closeCategoryModal}
      >
        <View style={styles.modalBackdrop}>
          <View
            style={[
              styles.modalCard,
              { backgroundColor: isDark ? palette.card : "#fff" },
            ]}
          >
            <View style={styles.modalTop}>
              <View style={styles.modalSuccessIcon}>
                <MaterialIcons
                  name="folder-open"
                  size={24}
                  color={palette.primary}
                />
              </View>
              <Text style={[styles.modalTitle, { color: palette.text }]}>
                Choose Category
              </Text>
              <Text
                style={[styles.modalSubtitle, { color: palette.mutedText }]}
              >
                {pendingRecordingSave
                  ? (flightName.trim() || "Recording")
                  : (pendingImport?.originalFileName ?? "Imported file")}
              </Text>
            </View>

            <View style={styles.categoryList}>
              {NOTE_CATEGORIES.map((category) => {
                const isSelected = selectedCategory === category;
                return (
                  <Pressable
                    key={category}
                    onPress={() => setSelectedCategory(category)}
                    style={[
                      styles.categoryChip,
                      {
                        borderColor: isSelected
                          ? palette.primary
                          : palette.border,
                        backgroundColor: isSelected
                          ? "rgba(91,19,236,0.12)"
                          : isDark
                            ? "rgba(255,255,255,0.05)"
                            : "#f8fafc",
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.categoryChipText,
                        { color: isSelected ? palette.primary : palette.text },
                      ]}
                    >
                      {category}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.modalActions}>
              <Pressable
                onPress={() => void (pendingRecordingSave ? onConfirmRecording() : onConfirmImport())}
                disabled={!selectedCategory || isImporting || isBusy}
                style={[
                  styles.saveButton,
                  {
                    backgroundColor: selectedCategory
                      ? palette.primary
                      : "#64748b",
                    opacity: isImporting ? 0.7 : 1,
                  },
                ]}
              >
                <MaterialIcons name="check" size={18} color="#fff" />
                <Text style={styles.saveButtonText}>
                  {isImporting || isBusy ? "Saving..." : "Save & Continue"}
                </Text>
              </Pressable>
              <Pressable
                onPress={closeCategoryModal}
                disabled={isImporting}
                style={styles.discardButton}
              >
                <Text
                  style={[
                    styles.discardButtonText,
                    { color: palette.mutedText },
                  ]}
                >
                  Cancel
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        animationType="fade"
        transparent
        visible={manualTextModalVisible}
        onRequestClose={closeManualTextModal}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.manualModalFlex}
        >
          <View style={styles.modalBackdrop}>
            <View
              style={[
                styles.modalCard,
                { backgroundColor: isDark ? palette.card : "#fff" },
              ]}
            >
              <View style={styles.modalTop}>
                <View
                  style={[
                    styles.modalSuccessIcon,
                    { backgroundColor: "rgba(91,19,236,0.14)" },
                  ]}
                >
                  <MaterialIcons
                    name="text-snippet"
                    size={24}
                    color={palette.primary}
                  />
                </View>
                <Text style={[styles.modalTitle, { color: palette.text }]}>
                  Manual Input
                </Text>
                <Text
                  style={[styles.modalSubtitle, { color: palette.mutedText }]}
                >
                  Type or paste your notes for summarization
                </Text>
              </View>

              <ScrollView
                style={styles.manualTextScrollWrap}
                keyboardShouldPersistTaps="handled"
              >
                <TextInput
                  style={[
                    styles.manualTextInput,
                    {
                      color: palette.text,
                      borderColor: isDark
                        ? "rgba(255,255,255,0.1)"
                        : palette.border,
                      backgroundColor: isDark
                        ? "rgba(255,255,255,0.05)"
                        : "#f8fafc",
                    },
                  ]}
                  value={manualText}
                  onChangeText={setManualText}
                  placeholder="Enter your flight notes here..."
                  placeholderTextColor={palette.mutedText}
                  multiline
                  textAlignVertical="top"
                  autoFocus
                />
              </ScrollView>

              <View style={styles.modalActions}>
                <Pressable
                  onPress={() => void onConfirmManualText()}
                  disabled={!manualText.trim() || isSubmittingManualText}
                  style={[
                    styles.saveButton,
                    {
                      backgroundColor: manualText.trim()
                        ? palette.primary
                        : "#64748b",
                      opacity: isSubmittingManualText ? 0.7 : 1,
                    },
                  ]}
                >
                  <MaterialIcons name="arrow-forward" size={18} color="#fff" />
                  <Text style={styles.saveButtonText}>
                    {isSubmittingManualText ? "Saving..." : "Continue"}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={closeManualTextModal}
                  disabled={isSubmittingManualText}
                  style={styles.discardButton}
                >
                  <Text
                    style={[
                      styles.discardButtonText,
                      { color: palette.mutedText },
                    ]}
                  >
                    Cancel
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <UploadProgressModal
        visible={uploadUi.visible}
        fileName={uploadUi.fileName}
        sourceType={uploadUi.sourceType}
        progress={uploadUi.progress}
        onCancel={() => void onCancelUpload()}
        isCancelable={uploadUi.visible}
      />

      <View pointerEvents="none" style={styles.bgBottomGlow} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  container: {
    flex: 1,
    paddingHorizontal: 22,
    justifyContent: "space-between",
  },
  dimmed: { opacity: 0.5 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  iconButtonLight: { backgroundColor: "rgba(15,23,42,0.04)" },
  iconButtonDark: { backgroundColor: "rgba(255,255,255,0.08)" },
  headerCenter: { alignItems: "center" },
  headerTitle: { fontSize: 30, lineHeight: 36, fontWeight: "700" },
  headerSubtitle: {
    marginTop: 3,
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1.1,
  },
  centerArea: { alignItems: "center", justifyContent: "center", flex: 1 },
  waveRow: {
    height: 120,
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    marginBottom: 20,
  },
  waveRowMuted: { opacity: 0.6 },
  waveBar: { width: 5, borderRadius: 999 },
  timerText: {
    fontSize: 62,
    lineHeight: 68,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },
  timerSubText: { marginTop: 10, fontSize: 14, fontWeight: "500" },
  controlsWrap: { alignItems: "center", gap: 16, marginBottom: 8 },
  mainButton: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 4,
    shadowColor: "#5b13ec",
    shadowOpacity: 0.35,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  stoppedButton: { backgroundColor: "#ef4444", shadowColor: "#ef4444" },
  controlHint: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  dualControls: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "center",
    gap: 38,
  },
  controlItem: { alignItems: "center", gap: 7 },
  smallButton: {
    width: 66,
    height: 66,
    borderRadius: 33,
    alignItems: "center",
    justifyContent: "center",
  },
  stopSoftButton: { backgroundColor: "rgba(148,163,184,0.26)" },
  controlLabel: { fontSize: 12, fontWeight: "600" },
  secondaryGrid: {
    width: "100%",
    flexDirection: "row",
    gap: 10,
  },
  disabledGrid: { opacity: 0.35 },
  secondaryCard: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
  },
  secondaryIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
    backgroundColor: "rgba(91,19,236,0.15)",
  },
  secondaryTitle: { fontSize: 14, fontWeight: "700", textAlign: "center" },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    paddingHorizontal: 18,
  },
  modalCard: {
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 12,
  },
  modalTop: { alignItems: "center" },
  modalSuccessIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
    backgroundColor: "rgba(34,197,94,0.14)",
  },
  modalTitle: { fontSize: 22, fontWeight: "700" },
  modalSubtitle: { marginTop: 4, fontSize: 14 },
  modalDurationWrap: { alignItems: "center", marginTop: 18, marginBottom: 10 },
  modalDurationLabel: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 4,
  },
  modalDurationValue: {
    fontSize: 34,
    lineHeight: 38,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },
  modalInputWrap: { marginBottom: 14 },
  modalInputLabel: { fontSize: 14, fontWeight: "600", marginBottom: 8 },
  categoryList: {
    marginTop: 18,
    marginBottom: 14,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  categoryChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  categoryChipText: { fontSize: 13, fontWeight: "600" },
  inputContainer: {
    height: 46,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  input: { flex: 1, fontSize: 14, fontWeight: "500" },
  modalActions: { gap: 8 },
  saveButton: {
    height: 48,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },
  saveButtonText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  discardButton: { alignItems: "center", justifyContent: "center", height: 38 },
  discardButtonText: { fontSize: 14, fontWeight: "600" },
  homeBar: {
    position: "absolute",
    bottom: 6,
    left: "50%",
    transform: [{ translateX: -64 }],
    width: 128,
    height: 4,
    borderRadius: 999,
  },
  bgBottomGlow: {
    position: "absolute",
    right: -90,
    bottom: -70,
    width: 220,
    height: 220,
    borderRadius: 999,
    backgroundColor: "rgba(91,19,236,0.10)",
  },
  manualModalFlex: { flex: 1 },
  manualTextScrollWrap: {
    marginTop: 14,
    maxHeight: 200,
  },
  manualTextInput: {
    minHeight: 140,
    maxHeight: 200,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    fontWeight: "500",
    lineHeight: 20,
  },
});
