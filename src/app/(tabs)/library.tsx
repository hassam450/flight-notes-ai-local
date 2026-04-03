import { MaterialIcons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { STUDY_TOPICS } from "@/constants/quiz-topics";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { usePaywallGuard } from "@/hooks/use-paywall";
import {
    fetchNotesHistory,
    type HistoryNote,
} from "@/services/notes/notes-service";
import { fetchSessionHistory } from "@/services/quiz/learning-sessions-service";
import type { LearningSession } from "@/types/learning-session";

// ── Constants ───────────────────────────────────────────────────────────────

type ActiveTab = "notes" | "assessments";
type IconName = keyof typeof MaterialIcons.glyphMap;

const PAGE_SIZE = 20;

const CATEGORY_COLORS: Record<
  string,
  { text: string; bg: string; border: string }
> = {
  PPL: {
    text: "#5b13ec",
    bg: "rgba(91,19,236,0.1)",
    border: "rgba(91,19,236,0.2)",
  },
  Instrument: {
    text: "#64748b",
    bg: "rgba(100,116,139,0.1)",
    border: "rgba(100,116,139,0.2)",
  },
  Commercial: {
    text: "#3b82f6",
    bg: "rgba(59,130,246,0.1)",
    border: "rgba(59,130,246,0.2)",
  },
  "Multi-Engine": {
    text: "#f59e0b",
    bg: "rgba(245,158,11,0.1)",
    border: "rgba(245,158,11,0.2)",
  },
  CFI: {
    text: "#06b6d4",
    bg: "rgba(6,182,212,0.1)",
    border: "rgba(6,182,212,0.2)",
  },
};

const DEFAULT_CATEGORY_COLOR = {
  text: "#64748b",
  bg: "rgba(100,116,139,0.1)",
  border: "rgba(100,116,139,0.2)",
};

// ── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "Unknown date";
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return "";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")} recording`;
}

function getCategoryColor(category: string) {
  return CATEGORY_COLORS[category] ?? DEFAULT_CATEGORY_COLOR;
}

function isAudioSource(sourceType: string) {
    return sourceType === "recorded" || sourceType === "imported_audio";
}

function getNoteStatus(
    hasSummary: boolean,
    status: string,
    sourceType: string,
    isDark: boolean,
) {
    if (hasSummary) {
        const label = isAudioSource(sourceType) ? "Transcribed" : "Summarized";
        return {
            label,
            icon: "check-circle" as IconName,
            bg: isDark ? "rgba(34,197,94,0.2)" : "rgba(34,197,94,0.1)",
            text: isDark ? "#86efac" : "#22c55e",
            border: "rgba(34,197,94,0.2)",
        };
    }
  if (status === "upload_failed") {
    return {
      label: "Failed",
      icon: "error-outline" as IconName,
      bg: isDark ? "rgba(239,68,68,0.2)" : "rgba(239,68,68,0.1)",
      text: isDark ? "#fca5a5" : "#ef4444",
      border: "rgba(239,68,68,0.2)",
    };
  }
  return {
    label: "Processing",
    icon: "hourglass-empty" as IconName,
    bg: isDark ? "rgba(91,19,236,0.2)" : "rgba(91,19,236,0.1)",
    text: "#5b13ec",
    border: "rgba(91,19,236,0.3)",
  };
}

function getSourceIcon(sourceType: string): IconName {
  if (sourceType === "recorded") return "mic";
  if (sourceType === "imported_audio") return "audiotrack";
  if (sourceType === "manual_text") return "edit";
  return "description";
}

function getTopicDisplay(topic: string | null, category: string) {
  if (topic) {
    const found = STUDY_TOPICS.find(
      (t) => t.label.toLowerCase() === topic.toLowerCase(),
    );
    if (found) {
      return { icon: found.icon as IconName, label: found.label };
    }
    return { icon: "school" as IconName, label: topic };
  }
  return { icon: "school" as IconName, label: `${category} General` };
}

function getModeBadgeStyle(mode: string, isDark: boolean) {
  if (mode === "oral_exam") {
    return {
      label: "AI Oral Prep",
      bg: isDark ? "rgba(34,197,94,0.2)" : "rgba(34,197,94,0.1)",
      text: isDark ? "#86efac" : "#166534",
    };
  }
  return {
    label: "Topic Quiz",
    bg: isDark ? "rgba(91,19,236,0.2)" : "rgba(91,19,236,0.1)",
    text: "#5b13ec",
  };
}

function getScoreCircleColor(mode: string) {
  return mode === "oral_exam"
    ? { bg: "#22c55e", ring: "rgba(34,197,94,0.1)" }
    : { bg: "#5b13ec", ring: "rgba(91,19,236,0.1)" };
}

// ── Component ───────────────────────────────────────────────────────────────

export default function HistoryScreen() {
  const router = useRouter();
  const { guardedNavigate } = usePaywallGuard();
  const colorScheme = useColorScheme();
  const insets = useSafeAreaInsets();
  const isDark = colorScheme === "dark";
  const palette = Colors[colorScheme ?? "light"];

  const [activeTab, setActiveTab] = useState<ActiveTab>("notes");
  const [searchQuery, setSearchQuery] = useState("");

  // Notes state
  const [notes, setNotes] = useState<HistoryNote[]>([]);
  const [notesLoading, setNotesLoading] = useState(false);
  const [notesLoadingMore, setNotesLoadingMore] = useState(false);
  const [notesError, setNotesError] = useState<string | null>(null);
  const [hasMoreNotes, setHasMoreNotes] = useState(true);

  // Assessments state
  const [assessments, setAssessments] = useState<LearningSession[]>([]);
  const [assessmentsLoading, setAssessmentsLoading] = useState(false);
  const [assessmentsLoadingMore, setAssessmentsLoadingMore] = useState(false);
  const [assessmentsError, setAssessmentsError] = useState<string | null>(
    null,
  );
  const [hasMoreAssessments, setHasMoreAssessments] = useState(true);

  const isMountedRef = useRef(true);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // ── Data Loading ──────────────────────────────────────────────────────────

  const loadNotes = useCallback(async () => {
    setNotesLoading(true);
    setNotesError(null);
    try {
      const data = await fetchNotesHistory(PAGE_SIZE, 0);
      if (!isMountedRef.current) return;
      setNotes(data);
      setHasMoreNotes(data.length === PAGE_SIZE);
    } catch (err) {
      if (!isMountedRef.current) return;
      setNotesError(
        err instanceof Error ? err.message : "Failed to load notes.",
      );
    } finally {
      if (isMountedRef.current) setNotesLoading(false);
    }
  }, []);

  const loadAssessments = useCallback(async () => {
    setAssessmentsLoading(true);
    setAssessmentsError(null);
    try {
      const data = await fetchSessionHistory(PAGE_SIZE, 0);
      if (!isMountedRef.current) return;
      setAssessments(data);
      setHasMoreAssessments(data.length === PAGE_SIZE);
    } catch (err) {
      if (!isMountedRef.current) return;
      setAssessmentsError(
        err instanceof Error ? err.message : "Failed to load assessments.",
      );
    } finally {
      if (isMountedRef.current) setAssessmentsLoading(false);
    }
  }, []);

  async function handleLoadMoreNotes() {
    setNotesLoadingMore(true);
    try {
      const data = await fetchNotesHistory(PAGE_SIZE, notes.length);
      if (!isMountedRef.current) return;
      setNotes((prev) => [...prev, ...data]);
      setHasMoreNotes(data.length === PAGE_SIZE);
    } catch {
      // silently fail load-more
    } finally {
      if (isMountedRef.current) setNotesLoadingMore(false);
    }
  }

  async function handleLoadMoreAssessments() {
    setAssessmentsLoadingMore(true);
    try {
      const data = await fetchSessionHistory(PAGE_SIZE, assessments.length);
      if (!isMountedRef.current) return;
      setAssessments((prev) => [...prev, ...data]);
      setHasMoreAssessments(data.length === PAGE_SIZE);
    } catch {
      // silently fail load-more
    } finally {
      if (isMountedRef.current) setAssessmentsLoadingMore(false);
    }
  }

  useFocusEffect(
    useCallback(() => {
      void loadNotes();
      void loadAssessments();
      return () => {};
    }, [loadNotes, loadAssessments]),
  );

  // ── Search Filtering ──────────────────────────────────────────────────────

  const q = searchQuery.toLowerCase();

  const filteredNotes = q
    ? notes.filter(
        (n) =>
          n.name.toLowerCase().includes(q) ||
          n.category.toLowerCase().includes(q),
      )
    : notes;

  const filteredAssessments = q
    ? assessments.filter(
        (a) =>
          a.category.toLowerCase().includes(q) ||
          (a.topic?.toLowerCase().includes(q) ?? false) ||
          a.mode.replace("_", " ").includes(q),
      )
    : assessments;

  // ── Note Card ─────────────────────────────────────────────────────────────

  function renderNoteCard(note: HistoryNote) {
    const catColor = getCategoryColor(note.category);
    const status = getNoteStatus(note.hasSummary, note.status, note.sourceType, isDark);
    const sourceIcon = getSourceIcon(note.sourceType);
    const duration = formatDuration(note.durationSec);

    return (
      <TouchableOpacity
        key={note.id}
        activeOpacity={0.85}
        style={[
          styles.noteCard,
          {
            backgroundColor: isDark ? "rgba(91,19,236,0.05)" : "#ffffff",
            borderColor: isDark ? "rgba(91,19,236,0.2)" : "#e5e7eb",
          },
        ]}
        onPress={() => guardedNavigate(`/summary/${note.id}`)}
      >
        {/* Top: category badge + date | status badge */}
        <View style={styles.noteTopRow}>
          <View style={styles.noteMetaRow}>
            {note.category ? (
              <View
                style={[
                  styles.categoryBadge,
                  { backgroundColor: catColor.bg, borderColor: catColor.border },
                ]}
              >
                <Text
                  style={[styles.categoryBadgeText, { color: catColor.text }]}
                >
                  {note.category.toUpperCase()}
                </Text>
              </View>
            ) : null}
            <Text style={[styles.noteDateText, { color: palette.mutedText }]}>
              {formatDate(note.createdAt)}
            </Text>
          </View>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: status.bg, borderColor: status.border },
            ]}
          >
            <MaterialIcons name={status.icon} size={12} color={status.text} />
            <Text style={[styles.statusBadgeText, { color: status.text }]}>
              {status.label}
            </Text>
          </View>
        </View>

        {/* Title */}
        <Text
          numberOfLines={1}
          style={[styles.noteTitle, { color: palette.text }]}
        >
          {note.name}
        </Text>

        {/* Preview */}
        {note.hasSummary && note.previewText ? (
          <Text
            numberOfLines={2}
            style={[styles.notePreview, { color: palette.mutedText }]}
          >
            {note.previewText}
          </Text>
        ) : !note.hasSummary && note.status !== "upload_failed" ? (
          <Text
            numberOfLines={2}
            style={[
              styles.notePreview,
              { color: palette.mutedText, fontStyle: "italic" },
            ]}
          >
            AI is currently processing your notes...
          </Text>
        ) : null}

        {/* Bottom: source icons + duration */}
        {duration || note.hasSummary ? (
          <View style={styles.noteBottom}>
            <View style={styles.noteIcons}>
              <View
                style={[
                  styles.noteIconCircle,
                  {
                    backgroundColor: "rgba(91,19,236,0.2)",
                    borderColor: isDark ? palette.background : "#fff",
                  },
                ]}
              >
                <MaterialIcons name={sourceIcon} size={11} color="#5b13ec" />
              </View>
              {note.hasSummary ? (
                <View
                  style={[
                    styles.noteIconCircle,
                    styles.noteIconOverlap,
                    {
                      backgroundColor: "rgba(91,19,236,0.2)",
                      borderColor: isDark ? palette.background : "#fff",
                    },
                  ]}
                >
                  <MaterialIcons
                    name="auto-awesome"
                    size={11}
                    color="#5b13ec"
                  />
                </View>
              ) : null}
            </View>
            {duration ? (
              <Text
                style={[styles.noteDurationText, { color: palette.mutedText }]}
              >
                {duration}
              </Text>
            ) : null}
          </View>
        ) : null}
      </TouchableOpacity>
    );
  }

  // ── Assessment Card ───────────────────────────────────────────────────────

  function renderAssessmentCard(session: LearningSession) {
    const modeBadge = getModeBadgeStyle(session.mode, isDark);
    const scoreColor = getScoreCircleColor(session.mode);
    const topicInfo = getTopicDisplay(session.topic, session.category);
    const title =
      session.mode === "oral_exam"
        ? `${session.percentage}% Checkride Readiness`
        : `${session.percentage}% Performance`;

    const handlePress = () => {
      const p = new URLSearchParams();
      p.set("mode", session.mode === "oral_exam" ? "oral_exam" : "mcq");
      p.set("score", String(session.score));
      p.set("total", String(session.total));
      p.set("percentage", String(session.percentage));
      p.set("timeTaken", String(session.time_taken_seconds ?? 0));
      p.set("category", session.category);
      if (session.topic) p.set("topic", session.topic);
      if (session.strengths) p.set("strengths", JSON.stringify(session.strengths));
      if (session.weaknesses) p.set("weaknesses", JSON.stringify(session.weaknesses));
      p.set("fromHistory", "true");
      guardedNavigate(`/quiz-results?${p.toString()}`);
    };

    return (
      <TouchableOpacity
        key={session.id}
        activeOpacity={0.85}
        onPress={handlePress}
        style={[
          styles.assessmentCard,
          {
            backgroundColor: isDark ? "rgba(91,19,236,0.05)" : "#ffffff",
            borderColor: isDark ? "rgba(91,19,236,0.2)" : "#e5e7eb",
          },
        ]}
      >
        <View style={styles.assessmentTop}>
          <View style={styles.assessmentInfo}>
            <View style={[styles.modeBadge, { backgroundColor: modeBadge.bg }]}>
              <Text style={[styles.modeBadgeText, { color: modeBadge.text }]}>
                {modeBadge.label}
              </Text>
            </View>
            <Text style={[styles.assessmentTitle, { color: palette.text }]}>
              {title}
            </Text>
            <View style={styles.topicRow}>
              <MaterialIcons
                name={topicInfo.icon}
                size={14}
                color={palette.mutedText}
              />
              <Text style={[styles.topicText, { color: palette.mutedText }]}>
                {topicInfo.label}
              </Text>
            </View>
          </View>
          <View
            style={[
              styles.scoreCircleOuter,
              { backgroundColor: scoreColor.ring },
            ]}
          >
            <View
              style={[styles.scoreCircle, { backgroundColor: scoreColor.bg }]}
            >
              <Text style={styles.scoreText}>{session.percentage}%</Text>
            </View>
          </View>
        </View>

        <View
          style={[
            styles.assessmentDivider,
            {
              backgroundColor: isDark
                ? "rgba(91,19,236,0.1)"
                : "#f1f5f9",
            },
          ]}
        />

        <View style={styles.assessmentBottom}>
          <Text style={[styles.assessmentDate, { color: palette.mutedText }]}>
            {formatDate(session.created_at)}
          </Text>
          <View style={styles.reviewButton}>
            <Text style={styles.reviewButtonText}>Review Details</Text>
            <MaterialIcons name="chevron-right" size={16} color="#5b13ec" />
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <View style={[styles.container, { backgroundColor: palette.background }]}>
      <StatusBar style={isDark ? "light" : "dark"} />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Text style={[styles.headerTitle, { color: palette.text }]}>
          History
        </Text>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View
          style={[
            styles.searchBar,
            {
              backgroundColor: isDark
                ? "rgba(91,19,236,0.1)"
                : "rgba(226,232,240,0.5)",
            },
          ]}
        >
          <MaterialIcons
            name="search"
            size={20}
            color={isDark ? "rgba(91,19,236,0.6)" : "#94a3b8"}
          />
          <TextInput
            style={[styles.searchInput, { color: palette.text }]}
            placeholder={
              activeTab === "notes"
                ? "Search notes..."
                : "Search assessments..."
            }
            placeholderTextColor={isDark ? "rgba(91,19,236,0.4)" : "#94a3b8"}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
          />
        </View>
      </View>

      {/* Segmented Control */}
      <View style={styles.segmentContainer}>
        <View
          style={[
            styles.segmentTrack,
            {
              backgroundColor: isDark
                ? "rgba(91,19,236,0.1)"
                : "rgba(226,232,240,0.5)",
            },
          ]}
        >
          <TouchableOpacity
            activeOpacity={0.9}
            style={[
              styles.segmentButton,
              activeTab === "notes" && [
                styles.segmentButtonActive,
                { backgroundColor: isDark ? "#5b13ec" : "#ffffff" },
              ],
            ]}
            onPress={() => {
              setActiveTab("notes");
              setSearchQuery("");
            }}
          >
            <MaterialIcons
              name="description"
              size={16}
              color={
                activeTab === "notes"
                  ? isDark
                    ? "#ffffff"
                    : "#0f172a"
                  : isDark
                    ? "rgba(148,163,184,0.6)"
                    : "#64748b"
              }
            />
            <Text
              style={[
                styles.segmentText,
                {
                  color:
                    activeTab === "notes"
                      ? isDark
                        ? "#ffffff"
                        : "#0f172a"
                      : isDark
                        ? "rgba(148,163,184,0.6)"
                        : "#64748b",
                  fontWeight: activeTab === "notes" ? "600" : "500",
                },
              ]}
            >
              Notes
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.9}
            style={[
              styles.segmentButton,
              activeTab === "assessments" && [
                styles.segmentButtonActive,
                { backgroundColor: isDark ? "#5b13ec" : "#ffffff" },
              ],
            ]}
            onPress={() => {
              setActiveTab("assessments");
              setSearchQuery("");
            }}
          >
            <MaterialIcons
              name="assignment"
              size={16}
              color={
                activeTab === "assessments"
                  ? isDark
                    ? "#ffffff"
                    : "#0f172a"
                  : isDark
                    ? "rgba(148,163,184,0.6)"
                    : "#64748b"
              }
            />
            <Text
              style={[
                styles.segmentText,
                {
                  color:
                    activeTab === "assessments"
                      ? isDark
                        ? "#ffffff"
                        : "#0f172a"
                      : isDark
                        ? "rgba(148,163,184,0.6)"
                        : "#64748b",
                  fontWeight: activeTab === "assessments" ? "600" : "500",
                },
              ]}
            >
              Assessments
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        showsVerticalScrollIndicator={false}
        keyboardDismissMode="on-drag"
      >
        {activeTab === "notes" ? (
          <>
            {notesLoading ? (
              <View style={styles.centerBox}>
                <ActivityIndicator size="small" color={palette.primary} />
                <Text
                  style={[styles.centerText, { color: palette.mutedText }]}
                >
                  Loading notes...
                </Text>
              </View>
            ) : notesError ? (
              <View style={styles.centerBox}>
                <Text style={[styles.centerText, { color: palette.error }]}>
                  {notesError}
                </Text>
                <TouchableOpacity
                  style={styles.retryButton}
                  onPress={() => void loadNotes()}
                >
                  <Text style={styles.retryButtonText}>Retry</Text>
                </TouchableOpacity>
              </View>
            ) : filteredNotes.length === 0 ? (
              <View style={styles.centerBox}>
                <MaterialIcons
                  name="description"
                  size={40}
                  color={palette.mutedText}
                />
                <Text style={[styles.emptyTitle, { color: palette.text }]}>
                  {searchQuery ? "No matching notes" : "No notes yet"}
                </Text>
                <Text
                  style={[styles.emptySubtitle, { color: palette.mutedText }]}
                >
                  {searchQuery
                    ? "Try a different search term."
                    : "Start recording to create your first flight note."}
                </Text>
              </View>
            ) : (
              <View style={styles.listContainer}>
                {filteredNotes.map(renderNoteCard)}
                {hasMoreNotes && !searchQuery ? (
                  <TouchableOpacity
                    style={styles.loadMoreButton}
                    onPress={() => void handleLoadMoreNotes()}
                    disabled={notesLoadingMore}
                  >
                    {notesLoadingMore ? (
                      <ActivityIndicator
                        size="small"
                        color={palette.mutedText}
                      />
                    ) : (
                      <>
                        <MaterialIcons
                          name="expand-more"
                          size={16}
                          color={palette.mutedText}
                        />
                        <Text
                          style={[
                            styles.loadMoreText,
                            { color: palette.mutedText },
                          ]}
                        >
                          Load older notes
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                ) : null}
              </View>
            )}
          </>
        ) : (
          <>
            {assessmentsLoading ? (
              <View style={styles.centerBox}>
                <ActivityIndicator size="small" color={palette.primary} />
                <Text
                  style={[styles.centerText, { color: palette.mutedText }]}
                >
                  Loading assessments...
                </Text>
              </View>
            ) : assessmentsError ? (
              <View style={styles.centerBox}>
                <Text style={[styles.centerText, { color: palette.error }]}>
                  {assessmentsError}
                </Text>
                <TouchableOpacity
                  style={styles.retryButton}
                  onPress={() => void loadAssessments()}
                >
                  <Text style={styles.retryButtonText}>Retry</Text>
                </TouchableOpacity>
              </View>
            ) : filteredAssessments.length === 0 ? (
              <View style={styles.centerBox}>
                <MaterialIcons
                  name="school"
                  size={40}
                  color={palette.mutedText}
                />
                <Text style={[styles.emptyTitle, { color: palette.text }]}>
                  {searchQuery
                    ? "No matching assessments"
                    : "No assessments yet"}
                </Text>
                <Text
                  style={[styles.emptySubtitle, { color: palette.mutedText }]}
                >
                  {searchQuery
                    ? "Try a different search term."
                    : "Take a quiz or practice an oral exam to see your results."}
                </Text>
              </View>
            ) : (
              <View style={styles.listContainer}>
                <Text
                  style={[
                    styles.sectionHeader,
                    {
                      color: isDark
                        ? "rgba(91,19,236,0.6)"
                        : "#64748b",
                    },
                  ]}
                >
                  Recent Results
                </Text>
                {filteredAssessments.map(renderAssessmentCard)}
                {hasMoreAssessments && !searchQuery ? (
                  <TouchableOpacity
                    style={styles.loadMoreButton}
                    onPress={() => void handleLoadMoreAssessments()}
                    disabled={assessmentsLoadingMore}
                  >
                    {assessmentsLoadingMore ? (
                      <ActivityIndicator
                        size="small"
                        color={palette.mutedText}
                      />
                    ) : (
                      <>
                        <MaterialIcons
                          name="expand-more"
                          size={16}
                          color={palette.mutedText}
                        />
                        <Text
                          style={[
                            styles.loadMoreText,
                            { color: palette.mutedText },
                          ]}
                        >
                          Load older assessments
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                ) : null}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

// ── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },

  // Header
  header: { paddingHorizontal: 24, paddingBottom: 4 },
  headerTitle: { fontSize: 26, fontWeight: "700", letterSpacing: -0.3 },

  // Search
  searchContainer: { paddingHorizontal: 24, paddingVertical: 12 },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 48,
    gap: 8,
  },
  searchInput: { flex: 1, fontSize: 14, fontWeight: "500" },

  // Segmented Control
  segmentContainer: { paddingHorizontal: 24, paddingBottom: 12 },
  segmentTrack: { flexDirection: "row", borderRadius: 12, padding: 4 },
  segmentButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
  },
  segmentButtonActive: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  segmentText: { fontSize: 13 },

  // Scroll / List
  scrollView: { flex: 1 },
  listContainer: { paddingHorizontal: 24, gap: 16 },
  sectionHeader: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    paddingHorizontal: 4,
  },

  // Center states (loading, error, empty)
  centerBox: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    paddingHorizontal: 40,
    gap: 8,
  },
  centerText: { fontSize: 13, textAlign: "center" },
  emptyTitle: { fontSize: 17, fontWeight: "600", marginTop: 8 },
  emptySubtitle: { fontSize: 13, textAlign: "center", lineHeight: 18 },
  retryButton: {
    marginTop: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#5b13ec",
  },
  retryButtonText: { color: "#ffffff", fontSize: 13, fontWeight: "600" },
  loadMoreButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 16,
  },
  loadMoreText: { fontSize: 13, fontWeight: "500" },

  // Note Card
  noteCard: { borderRadius: 16, padding: 20, borderWidth: 1 },
  noteTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  noteMetaRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    borderWidth: 1,
  },
  categoryBadgeText: {
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 0.8,
  },
  noteDateText: { fontSize: 12, fontWeight: "500" },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
  },
  statusBadgeText: { fontSize: 10, fontWeight: "700" },
  noteTitle: { fontSize: 18, fontWeight: "600", marginBottom: 4 },
  notePreview: { fontSize: 13, lineHeight: 20 },
  noteBottom: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 16,
  },
  noteIcons: { flexDirection: "row" },
  noteIconCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
  },
  noteIconOverlap: { marginLeft: -8 },
  noteDurationText: { fontSize: 10, fontWeight: "500" },

  // Assessment Card
  assessmentCard: { borderRadius: 12, padding: 16, borderWidth: 1 },
  assessmentTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  assessmentInfo: { flex: 1, gap: 4 },
  modeBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  modeBadgeText: { fontSize: 11, fontWeight: "600" },
  assessmentTitle: { fontSize: 17, fontWeight: "700", marginTop: 2 },
  topicRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  topicText: { fontSize: 13 },
  scoreCircleOuter: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
  },
  scoreCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  scoreText: { color: "#ffffff", fontSize: 13, fontWeight: "700" },
  assessmentDivider: { height: 1, marginTop: 16 },
  assessmentBottom: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 12,
  },
  assessmentDate: { fontSize: 12 },
  reviewButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  reviewButtonText: { color: "#5b13ec", fontSize: 13, fontWeight: "600" },
});
