import { MaterialIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    LayoutChangeEvent,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import {
    createFlashcardsJob,
    createSummaryJob,
    createTranscriptionJob,
    getLatestFlashcardsJob,
    getLatestSummaryJob,
    getLatestTranscriptionJob,
    getNoteFlashcardsState,
    getNoteSummaryState,
    getNoteTranscriptionState,
    type AiJobRow,
    type NoteFlashcardsState,
    type NoteSummaryState,
    type NoteTranscriptionState,
} from "@/services/ai/ai-jobs-service";

const POLL_MS = 2500;

type ActiveTab = "transcription" | "summary";

function isActiveStatus(status?: string | null) {
  return status === "queued" || status === "processing";
}

function parseTranscriptFromResult(result: Record<string, unknown> | null) {
  const value = result?.transcript;
  return typeof value === "string" ? value : null;
}

function parseSummaryFromResult(result: Record<string, unknown> | null) {
  const value = result?.summary;
  if (!value || typeof value !== "object") return null;

  const obj = value as Record<string, unknown>;
  if (typeof obj.overview !== "string") return null;

  return {
    overview: obj.overview,
    keyPoints: Array.isArray(obj.keyPoints)
      ? obj.keyPoints.filter((item): item is string => typeof item === "string")
      : [],
    actionItems: Array.isArray(obj.actionItems)
      ? obj.actionItems.filter((item): item is string => typeof item === "string")
      : [],
    studyQuestions: Array.isArray(obj.studyQuestions)
      ? obj.studyQuestions.filter((item): item is string => typeof item === "string")
      : [],
  };
}

function parseFlashcardsFromResult(result: Record<string, unknown> | null) {
  const raw = result?.flashcards;
  if (!Array.isArray(raw)) return [];

  return raw
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const row = item as Record<string, unknown>;
      const question = typeof row.question === "string" ? row.question : null;
      const answer = typeof row.answer === "string" ? row.answer : null;
      if (!question || !answer) return null;
      return { question, answer };
    })
    .filter((item): item is { question: string; answer: string } => !!item);
}

function formatStatus(status: string) {
  if (status === "queued") return "Queued";
  if (status === "processing") return "Processing";
  if (status === "completed") return "Completed";
  if (status === "failed") return "Failed";
  return status;
}

function transcriptParagraphs(transcript: string | null) {
  if (!transcript) return [];
  return transcript
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
}

export default function SummaryScreen() {
  const colorScheme = useColorScheme();
  const palette = Colors[colorScheme ?? "light"];
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id?: string }>();

  const [loading, setLoading] = useState(true);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const [retrying, setRetrying] = useState(false);
  const [generatingFlashcards, setGeneratingFlashcards] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const [transcriptionNote, setTranscriptionNote] = useState<NoteTranscriptionState | null>(null);
  const [transcriptionJob, setTranscriptionJob] = useState<AiJobRow | null>(null);
  const [summaryNote, setSummaryNote] = useState<NoteSummaryState | null>(null);
  const [summaryJob, setSummaryJob] = useState<AiJobRow | null>(null);
  const [flashcardsNote, setFlashcardsNote] = useState<NoteFlashcardsState | null>(null);
  const [flashcardsJob, setFlashcardsJob] = useState<AiJobRow | null>(null);
  const [segmentWidth, setSegmentWidth] = useState(0);

  const sourceType = summaryNote?.sourceType ?? transcriptionNote?.sourceType ?? flashcardsNote?.sourceType;
  const isDocument = sourceType === "imported_document" || sourceType === "manual_text";
  const noteName = summaryNote?.name ?? transcriptionNote?.name ?? flashcardsNote?.name ?? "Untitled Note";
  const noteCategory = summaryNote?.category ?? transcriptionNote?.category ?? flashcardsNote?.category ?? "General";

  const [activeTab, setActiveTab] = useState<ActiveTab>("transcription");

  useEffect(() => {
    if (isDocument) setActiveTab("summary");
  }, [isDocument]);

  const refresh = useCallback(async () => {
    if (!id?.trim()) {
      setRefreshError("Missing recording id.");
      setLoading(false);
      return;
    }

    try {
      const [
        nextTranscriptionNote,
        nextTranscriptionJob,
        nextSummaryNote,
        nextSummaryJob,
        nextFlashcardsNote,
        nextFlashcardsJob,
      ] = await Promise.all([
        getNoteTranscriptionState(id),
        getLatestTranscriptionJob(id),
        getNoteSummaryState(id),
        getLatestSummaryJob(id),
        getNoteFlashcardsState(id),
        getLatestFlashcardsJob(id),
      ]);

      setTranscriptionNote(nextTranscriptionNote);
      setTranscriptionJob(nextTranscriptionJob);
      setSummaryNote(nextSummaryNote);
      setSummaryJob(nextSummaryJob);
      setFlashcardsNote(nextFlashcardsNote);
      setFlashcardsJob(nextFlashcardsJob);
      setRefreshError(null);
    } catch (error) {
      setRefreshError(error instanceof Error ? error.message : "Could not refresh AI state.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const transcriptText = useMemo(() => {
    return (
      transcriptionNote?.transcriptText ||
      parseTranscriptFromResult(transcriptionJob?.result_payload ?? null)
    );
  }, [transcriptionJob?.result_payload, transcriptionNote?.transcriptText]);

  const summary = useMemo(() => {
    return summaryNote?.summary || parseSummaryFromResult(summaryJob?.result_payload ?? null);
  }, [summaryJob?.result_payload, summaryNote?.summary]);

  const flashcards = useMemo(() => {
    if (flashcardsNote?.flashcards?.length) return flashcardsNote.flashcards;
    return parseFlashcardsFromResult(flashcardsJob?.result_payload ?? null);
  }, [flashcardsJob?.result_payload, flashcardsNote?.flashcards]);

  const transcriptionPending =
    !isDocument && !transcriptText && (!transcriptionJob || isActiveStatus(transcriptionJob.status));
  const summaryPending = !summary && (!summaryJob || isActiveStatus(summaryJob.status));
  const flashcardsRequested = !!flashcardsJob || flashcards.length > 0;
  const flashcardsPending =
    flashcardsRequested && flashcards.length === 0 && (!flashcardsJob || isActiveStatus(flashcardsJob.status));

  const shouldPoll = transcriptionPending || summaryPending || flashcardsPending;

  useEffect(() => {
    if (!shouldPoll) return;
    const timer = setInterval(() => {
      void refresh();
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [refresh, shouldPoll]);

  const statusForTab = useMemo(() => {
    if (activeTab === "transcription") {
      if (transcriptText) return "completed";
      return transcriptionJob?.status ?? "queued";
    }

    if (summary) return "completed";
    return summaryJob?.status ?? "queued";
  }, [activeTab, summary, summaryJob?.status, transcriptText, transcriptionJob?.status]);

  const errorForTab = useMemo(() => {
    if (activeTab === "transcription") {
      return transcriptionNote?.transcriptionError || transcriptionJob?.error_message || refreshError;
    }
    return summaryNote?.summaryError || summaryJob?.error_message || refreshError;
  }, [
    activeTab,
    refreshError,
    summaryJob?.error_message,
    summaryNote?.summaryError,
    transcriptionJob?.error_message,
    transcriptionNote?.transcriptionError,
  ]);

  const noteRemotePath = summaryNote?.remotePath ?? transcriptionNote?.remotePath ?? flashcardsNote?.remotePath;
  const canRetry = !!id && !!sourceType && !!noteRemotePath && (statusForTab === "failed" || !!errorForTab);
  const segmentInnerWidth = Math.max(segmentWidth - 10, 0);
  const segmentIndicatorWidth = segmentInnerWidth > 0 ? segmentInnerWidth / 2 : 0;
  const footerPaddingBottom = insets.bottom + 30;
  const scrollBottomPadding = activeTab === "summary" ? 168 + footerPaddingBottom : 36;
  const hasFlashcards = flashcards.length > 0;
  const canOpenFlashcards = !!id && (hasFlashcards || isActiveStatus(flashcardsJob?.status));
  const flashcardsJobAgeMs = flashcardsJob
    ? Math.max(0, Date.now() - new Date(flashcardsJob.created_at).getTime())
    : 0;
  const staleQueuedFlashcardsJob =
    flashcardsJob?.status === "queued" && flashcardsJobAgeMs > 20_000;

  const onSegmentLayout = useCallback((event: LayoutChangeEvent) => {
    setSegmentWidth(event.nativeEvent.layout.width);
  }, []);

  const onRetry = useCallback(async () => {
    if (!id?.trim() || !sourceType || !noteRemotePath) return;
    setRetrying(true);
    try {
      if (activeTab === "summary") {
        await createSummaryJob({
          noteId: id,
          sourceType,
          remotePath: noteRemotePath,
        });
      } else {
        await createTranscriptionJob({
          noteId: id,
          sourceType,
          remotePath: noteRemotePath,
        });
      }
      await refresh();
    } catch (error) {
      setRefreshError(error instanceof Error ? error.message : "Could not retry AI task.");
    } finally {
      setRetrying(false);
    }
  }, [activeTab, id, noteRemotePath, refresh, sourceType]);

  const onGenerateFlashcards = useCallback(async () => {
    if (!id?.trim() || !sourceType || !noteRemotePath || generatingFlashcards) return;

    if (flashcards.length > 0) {
      router.push(`/flashcards/${id}`);
      return;
    }

    if (isActiveStatus(flashcardsJob?.status) && !staleQueuedFlashcardsJob) {
      router.push(`/flashcards/${id}`);
      return;
    }

    setGeneratingFlashcards(true);
    try {
      await createFlashcardsJob({
        noteId: id,
        sourceType,
        remotePath: noteRemotePath,
      });
      router.push(`/flashcards/${id}`);
    } catch (error) {
      setRefreshError(error instanceof Error ? error.message : "Could not generate flashcards.");
    } finally {
      setGeneratingFlashcards(false);
    }
  }, [
    flashcards.length,
    flashcardsJob?.status,
    generatingFlashcards,
    id,
    noteRemotePath,
    router,
    sourceType,
    staleQueuedFlashcardsJob,
  ]);

  const onOpenFlashcards = useCallback(() => {
    if (!id?.trim()) return;
    router.push(`/flashcards/${id}`);
  }, [id, router]);

  const onRefreshNow = useCallback(() => {
    void refresh();
  }, [refresh]);

  const headerLabel = useMemo(() => {
    const normalized = noteCategory.trim();
    return normalized ? `Lesson - ${normalized}` : "Lesson";
  }, [noteCategory]);

  const headerTitle = useMemo(() => {
    const normalized = noteName.trim();
    return normalized || "Untitled Note";
  }, [noteName]);

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: palette.background }]}>
        <ActivityIndicator color={palette.primary} />
        <Text style={[styles.supportText, { color: palette.mutedText }]}>Loading note workspace...</Text>
      </View>
    );
  }

  const transcriptionDisabled = isDocument;
  const paragraphs = transcriptParagraphs(transcriptText);

  return (
    <View style={[styles.screen, { backgroundColor: palette.background }]}>
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + 8,
            borderColor: colorScheme === "dark" ? "rgba(255,255,255,0.06)" : "#e5e7eb",
            backgroundColor: colorScheme === "dark" ? "rgba(30,22,46,0.92)" : "rgba(255,255,255,0.92)",
          },
        ]}
      >
        <Pressable onPress={() => router.back()} style={styles.headerIconButton}>
          <MaterialIcons name="arrow-back-ios-new" size={18} color={palette.text} />
        </Pressable>
        <View style={styles.headerTitleWrap}>
          <Text style={[styles.headerLabel, { color: palette.primary }]}>{headerLabel}</Text>
          <Text numberOfLines={1} style={[styles.headerTitle, { color: palette.text }]}>
            {headerTitle}
          </Text>
        </View>
        <Pressable onPress={() => setMenuOpen((prev) => !prev)} style={styles.headerIconButton}>
          <MaterialIcons name="more-horiz" size={22} color={palette.mutedText} />
        </Pressable>
      </View>

      {menuOpen ? (
        <Pressable style={styles.menuBackdrop} onPress={() => setMenuOpen(false)}>
          <View
            style={[
              styles.menuCard,
              {
                top: insets.top + 54,
                backgroundColor: colorScheme === "dark" ? "#231a36" : "#ffffff",
                borderColor: colorScheme === "dark" ? "rgba(255,255,255,0.08)" : "#e5e7eb",
              },
            ]}
          >
            <Pressable
              style={styles.menuItem}
              onPress={() => {
                setMenuOpen(false);
                onRefreshNow();
              }}
            >
              <MaterialIcons name="refresh" size={18} color={palette.text} />
              <Text style={[styles.menuText, { color: palette.text }]}>Refresh</Text>
            </Pressable>
            <Pressable
              style={[styles.menuItem, !canRetry && styles.menuItemDisabled]}
              disabled={!canRetry}
              onPress={() => {
                setMenuOpen(false);
                void onRetry();
              }}
            >
              <MaterialIcons
                name="replay"
                size={18}
                color={!canRetry ? palette.mutedText : palette.text}
              />
              <Text style={[styles.menuText, { color: !canRetry ? palette.mutedText : palette.text }]}>
                Retry {activeTab === "summary" ? "Summary" : "Transcription"}
              </Text>
            </Pressable>
            <Pressable
              style={[styles.menuItem, !canOpenFlashcards && styles.menuItemDisabled]}
              disabled={!canOpenFlashcards}
              onPress={() => {
                setMenuOpen(false);
                onOpenFlashcards();
              }}
            >
              <MaterialIcons
                name="style"
                size={18}
                color={!canOpenFlashcards ? palette.mutedText : palette.text}
              />
              <Text
                style={[
                  styles.menuText,
                  { color: !canOpenFlashcards ? palette.mutedText : palette.text },
                ]}
              >
                {hasFlashcards ? "Open Flashcards" : "Go to Flashcards"}
              </Text>
            </Pressable>
          </View>
        </Pressable>
      ) : null}

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: scrollBottomPadding }]}
      >
        <View
          onLayout={onSegmentLayout}
          style={[
            styles.segmentWrap,
            { backgroundColor: colorScheme === "dark" ? "rgba(255,255,255,0.06)" : "#eef0f4" },
          ]}
        >
          <View
            style={[
              styles.segmentIndicator,
              {
                backgroundColor: palette.primary,
                width: segmentIndicatorWidth,
                left: 5 + (activeTab === "summary" ? segmentIndicatorWidth : 0),
              },
            ]}
          />
          <Pressable
            onPress={() => setActiveTab("transcription")}
            disabled={transcriptionDisabled}
            style={styles.segmentButton}
          >
            <Text
              style={[
                styles.segmentText,
                activeTab === "transcription"
                  ? styles.segmentTextActive
                  : { color: palette.mutedText },
              ]}
            >
              Transcription
            </Text>
          </Pressable>
          <Pressable onPress={() => setActiveTab("summary")} style={styles.segmentButton}>
            <Text
              style={[
                styles.segmentText,
                activeTab === "summary" ? styles.segmentTextActive : { color: palette.mutedText },
              ]}
            >
              AI Summary
            </Text>
          </Pressable>
        </View>

        <View style={[styles.statusCard, { backgroundColor: palette.card, borderColor: palette.border }]}>
          <View style={styles.statusRow}>
            <Text style={[styles.statusLabel, { color: palette.mutedText }]}>Status</Text>
            <Text style={[styles.statusValue, { color: palette.text }]}>{formatStatus(statusForTab)}</Text>
          </View>
          {(activeTab === "transcription" ? transcriptionPending : summaryPending) ? (
            <View style={styles.inlineRow}>
              <ActivityIndicator size="small" color={palette.primary} />
              <Text style={[styles.supportText, { color: palette.mutedText }]}>Processing...</Text>
            </View>
          ) : null}
          {errorForTab ? <Text style={[styles.errorText, { color: palette.error }]}>{errorForTab}</Text> : null}
          {canRetry ? (
            <Pressable
              onPress={() => void onRetry()}
              disabled={retrying}
              style={({ pressed }) => [
                styles.retryButton,
                { backgroundColor: palette.primary, opacity: pressed || retrying ? 0.85 : 1 },
              ]}
            >
              <Text style={styles.retryButtonText}>{retrying ? "Retrying..." : "Retry"}</Text>
            </Pressable>
          ) : null}
        </View>

        {activeTab === "transcription" ? (
          transcriptionDisabled ? (
            <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}>
              <Text style={[styles.supportText, { color: palette.mutedText }]}>No transcript for document imports.</Text>
            </View>
          ) : (
            <>
              <View style={[styles.playerCard, { backgroundColor: palette.card, borderColor: palette.border }]}>
                <View style={[styles.playButton, { backgroundColor: palette.primary }]}>
                  <MaterialIcons name="pause" size={20} color="#fff" />
                </View>
                <View style={styles.waveWrap}>
                  {Array.from({ length: 16 }).map((_, index) => (
                    <View
                      key={`wave-${index}`}
                      style={[
                        styles.waveBar,
                        {
                          backgroundColor:
                            index % 4 === 0 || index % 5 === 0
                              ? palette.primary
                              : colorScheme === "dark"
                                ? "rgba(255,255,255,0.22)"
                                : "#99a2b3",
                          height: 8 + ((index * 7) % 15),
                        },
                      ]}
                    />
                  ))}
                </View>
                <Text style={[styles.durationText, { color: palette.mutedText }]}>LIVE</Text>
              </View>

              <View style={styles.transcriptWrap}>
                {paragraphs.length ? (
                  paragraphs.map((line, index) => (
                    <View
                      key={`line-${index}`}
                      style={[
                        styles.transcriptLine,
                        {
                          backgroundColor:
                            index % 2 === 0
                              ? colorScheme === "dark"
                                ? "rgba(255,255,255,0.03)"
                                : "#f7f8fb"
                              : "transparent",
                          borderColor: colorScheme === "dark" ? "rgba(255,255,255,0.06)" : "#e6e9ef",
                        },
                      ]}
                    >
                      <Text style={[styles.transcriptText, { color: palette.text }]}>{line}</Text>
                    </View>
                  ))
                ) : (
                  <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}>
                    <Text style={[styles.supportText, { color: palette.mutedText }]}>No transcript available yet.</Text>
                  </View>
                )}
              </View>
            </>
          )
        ) : (
          <View style={styles.summaryWrap}>
            <View style={[styles.summaryOverviewCard, { borderColor: "rgba(91,19,236,0.24)" }]}>
              <View style={styles.inlineRow}>
                <MaterialIcons name="auto-awesome" size={18} color={palette.primary} />
                <Text style={[styles.overviewHeading, { color: palette.primary }]}>Performance Overview</Text>
              </View>
              <Text style={[styles.overviewBody, { color: palette.text }]}>
                {summary?.overview ?? "No summary available yet."}
              </Text>
            </View>

            <View style={styles.sectionBlock}>
              <Text style={[styles.sectionTitle, { color: palette.text }]}>Key Points</Text>
              {(summary?.keyPoints?.length ? summary.keyPoints : ["No key points yet."]).map((point, index) => (
                <View
                  key={`kp-${index}`}
                  style={[styles.pointCard, { backgroundColor: palette.card, borderColor: palette.border }]}
                >
                  <MaterialIcons name="check-circle" size={18} color="#10b981" />
                  <Text style={[styles.pointText, { color: palette.text }]}>{point}</Text>
                </View>
              ))}
            </View>

            <View style={styles.sectionBlock}>
              <Text style={[styles.sectionTitle, { color: palette.text }]}>Areas for Improvement</Text>
              {(summary?.actionItems?.length ? summary.actionItems : ["No action items yet."]).map((item, index) => (
                <View key={`ai-${index}`} style={styles.numberedRow}>
                  <View style={[styles.numberBadge, { backgroundColor: "rgba(245,158,11,0.12)" }]}>
                    <Text style={[styles.numberBadgeText, { color: "#f59e0b" }]}>{index + 1}</Text>
                  </View>
                  <Text style={[styles.numberedText, { color: palette.text }]}>{item}</Text>
                </View>
              ))}
            </View>

            <View style={styles.sectionBlock}>
              <Text style={[styles.sectionTitle, { color: palette.text }]}>Study Questions</Text>
              {(summary?.studyQuestions?.length ? summary.studyQuestions : ["No study questions yet."]).map(
                (question, index) => (
                  <Text key={`sq-${index}`} style={[styles.studyQuestion, { color: palette.text }]}>
                    • {question}
                  </Text>
                ),
              )}
            </View>
          </View>
        )}
      </ScrollView>

      {activeTab === "summary" ? (
        <View
          style={[
            styles.footer,
            {
              paddingBottom: footerPaddingBottom,
            },
          ]}
        >
          <Pressable
            onPress={() => void onGenerateFlashcards()}
            disabled={!sourceType || !noteRemotePath || generatingFlashcards || summaryPending}
            style={[
              styles.generateButton,
              {
                backgroundColor: palette.primary,
              },
            ]}
          >
            {generatingFlashcards ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <MaterialIcons name="auto-awesome" size={20} color="#fff" />
            )}
            <Text style={styles.generateButtonText}>
              {generatingFlashcards
                ? "Generating..."
                : flashcards.length > 0
                  ? `Open Flashcards (${flashcards.length})`
                  : "Generate Flashcards"}
            </Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  header: {
    borderBottomWidth: 1,
    paddingHorizontal: 14,
    paddingBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerIconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitleWrap: {
    alignItems: "center",
    maxWidth: "72%",
  },
  headerLabel: {
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 1.2,
    fontWeight: "500",
    marginBottom: 1,
  },
  headerTitle: {
    fontSize: 19,
    lineHeight: 24,
    fontWeight: "700",
  },
  menuBackdrop: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 20,
  },
  menuCard: {
    position: "absolute",
    top: 58,
    right: 12,
    width: 208,
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 6,
  },
  menuItem: {
    height: 40,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  menuItemDisabled: {
    opacity: 0.6,
  },
  menuText: {
    fontSize: 14,
    fontWeight: "500",
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 120,
    gap: 14,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    gap: 10,
  },
  segmentWrap: {
    height: 54,
    borderRadius: 14,
    padding: 5,
    flexDirection: "row",
    position: "relative",
  },
  segmentIndicator: {
    position: "absolute",
    top: 5,
    bottom: 5,
    borderRadius: 10,
  },
  segmentButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
  },
  segmentText: {
    fontSize: 14,
    fontWeight: "600",
  },
  segmentTextActive: {
    color: "#ffffff",
  },
  statusCard: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    gap: 8,
  },
  statusRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  statusLabel: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  statusValue: {
    fontSize: 13,
    fontWeight: "700",
  },
  inlineRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  supportText: {
    fontSize: 13,
    lineHeight: 18,
  },
  errorText: {
    fontSize: 13,
    lineHeight: 18,
  },
  retryButton: {
    alignSelf: "flex-start",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  retryButtonText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
  },
  card: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
  },
  playerCard: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  playButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  waveWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  waveBar: {
    width: 3,
    borderRadius: 4,
  },
  durationText: {
    fontSize: 11,
    fontWeight: "700",
  },
  transcriptWrap: {
    gap: 8,
  },
  transcriptLine: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
  },
  transcriptText: {
    fontSize: 15,
    lineHeight: 22,
  },
  summaryWrap: {
    gap: 16,
  },
  summaryOverviewCard: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
    gap: 8,
    backgroundColor: "rgba(91,19,236,0.08)",
  },
  overviewHeading: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  overviewBody: {
    fontSize: 14,
    lineHeight: 21,
  },
  sectionBlock: {
    gap: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  pointCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
  },
  pointText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
  },
  numberedRow: {
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
  },
  numberBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  numberBadgeText: {
    fontSize: 12,
    fontWeight: "700",
  },
  numberedText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  studyQuestion: {
    fontSize: 14,
    lineHeight: 20,
  },
  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
  },
  generateButton: {
    height: 54,
    borderRadius: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    shadowColor: "#5b13ec",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 10,
  },
  generateButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
});
