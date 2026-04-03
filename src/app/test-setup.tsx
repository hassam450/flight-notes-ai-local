import { MaterialIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { DEFAULT_QUIZ_COUNT, QUESTION_COUNT_OPTIONS } from "@/constants/quiz-topics";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import {
    fetchAssessmentNotes,
    type AssessmentNote,
} from "@/services/notes/assessment-notes-service";
import {
    listPrebuiltMcqSets,
    listPrebuiltOralSets,
} from "@/services/quiz/prebuilt-assessments-service";
import type { AssessmentMode, AssessmentSourceMode } from "@/types/assessment";

const MAX_NOTE_SELECTION = 5;

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

export default function TestSetupScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    mode?: AssessmentMode;
    category?: string;
    topic?: string;
  }>();
  const colorScheme = useColorScheme();
  const insets = useSafeAreaInsets();

  const isDark = colorScheme === "dark";
  const palette = Colors[colorScheme ?? "light"];
  const mode: AssessmentMode = params.mode === "oral_exam" ? "oral_exam" : "mcq";
  const category = params.category || "PPL";
  const topic = params.topic || "";

  const [sourceMode, setSourceMode] = useState<AssessmentSourceMode>("prebuilt");
  const [questionCount, setQuestionCount] = useState<number>(DEFAULT_QUIZ_COUNT);
  const [selectedSetId, setSelectedSetId] = useState<string>(() => {
    const sets = mode === "mcq" ? listPrebuiltMcqSets(category) : listPrebuiltOralSets(category);
    return sets.length > 0 ? sets[0].id : "";
  });
  const [notes, setNotes] = useState<AssessmentNote[]>([]);
  const [selectedNoteIds, setSelectedNoteIds] = useState<string[]>([]);
  const [loadingNotes, setLoadingNotes] = useState(false);
  const [notesError, setNotesError] = useState<string | null>(null);

  const prebuiltSets = useMemo(
    () => (mode === "mcq" ? listPrebuiltMcqSets(category) : listPrebuiltOralSets(category)),
    [category, mode],
  );

  useEffect(() => {
    if (prebuiltSets.length > 0) {
      setSelectedSetId(prebuiltSets[0].id);
    } else {
      setSelectedSetId("");
    }
  }, [prebuiltSets]);

  useEffect(() => {
    if (sourceMode !== "notes_ai") return;
    let isMounted = true;

    const run = async () => {
      setLoadingNotes(true);
      setNotesError(null);
      try {
        const data = await fetchAssessmentNotes(50);
        if (!isMounted) return;
        setNotes(data);
      } catch (error) {
        if (!isMounted) return;
        const message = error instanceof Error ? error.message : "Failed to load notes.";
        setNotesError(message);
      } finally {
        if (!isMounted) return;
        setLoadingNotes(false);
      }
    };

    void run();
    return () => {
      isMounted = false;
    };
  }, [sourceMode]);

  const canStart =
    sourceMode === "prebuilt"
      ? selectedSetId.length > 0
      : selectedNoteIds.length > 0;

  const toggleNote = (noteId: string) => {
    setSelectedNoteIds((prev) => {
      if (prev.includes(noteId)) return prev.filter((id) => id !== noteId);
      if (prev.length >= MAX_NOTE_SELECTION) return prev;
      return [...prev, noteId];
    });
  };

  const handleStart = () => {
    if (!canStart) return;

    const pathname = mode === "mcq" ? "/quiz" : "/oral-exam";
    const query: Record<string, string> = {
      category,
      topic,
      sourceMode,
      questionCount: String(questionCount),
    };

    if (sourceMode === "prebuilt") {
      query.prebuiltSetId = selectedSetId;
    } else {
      query.noteIds = selectedNoteIds.join(",");
      query.targetCategory = category;
    }

    router.push({ pathname: pathname as any, params: query });
  };

  return (
    <View style={[styles.container, { backgroundColor: palette.background }]}>
      <StatusBar style={isDark ? "light" : "dark"} />

      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + 6,
            borderBottomColor: isDark ? "rgba(91,19,236,0.1)" : "#e5e7eb",
          },
        ]}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton} activeOpacity={0.7}>
          <MaterialIcons name="chevron-left" size={26} color="#5b13ec" />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: palette.text }]}>Setup Test</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: insets.bottom + 110 }}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.metaText, { color: palette.mutedText }]}>
          {mode === "mcq" ? "MCQ Quiz" : "Oral Exam"} • {category}
          {topic ? ` • ${topic}` : ""}
        </Text>

        <Text style={[styles.sectionTitle, { color: palette.text }]}>Select Test Type</Text>
        <View style={styles.row}>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => setSourceMode("prebuilt")}
            style={[
              styles.sourceCard,
              {
                borderColor: sourceMode === "prebuilt" ? "#5b13ec" : isDark ? "rgba(255,255,255,0.08)" : "#e5e7eb",
                backgroundColor: sourceMode === "prebuilt" ? "rgba(91,19,236,0.08)" : isDark ? "#1E1E24" : "#ffffff",
              },
            ]}
          >
            <Text style={[styles.sourceTitle, { color: palette.text }]}>Prebuilt Test</Text>
            <Text style={[styles.sourceBody, { color: palette.mutedText }]}>Use random questions from local set banks.</Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => setSourceMode("notes_ai")}
            style={[
              styles.sourceCard,
              {
                borderColor: sourceMode === "notes_ai" ? "#5b13ec" : isDark ? "rgba(255,255,255,0.08)" : "#e5e7eb",
                backgroundColor: sourceMode === "notes_ai" ? "rgba(91,19,236,0.08)" : isDark ? "#1E1E24" : "#ffffff",
              },
            ]}
          >
            <Text style={[styles.sourceTitle, { color: palette.text }]}>Generate from Notes</Text>
            <Text style={[styles.sourceBody, { color: palette.mutedText }]}>Build questions from selected notes.</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.sectionWrap}>
          <Text style={[styles.sectionTitle, { color: palette.text }]}>Number of Questions</Text>
          <View style={styles.chipRow}>
            {QUESTION_COUNT_OPTIONS.map((count) => {
              const selected = questionCount === count;
              return (
                <TouchableOpacity
                  key={count}
                  activeOpacity={0.85}
                  onPress={() => setQuestionCount(count)}
                  style={[
                    styles.chip,
                    {
                      borderColor: selected ? "#5b13ec" : isDark ? "rgba(255,255,255,0.08)" : "#e5e7eb",
                      backgroundColor: selected ? "rgba(91,19,236,0.08)" : isDark ? "#1E1E24" : "#ffffff",
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.chipText,
                      { color: selected ? "#5b13ec" : palette.text },
                    ]}
                  >
                    {count}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {sourceMode === "prebuilt" ? (
          <View style={styles.sectionWrap}>
            <Text style={[styles.sectionTitle, { color: palette.text }]}>Prebuilt Sets</Text>
            {prebuiltSets.map((set) => {
              const selected = selectedSetId === set.id;
              return (
                <TouchableOpacity
                  key={set.id}
                  activeOpacity={0.85}
                  onPress={() => setSelectedSetId(set.id)}
                  style={[
                    styles.itemCard,
                    {
                      borderColor: selected ? "#5b13ec" : isDark ? "rgba(255,255,255,0.08)" : "#e5e7eb",
                      backgroundColor: selected ? "rgba(91,19,236,0.08)" : isDark ? "#1E1E24" : "#ffffff",
                    },
                  ]}
                >
                  <View style={styles.itemTextWrap}>
                    <Text style={[styles.itemTitle, { color: palette.text }]}>{set.title}</Text>
                    <Text style={[styles.itemSub, { color: palette.mutedText }]}>
                      Topic: {set.topic}
                    </Text>
                  </View>
                  {selected ? <MaterialIcons name="check-circle" size={22} color="#5b13ec" /> : null}
                </TouchableOpacity>
              );
            })}
          </View>
        ) : (
          <View style={styles.sectionWrap}>
            <Text style={[styles.sectionTitle, { color: palette.text }]}>
              Select Notes ({selectedNoteIds.length}/{MAX_NOTE_SELECTION})
            </Text>

            {loadingNotes ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator size="small" color="#5b13ec" />
                <Text style={[styles.itemSub, { color: palette.mutedText }]}>Loading notes...</Text>
              </View>
            ) : null}

            {!loadingNotes && notesError ? (
              <Text style={[styles.itemSub, { color: palette.error }]}>{notesError}</Text>
            ) : null}

            {!loadingNotes && !notesError && notes.length === 0 ? (
              <Text style={[styles.itemSub, { color: palette.mutedText }]}>
                No notes with summary or transcript content are available yet.
              </Text>
            ) : null}

            {!loadingNotes && !notesError
              ? notes.map((note) => {
                  const selected = selectedNoteIds.includes(note.id);
                  return (
                    <TouchableOpacity
                      key={note.id}
                      activeOpacity={0.85}
                      onPress={() => toggleNote(note.id)}
                      style={[
                        styles.itemCard,
                        {
                          borderColor: selected ? "#5b13ec" : isDark ? "rgba(255,255,255,0.08)" : "#e5e7eb",
                          backgroundColor: selected ? "rgba(91,19,236,0.08)" : isDark ? "#1E1E24" : "#ffffff",
                        },
                      ]}
                    >
                      <View style={styles.itemTextWrap}>
                        <Text numberOfLines={1} style={[styles.itemTitle, { color: palette.text }]}>
                          {note.name}
                        </Text>
                        <Text style={[styles.itemSub, { color: palette.mutedText }]}>
                          {note.category} • {formatDate(note.createdAt)} • {note.hasSummary ? "Summary" : "Transcript"}
                        </Text>
                      </View>
                      {selected ? <MaterialIcons name="check-circle" size={22} color="#5b13ec" /> : null}
                    </TouchableOpacity>
                  );
                })
              : null}
          </View>
        )}
      </ScrollView>

      <View
        style={[
          styles.footer,
          {
            paddingBottom: insets.bottom + 12,
            borderTopColor: isDark ? "rgba(255,255,255,0.08)" : "#e5e7eb",
            backgroundColor: palette.background,
          },
        ]}
      >
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={handleStart}
          disabled={!canStart}
          style={[
            styles.startButton,
            { opacity: canStart ? 1 : 0.55 },
          ]}
        >
          <Text style={styles.startButtonText}>
            Start {mode === "mcq" ? "Quiz" : "Oral Session"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  backButton: { flexDirection: "row", alignItems: "center", minWidth: 64 },
  backText: {
    color: "#5b13ec",
    fontSize: 14,
    fontWeight: "600",
    marginLeft: -3,
  },
  headerTitle: { fontSize: 18, fontWeight: "700" },
  headerSpacer: { width: 64 },
  metaText: { fontSize: 12, fontWeight: "600", marginBottom: 12 },
  sectionTitle: { fontSize: 18, fontWeight: "700", marginBottom: 10 },
  sectionWrap: { marginTop: 18 },
  row: { flexDirection: "row", gap: 10 },
  chipRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  chip: {
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  chipText: { fontSize: 14, fontWeight: "700" },
  sourceCard: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
  },
  sourceTitle: { fontSize: 15, fontWeight: "700", marginBottom: 4 },
  sourceBody: { fontSize: 12, lineHeight: 18 },
  itemCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
  },
  itemTextWrap: { flex: 1 },
  itemTitle: { fontSize: 14, fontWeight: "700" },
  itemSub: { fontSize: 12, marginTop: 2 },
  loadingRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 8 },
  footer: {
    borderTopWidth: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  startButton: {
    backgroundColor: "#5b13ec",
    borderRadius: 14,
    height: 50,
    alignItems: "center",
    justifyContent: "center",
  },
  startButtonText: { color: "#fff", fontSize: 15, fontWeight: "700" },
});
