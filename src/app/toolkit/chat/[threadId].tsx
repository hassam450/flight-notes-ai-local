import { MaterialIcons } from "@expo/vector-icons";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import {
  fetchAssessmentNotes,
  type AssessmentNote,
} from "@/services/notes/assessment-notes-service";
import {
  getThreadMessages,
  listThreads,
  streamAssistantReply,
} from "@/services/toolkit/aviation-chat-service";
import type {
  AviationChatMessage,
  AviationChatSourceMode,
  AviationChatThread,
} from "@/types/aviation-chat";

const MAX_NOTE_SELECTION = 5;

type DraftAssistantMessage = {
  id: string;
  threadId: string;
  role: "assistant";
  content: string;
  createdAt: string;
};

function makeLocalId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function toIsoNow() {
  return new Date().toISOString();
}

export default function ToolkitChatScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ threadId?: string }>();
  const threadId = params.threadId?.toString() ?? "";
  const colorScheme = useColorScheme();
  const insets = useSafeAreaInsets();
  const isDark = colorScheme === "dark";
  const palette = Colors[colorScheme ?? "light"];

  const [thread, setThread] = useState<AviationChatThread | null>(null);
  const [messages, setMessages] = useState<AviationChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [assistantDraft, setAssistantDraft] = useState("");
  const [sourceMode, setSourceMode] = useState<AviationChatSourceMode>("general");
  const [notes, setNotes] = useState<AssessmentNote[]>([]);
  const [selectedNoteIds, setSelectedNoteIds] = useState<string[]>([]);
  const [notesModalVisible, setNotesModalVisible] = useState(false);
  const [notesLoading, setNotesLoading] = useState(false);

  const flatListRef = useRef<FlatList<AviationChatMessage | DraftAssistantMessage>>(null);

  const scrollToBottom = useCallback((animated = true) => {
    const run = () => {
      const list = flatListRef.current;
      if (!list) return;
      // In an inverted list, offset 0 is the visual bottom (latest message).
      list.scrollToOffset({ offset: 0, animated });
      try {
        list.scrollToIndex({ index: 0, animated: false });
      } catch {
        // Index may not be measurable yet; offset call above is the primary behavior.
      }
    };

    requestAnimationFrame(run);
    setTimeout(run, 50);
    setTimeout(run, 140);
  }, []);

  const loadChatState = useCallback(async (options?: { showLoader?: boolean }) => {
    if (!threadId) return;

    const showLoader = options?.showLoader ?? true;
    if (showLoader) {
      setLoading(true);
    }
    try {
      const [allThreads, chatMessages] = await Promise.all([
        listThreads(100),
        getThreadMessages(threadId, 200, 0),
      ]);

      const found = allThreads.find((item) => item.id === threadId) ?? null;
      setThread(found);
      setMessages(chatMessages);
      if (found) {
        setSourceMode(found.sourceMode);
      }
    } catch (error) {
      Alert.alert("Error", error instanceof Error ? error.message : "Failed to load chat.");
    } finally {
      if (showLoader) {
        setLoading(false);
      }
    }
  }, [threadId]);

  useFocusEffect(
    useCallback(() => {
      void loadChatState({ showLoader: true });
    }, [loadChatState]),
  );

  useEffect(() => {
    if (loading) return;
    scrollToBottom(false);
  }, [loading, threadId, scrollToBottom]);

  useEffect(() => {
    if (loading) return;
    scrollToBottom(true);
  }, [messages.length, assistantDraft.length, loading, scrollToBottom]);

  const openNotesModal = async () => {
    setNotesModalVisible(true);
    if (notes.length > 0) return;

    setNotesLoading(true);
    try {
      const rows = await fetchAssessmentNotes(50);
      setNotes(rows);
    } catch (error) {
      Alert.alert("Error", error instanceof Error ? error.message : "Failed to load notes.");
    } finally {
      setNotesLoading(false);
    }
  };

  const toggleNote = (noteId: string) => {
    setSelectedNoteIds((prev) => {
      if (prev.includes(noteId)) {
        return prev.filter((id) => id !== noteId);
      }
      if (prev.length >= MAX_NOTE_SELECTION) {
        return prev;
      }
      return [...prev, noteId];
    });
  };

  const combinedMessages = useMemo(() => {
    const ordered = [...messages];
    if (!assistantDraft.trim()) return ordered.reverse();

    return [
      ...ordered,
      {
        id: "assistant_draft",
        threadId,
        role: "assistant" as const,
        content: assistantDraft,
        createdAt: toIsoNow(),
      },
    ].reverse();
  }, [messages, assistantDraft, threadId]);

  const sendMessage = async () => {
    const trimmed = input.trim();
    if (!trimmed || isStreaming || !threadId) return;

    if (sourceMode === "notes_ai" && selectedNoteIds.length === 0) {
      Alert.alert("Select Notes", "Choose at least one note to use Notes AI mode.");
      return;
    }

    const optimisticUser: AviationChatMessage = {
      id: makeLocalId("user"),
      threadId,
      role: "user",
      content: trimmed,
      createdAt: toIsoNow(),
      model: null,
      tokenUsage: null,
      contextMeta: null,
    };

    setInput("");
    setMessages((prev) => [...prev, optimisticUser]);
    scrollToBottom(false);
    setIsStreaming(true);
    setAssistantDraft("");
    let streamedText = "";

    try {
      await streamAssistantReply(
        {
          threadId,
          message: trimmed,
          sourceMode,
          noteIds: sourceMode === "notes_ai" ? selectedNoteIds : undefined,
          targetCategory: thread?.targetCategory ?? thread?.category,
          category: thread?.category,
        },
        {
          onDelta: (delta) => {
            streamedText += delta;
            setAssistantDraft((prev) => `${prev}${delta}`);
            scrollToBottom(false);
          },
          onError: (errorMessage) => {
            Alert.alert("Streaming Error", errorMessage);
          },
        },
      );

      const finalAssistant = streamedText.trim();
      if (finalAssistant) {
        setMessages((prev) => [
          ...prev,
          {
            id: makeLocalId("assistant"),
            threadId,
            role: "assistant",
            content: finalAssistant,
            createdAt: toIsoNow(),
            model: null,
            tokenUsage: null,
            contextMeta: null,
          },
        ]);
      }
      setAssistantDraft("");
      await loadChatState({ showLoader: false });
    } catch (error) {
      Alert.alert("Error", error instanceof Error ? error.message : "Failed to send message.");
    } finally {
      setIsStreaming(false);
    }
  };

  const renderItem = ({ item }: { item: AviationChatMessage | DraftAssistantMessage }) => {
    const isUser = item.role === "user";

    return (
      <View style={[styles.messageWrap, isUser ? styles.userWrap : styles.assistantWrap]}>
        {!isUser ? (
          <View style={styles.assistantLabelRow}>
            <View style={styles.botBadge}>
              <MaterialIcons name="smart-toy" size={12} color="#5b13ec" />
            </View>
            <Text style={[styles.assistantLabel, { color: palette.mutedText }]}>CFI ASSISTANT</Text>
          </View>
        ) : null}

        <View
          style={[
            styles.messageBubble,
            isUser
              ? styles.userBubble
              : {
                  backgroundColor: isDark ? "#2a2a35" : "#eceef5",
                },
          ]}
        >
          <Text style={[styles.messageText, { color: isUser ? "#fff" : palette.text }]}>{item.content}</Text>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: isDark ? "#0f0a1a" : palette.background }]}> 
      <StatusBar style={isDark ? "light" : "dark"} />

      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + 8,
            borderBottomColor: "rgba(255,255,255,0.08)",
            backgroundColor: isDark ? "rgba(15,10,26,0.85)" : "rgba(255,255,255,0.85)",
          },
        ]}
      >
        <TouchableOpacity style={styles.headerButton} onPress={() => router.back()} activeOpacity={0.8}>
          <MaterialIcons name="chevron-left" size={24} color={isDark ? "#d1d5db" : palette.mutedText} />
        </TouchableOpacity>

        <View style={{ flex: 1, alignItems: "center" }}>
          <Text numberOfLines={1} style={[styles.headerTitle, { color: isDark ? "#fff" : palette.text }]}> 
            {thread?.title || "CFI Assistant"}
          </Text>
          <Text style={styles.headerKicker}>CFI Assistant</Text>
        </View>

        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => {
            if (sourceMode === "general") {
              setSourceMode("notes_ai");
            } else {
              setSourceMode("general");
            }
          }}
          activeOpacity={0.8}
        >
          <MaterialIcons
            name={sourceMode === "notes_ai" ? "description" : "public"}
            size={20}
            color={sourceMode === "notes_ai" ? "#5b13ec" : isDark ? "#d1d5db" : palette.mutedText}
          />
        </TouchableOpacity>
      </View>

      <View style={styles.modeRow}>
        <TouchableOpacity
          onPress={() => setSourceMode("general")}
          style={[
            styles.modeChip,
            {
              borderColor: sourceMode === "general" ? "#5b13ec" : "rgba(255,255,255,0.12)",
              backgroundColor: sourceMode === "general" ? "rgba(91,19,236,0.18)" : "transparent",
            },
          ]}
        >
          <Text style={[styles.modeChipText, { color: sourceMode === "general" ? "#fff" : "#9ca3af" }]}>FAA General</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => {
            setSourceMode("notes_ai");
            void openNotesModal();
          }}
          style={[
            styles.modeChip,
            {
              borderColor: sourceMode === "notes_ai" ? "#5b13ec" : "rgba(255,255,255,0.12)",
              backgroundColor: sourceMode === "notes_ai" ? "rgba(91,19,236,0.18)" : "transparent",
            },
          ]}
        >
          <Text style={[styles.modeChipText, { color: sourceMode === "notes_ai" ? "#fff" : "#9ca3af" }]}>Use My Notes</Text>
        </TouchableOpacity>

        {sourceMode === "notes_ai" ? (
          <TouchableOpacity onPress={() => void openNotesModal()} style={styles.notesCountChip}>
            <Text style={styles.notesCountText}>{selectedNoteIds.length}/{MAX_NOTE_SELECTION}</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {loading ? (
        <View style={styles.centerState}>
          <ActivityIndicator size="small" color="#5b13ec" />
          <Text style={[styles.stateText, { color: isDark ? "#9ca3af" : palette.mutedText }]}>Loading chat...</Text>
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={combinedMessages}
          inverted
          keyExtractor={(item) => item.id}
          contentContainerStyle={{
            paddingHorizontal: 14,
            paddingTop: insets.bottom + 130,
            paddingBottom: 10,
            gap: 12,
          }}
          renderItem={renderItem}
          onContentSizeChange={() => scrollToBottom(false)}
          onLayout={() => scrollToBottom(false)}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyTitle}>Start the conversation</Text>
              <Text style={styles.emptySub}>Ask about FARs, maneuvers, weather, or checkride prep.</Text>
            </View>
          }
        />
      )}

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 80 : 0}
        style={[
          styles.composerWrap,
          {
            paddingBottom: insets.bottom + 10,
            backgroundColor: isDark ? "rgba(15,10,26,0.95)" : "rgba(246,246,248,0.95)",
          },
        ]}
      >
        <View
          style={[
            styles.composer,
            {
              backgroundColor: isDark ? "#1e1c29" : palette.card,
              borderColor: isDark ? "rgba(255,255,255,0.1)" : palette.border,
            },
          ]}
        >
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="Ask about FARs, maneuvers, or regs..."
            placeholderTextColor={isDark ? "#6b7280" : palette.mutedText}
            style={[styles.input, { color: isDark ? "#fff" : palette.text }]}
            multiline
            editable={!isStreaming}
          />

          <TouchableOpacity
            style={[styles.sendButton, { opacity: isStreaming ? 0.7 : 1 }]}
            onPress={() => {
              void sendMessage();
            }}
            disabled={isStreaming}
          >
            {isStreaming ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <MaterialIcons name="send" size={18} color="#fff" />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      <Modal visible={notesModalVisible} transparent animationType="fade" onRequestClose={() => setNotesModalVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: isDark ? "#1a1428" : palette.card, borderColor: palette.border }]}> 
            <Text style={[styles.modalTitle, { color: isDark ? "#fff" : palette.text }]}>Select Notes ({selectedNoteIds.length}/{MAX_NOTE_SELECTION})</Text>

            {notesLoading ? (
              <View style={styles.modalLoadingRow}>
                <ActivityIndicator size="small" color="#5b13ec" />
                <Text style={[styles.modalHint, { color: isDark ? "#9ca3af" : palette.mutedText }]}>Loading notes...</Text>
              </View>
            ) : notes.length === 0 ? (
              <Text style={[styles.modalHint, { color: isDark ? "#9ca3af" : palette.mutedText }]}>No eligible notes found yet.</Text>
            ) : (
              <FlatList
                data={notes}
                keyExtractor={(item) => item.id}
                style={{ maxHeight: 320 }}
                contentContainerStyle={{ gap: 8, paddingVertical: 8 }}
                renderItem={({ item }) => {
                  const selected = selectedNoteIds.includes(item.id);
                  return (
                    <Pressable
                      onPress={() => toggleNote(item.id)}
                      style={[
                        styles.noteItem,
                        {
                          borderColor: selected ? "#5b13ec" : palette.border,
                          backgroundColor: selected ? "rgba(91,19,236,0.15)" : "transparent",
                        },
                      ]}
                    >
                      <View style={{ flex: 1 }}>
                        <Text numberOfLines={1} style={[styles.noteTitle, { color: isDark ? "#fff" : palette.text }]}>
                          {item.name}
                        </Text>
                        <Text style={[styles.noteSub, { color: isDark ? "#9ca3af" : palette.mutedText }]}> 
                          {item.category} • {item.hasSummary ? "Summary" : "Transcript"}
                        </Text>
                      </View>
                      {selected ? <MaterialIcons name="check-circle" size={20} color="#5b13ec" /> : null}
                    </Pressable>
                  );
                }}
              />
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => setNotesModalVisible(false)} style={styles.modalButton}>
                <Text style={[styles.modalButtonText, { color: isDark ? "#9ca3af" : palette.mutedText }]}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingBottom: 10,
    flexDirection: "row",
    alignItems: "center",
  },
  headerButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: "700",
  },
  headerKicker: {
    color: "#5b13ec",
    fontSize: 10,
    marginTop: 3,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  modeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  modeChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  modeChipText: {
    fontSize: 12,
    fontWeight: "700",
  },
  notesCountChip: {
    marginLeft: "auto",
    borderRadius: 999,
    backgroundColor: "rgba(91,19,236,0.2)",
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  notesCountText: {
    color: "#c4b5fd",
    fontSize: 12,
    fontWeight: "700",
  },
  centerState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  stateText: {
    fontSize: 13,
  },
  messageWrap: {
    maxWidth: "88%",
  },
  userWrap: {
    alignSelf: "flex-end",
  },
  assistantWrap: {
    alignSelf: "flex-start",
  },
  assistantLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 5,
    marginLeft: 2,
  },
  botBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(91,19,236,0.16)",
  },
  assistantLabel: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.8,
  },
  messageBubble: {
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  userBubble: {
    backgroundColor: "#5b13ec",
    borderTopRightRadius: 4,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
  },
  emptyWrap: {
    marginTop: 30,
    alignSelf: "center",
    alignItems: "center",
    gap: 5,
  },
  emptyTitle: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
  emptySub: {
    color: "#9ca3af",
    fontSize: 12,
  },
  composerWrap: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 10,
    paddingTop: 8,
  },
  composer: {
    borderWidth: 1,
    borderRadius: 16,
    minHeight: 54,
    maxHeight: 140,
    paddingLeft: 10,
    paddingRight: 6,
    paddingVertical: 6,
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
  },
  input: {
    flex: 1,
    fontSize: 14,
    maxHeight: 90,
    paddingTop: 6,
    paddingBottom: 6,
  },
  sendButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#5b13ec",
    alignItems: "center",
    justifyContent: "center",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  modalCard: {
    width: "100%",
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 8,
  },
  modalLoadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 12,
  },
  modalHint: {
    fontSize: 13,
  },
  noteItem: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  noteTitle: {
    fontSize: 14,
    fontWeight: "600",
  },
  noteSub: {
    marginTop: 2,
    fontSize: 12,
  },
  modalActions: {
    marginTop: 10,
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  modalButton: {
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  modalButtonText: {
    fontSize: 14,
    fontWeight: "700",
  },
});
