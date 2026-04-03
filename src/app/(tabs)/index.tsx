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
    TouchableOpacity,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppUserHeader } from "@/components/app-user-header";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { usePaywallGuard } from "@/hooks/use-paywall";
import { fetchRecentNotes, type HomeRecentNote } from "@/services/notes/notes-service";
import type { RecordingSourceType, RecordingStatus } from "@/types/recorder";

function formatCreatedDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown date";
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDuration(durationSec: number) {
  if (!Number.isFinite(durationSec) || durationSec <= 0) return "0 min";
  const roundedMinutes = Math.max(1, Math.round(durationSec / 60));
  return `${roundedMinutes} min`;
}

function getStatusLabel(status: RecordingStatus) {
  if (status === "ready_for_ai") return "Ready";
  if (status === "uploading") return "Uploading";
  if (status === "upload_failed") return "Upload failed";
  return status;
}

function getSourceIcon(sourceType: RecordingSourceType): keyof typeof MaterialIcons.glyphMap {
  if (sourceType === "recorded") return "keyboard-voice";
  if (sourceType === "imported_audio") return "audiotrack";
  return "description";
}

function getStatusChipColors(status: RecordingStatus, isDark: boolean) {
  if (status === "ready_for_ai") {
    return {
      backgroundColor: isDark ? "rgba(34,197,94,0.22)" : "rgba(34,197,94,0.14)",
      textColor: isDark ? "#86efac" : "#166534",
    };
  }
  if (status === "upload_failed") {
    return {
      backgroundColor: isDark ? "rgba(239,68,68,0.22)" : "rgba(239,68,68,0.14)",
      textColor: isDark ? "#fca5a5" : "#991b1b",
    };
  }
  return {
    backgroundColor: isDark ? "rgba(250,204,21,0.2)" : "rgba(250,204,21,0.14)",
    textColor: isDark ? "#fde68a" : "#92400e",
  };
}

export default function HomeScreen() {
  const router = useRouter();
  const { guardedNavigate } = usePaywallGuard();
  const colorScheme = useColorScheme();
  const insets = useSafeAreaInsets();

  const [recentNotes, setRecentNotes] = useState<HomeRecentNote[]>([]);
  const [isLoadingRecentNotes, setIsLoadingRecentNotes] = useState(false);
  const [recentNotesError, setRecentNotesError] = useState<string | null>(null);

  const isDark = colorScheme === "dark";
  const palette = Colors[colorScheme ?? "light"];

  const isMountedRef = useRef(true);
  const requestIdRef = useRef(0);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const loadRecentNotes = useCallback(async () => {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;

    setIsLoadingRecentNotes(true);
    setRecentNotesError(null);

    try {
      const notes = await fetchRecentNotes(5);
      if (!isMountedRef.current || requestId !== requestIdRef.current) return;
      setRecentNotes(notes);
    } catch (error) {
      if (!isMountedRef.current || requestId !== requestIdRef.current) return;
      const message = error instanceof Error ? error.message : "Failed to load recent notes.";
      setRecentNotesError(message);
    } finally {
      if (!isMountedRef.current || requestId !== requestIdRef.current) return;
      setIsLoadingRecentNotes(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadRecentNotes();
      return () => {};
    }, [loadRecentNotes]),
  );

  return (
    <View style={[styles.container, { backgroundColor: palette.background }]}>
      <StatusBar style={isDark ? "light" : "dark"} />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{
          paddingTop: insets.top + 8,
          paddingBottom: insets.bottom + 80,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          <AppUserHeader isDark={isDark} palette={palette} />

          <View style={styles.actionGrid}>
            <TouchableOpacity
              activeOpacity={0.9}
              style={styles.recordCard}
              onPress={() => guardedNavigate("/record")}
            >
              <View style={styles.recordGlow} />
              <View style={styles.cardBody}>
                <View style={styles.recordIconWrap}>
                  <MaterialIcons name="keyboard-voice" size={22} color="#fff" />
                </View>
                <View>
                  <Text style={styles.recordTitle}>Record Notes</Text>
                  <Text style={styles.recordSubtitle}>AI Transcription Ready</Text>
                </View>
                <View style={styles.recordPill}>
                  <Text style={styles.recordPillText}>Tap to start</Text>
                  <MaterialIcons name="arrow-forward" size={12} color="#fff" />
                </View>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.9}
              style={[
                styles.prepCard,
                {
                  backgroundColor: isDark ? "#1E1E24" : "#f3f4f6",
                  borderColor: isDark ? "rgba(255,255,255,0.05)" : "#e5e7eb",
                },
              ]}
              onPress={() => router.push("/(tabs)/tutor")}
            >
              <View style={styles.prepGlow} />
              <View style={styles.cardBody}>
                <View style={styles.prepIconWrap}>
                  <MaterialIcons name="school" size={21} color="#5b13ec" />
                </View>
                <View>
                  <Text style={[styles.prepTitle, { color: palette.text }]}>Oral Prep</Text>
                  <Text style={[styles.prepSubtitle, { color: palette.mutedText }]}>
                    Practice with AI Tutor
                  </Text>
                </View>
                <View
                  style={[
                    styles.prepPill,
                    {
                      backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "#e5e7eb",
                    },
                  ]}
                >
                  <Text style={[styles.prepPillText, { color: palette.mutedText }]}>
                    Resume
                  </Text>
                  <MaterialIcons
                    name="play-arrow"
                    size={12}
                    color={palette.mutedText}
                  />
                </View>
              </View>
            </TouchableOpacity>
          </View>

          <View style={styles.recentNotesHeader}>
            <Text style={[styles.recentNotesTitle, { color: palette.text }]}>
              Recent Notes
            </Text>
          </View>

          {isLoadingRecentNotes ? (
            <View
              style={[
                styles.infoCard,
                {
                  backgroundColor: isDark ? "#1E1E24" : "#f3f4f6",
                  borderColor: isDark ? "rgba(255,255,255,0.05)" : "#e5e7eb",
                },
              ]}
            >
              <ActivityIndicator size="small" color={palette.primary} />
              <Text style={[styles.infoCardText, { color: palette.mutedText }]}>
                Loading recent notes...
              </Text>
            </View>
          ) : null}

          {!isLoadingRecentNotes && recentNotesError ? (
            <View
              style={[
                styles.infoCard,
                {
                  backgroundColor: isDark ? "#1E1E24" : "#f3f4f6",
                  borderColor: isDark ? "rgba(255,255,255,0.05)" : "#e5e7eb",
                },
              ]}
            >
              <View style={styles.infoTextWrap}>
                <Text style={[styles.infoTitle, { color: palette.text }]}>
                  Failed to load recent notes
                </Text>
                <Text style={[styles.infoCardText, { color: palette.mutedText }]}>
                  {recentNotesError}
                </Text>
              </View>
              <TouchableOpacity
                activeOpacity={0.9}
                style={styles.retryAction}
                onPress={() => void loadRecentNotes()}
              >
                <Text style={styles.emptyActionText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {!isLoadingRecentNotes && !recentNotesError && recentNotes.length === 0 ? (
            <View
              style={[
                styles.emptyNotesCard,
                {
                  backgroundColor: isDark ? "#1E1E24" : "#f3f4f6",
                  borderColor: isDark ? "rgba(255,255,255,0.05)" : "#e5e7eb",
                },
              ]}
            >
              <View style={styles.emptyIconWrap}>
                <MaterialIcons name="mic-none" size={18} color="#5b13ec" />
              </View>
              <View style={styles.emptyTextWrap}>
                <Text style={[styles.emptyTitle, { color: palette.text }]}>
                  No recent notes yet
                </Text>
                <Text style={[styles.emptySubtitle, { color: palette.mutedText }]}>
                  Start a recording to create your first flight note.
                </Text>
              </View>
              <TouchableOpacity
                activeOpacity={0.9}
                style={styles.emptyAction}
                onPress={() => guardedNavigate("/record")}
              >
                <Text style={styles.emptyActionText}>Record</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {!isLoadingRecentNotes && !recentNotesError && recentNotes.length > 0 ? (
            <View style={styles.notesList}>
              {recentNotes.map((note) => {
                const statusChip = getStatusChipColors(note.status, isDark);
                return (
                  <TouchableOpacity
                    key={note.id}
                    activeOpacity={0.9}
                    style={[
                      styles.noteCard,
                      {
                        backgroundColor: isDark ? "#1E1E24" : "#ffffff",
                        borderColor: isDark ? "rgba(255,255,255,0.05)" : "#e5e7eb",
                      },
                    ]}
                    onPress={() => guardedNavigate(`/summary/${note.id}`)}
                  >
                    <View style={styles.noteIconWrap}>
                      <MaterialIcons
                        name={getSourceIcon(note.sourceType)}
                        size={18}
                        color="#5b13ec"
                      />
                    </View>
                    <View style={styles.noteTextWrap}>
                      <Text numberOfLines={1} style={[styles.noteTitle, { color: palette.text }]}>
                        {note.name}
                      </Text>
                      <Text style={[styles.noteMeta, { color: palette.mutedText }]}>
                        {formatCreatedDate(note.createdAt)} • {formatDuration(note.durationSec)}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.statusChip,
                        { backgroundColor: statusChip.backgroundColor },
                      ]}
                    >
                      <Text style={[styles.statusChipText, { color: statusChip.textColor }]}>
                        {getStatusLabel(note.status)}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
  },
  actionGrid: {
    marginBottom: 30,
    flexDirection: "row",
    gap: 12,
  },
  recordCard: {
    flex: 1,
    minHeight: 170,
    borderRadius: 18,
    overflow: "hidden",
    backgroundColor: "#5b13ec",
    padding: 18,
  },
  recordGlow: {
    position: "absolute",
    top: -20,
    right: -20,
    width: 100,
    height: 100,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.14)",
  },
  prepCard: {
    flex: 1,
    minHeight: 170,
    borderRadius: 18,
    overflow: "hidden",
    padding: 18,
    borderWidth: 1,
  },
  prepGlow: {
    position: "absolute",
    right: -20,
    bottom: -20,
    width: 100,
    height: 100,
    borderRadius: 999,
    backgroundColor: "rgba(91,19,236,0.08)",
  },
  cardBody: {
    flex: 1,
    justifyContent: "space-between",
  },
  recordIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  prepIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(91,19,236,0.1)",
  },
  recordTitle: {
    color: "#fff",
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "700",
    marginBottom: 2,
  },
  recordSubtitle: {
    color: "rgba(255,255,255,0.72)",
    fontSize: 12,
    lineHeight: 17,
  },
  prepTitle: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "700",
    marginBottom: 2,
  },
  prepSubtitle: {
    fontSize: 12,
    lineHeight: 17,
  },
  recordPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-start",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  recordPillText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "600",
  },
  prepPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-start",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  prepPillText: {
    fontSize: 10,
    fontWeight: "600",
  },
  recentNotesHeader: {
    marginBottom: 12,
  },
  recentNotesTitle: {
    fontSize: 32,
    lineHeight: 36,
    fontWeight: "700",
  },
  infoCard: {
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
  },
  infoTextWrap: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "600",
    marginBottom: 2,
  },
  infoCardText: {
    fontSize: 12,
    lineHeight: 16,
  },
  retryAction: {
    height: 28,
    borderRadius: 999,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#5b13ec",
  },
  notesList: {
    gap: 10,
  },
  noteCard: {
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  noteIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(91,19,236,0.14)",
  },
  noteTextWrap: {
    flex: 1,
  },
  noteTitle: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "600",
    marginBottom: 2,
  },
  noteMeta: {
    fontSize: 12,
    lineHeight: 16,
  },
  statusChip: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  statusChipText: {
    fontSize: 10,
    lineHeight: 12,
    fontWeight: "700",
  },
  emptyNotesCard: {
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
  },
  emptyIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(91,19,236,0.14)",
  },
  emptyTextWrap: {
    flex: 1,
  },
  emptyTitle: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "600",
    marginBottom: 2,
  },
  emptySubtitle: {
    fontSize: 12,
    lineHeight: 16,
  },
  emptyAction: {
    height: 28,
    borderRadius: 999,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#5b13ec",
  },
  emptyActionText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "600",
  },
});
