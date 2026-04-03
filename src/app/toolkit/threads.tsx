import { MaterialIcons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
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
  createThread,
  deleteThread,
  listThreads,
  renameThread,
} from "@/services/toolkit/aviation-chat-service";
import type { AviationChatThread } from "@/types/aviation-chat";

function formatRelativeLabel(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Just now";

  const diffMs = Date.now() - date.getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "Now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;

  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function ToolkitThreadsScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const insets = useSafeAreaInsets();
  const isDark = colorScheme === "dark";
  const palette = Colors[colorScheme ?? "light"];

  const [threads, setThreads] = useState<AviationChatThread[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [modalVisible, setModalVisible] = useState(false);
  const [draftTitle, setDraftTitle] = useState("");
  const [selectedThread, setSelectedThread] = useState<AviationChatThread | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [creatingThread, setCreatingThread] = useState(false);
  const [deletingThreadId, setDeletingThreadId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const value = query.trim().toLowerCase();
    if (!value) return threads;

    return threads.filter((thread) => {
      return (
        thread.title.toLowerCase().includes(value) ||
        thread.preview.toLowerCase().includes(value)
      );
    });
  }, [threads, query]);

  const loadThreads = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listThreads(50);
      setThreads(data);
    } catch (error) {
      Alert.alert("Error", error instanceof Error ? error.message : "Failed to load threads.");
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadThreads();
    }, [loadThreads]),
  );

  const openRenameModal = (thread: AviationChatThread) => {
    setSelectedThread(thread);
    setDraftTitle(thread.title);
    setModalVisible(true);
  };

  const createAndOpenThread = async () => {
    if (creatingThread) return;

    setCreatingThread(true);
    try {
      const created = await createThread({ category: "PPL", sourceMode: "general" });
      router.push(`/toolkit/chat/${created.id}`);
    } catch (error) {
      Alert.alert("Error", error instanceof Error ? error.message : "Failed to create thread.");
    } finally {
      setCreatingThread(false);
    }
  };

  const submitRename = async () => {
    if (submitting) return;
    const title = draftTitle.trim() || "New Conversation";

    setSubmitting(true);
    try {
      if (!selectedThread) return;
      await renameThread(selectedThread.id, title);
      setModalVisible(false);
      setDraftTitle("");
      setSelectedThread(null);
      await loadThreads();
    } catch (error) {
      Alert.alert("Error", error instanceof Error ? error.message : "Failed to save thread.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = (thread: AviationChatThread) => {
    if (deletingThreadId === thread.id) return;

    Alert.alert(
      "Delete Thread",
      `Delete "${thread.title}"? This hides it from your thread list.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              setDeletingThreadId(thread.id);
              await deleteThread(thread.id);
              await loadThreads();
            } catch (error) {
              Alert.alert("Error", error instanceof Error ? error.message : "Failed to delete thread.");
            } finally {
              setDeletingThreadId((current) => (current === thread.id ? null : current));
            }
          },
        },
      ],
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: palette.background }]}> 
      <StatusBar style={isDark ? "light" : "dark"} />

      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + 8,
            borderBottomColor: isDark ? "rgba(91,19,236,0.15)" : "#e5e7eb",
            backgroundColor: isDark ? "rgba(255,255,255,0.02)" : "rgba(255,255,255,0.7)",
          },
        ]}
      >
        <TouchableOpacity style={styles.headerButton} onPress={() => router.back()} activeOpacity={0.8}>
          <MaterialIcons name="chevron-left" size={24} color={palette.mutedText} />
        </TouchableOpacity>

        <View style={{ flex: 1 }}>
          <Text style={styles.headerKicker}>Toolkit</Text>
          <Text style={[styles.headerTitle, { color: palette.text }]}>CFI Assistant</Text>
        </View>

        <TouchableOpacity style={styles.headerButton} onPress={() => setQuery("")} activeOpacity={0.8}>
          <MaterialIcons name="search" size={20} color={palette.mutedText} />
        </TouchableOpacity>
      </View>

      <View style={styles.searchWrap}>
        <View style={[styles.searchInputWrap, { backgroundColor: palette.card, borderColor: palette.border }]}> 
          <MaterialIcons name="search" size={18} color={palette.mutedText} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search conversations"
            placeholderTextColor={palette.mutedText}
            style={[styles.searchInput, { color: palette.text }]}
          />
        </View>
      </View>

      {loading ? (
        <View style={styles.centerState}>
          <ActivityIndicator size="small" color="#5b13ec" />
          <Text style={[styles.stateText, { color: palette.mutedText }]}>Loading threads...</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingBottom: insets.bottom + 96,
            gap: 10,
          }}
          showsVerticalScrollIndicator={false}
        >
          {filtered.map((thread) => (
            <TouchableOpacity
              key={thread.id}
              onPress={() => {
                if (deletingThreadId === thread.id) return;
                router.push(`/toolkit/chat/${thread.id}`);
              }}
              style={[
                styles.threadCard,
                {
                  backgroundColor: palette.card,
                  borderColor: palette.border,
                },
              ]}
              activeOpacity={0.9}
            >
              <View style={styles.threadTopRow}>
                <Text numberOfLines={1} style={[styles.threadTitle, { color: palette.text }]}>
                  {thread.title}
                </Text>
                <Text style={[styles.threadTime, { color: palette.mutedText }]}> 
                  {formatRelativeLabel(thread.lastMessageAt)}
                </Text>
              </View>

              <Text numberOfLines={2} style={[styles.threadPreview, { color: palette.mutedText }]}> 
                {thread.preview || "No messages yet."}
              </Text>

              <View style={styles.threadActionsRow}>
                <TouchableOpacity
                  onPress={() => openRenameModal(thread)}
                  activeOpacity={0.8}
                  disabled={deletingThreadId === thread.id}
                >
                  <Text style={styles.actionText}>Rename</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleDelete(thread)}
                  activeOpacity={0.8}
                  disabled={deletingThreadId === thread.id}
                  style={styles.deleteAction}
                >
                  {deletingThreadId === thread.id ? (
                    <ActivityIndicator size="small" color="#ef4444" />
                  ) : (
                    <Text style={[styles.actionText, { color: "#ef4444" }]}>Delete</Text>
                  )}
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          ))}

          {!loading && filtered.length === 0 ? (
            <View style={[styles.emptyWrap, { backgroundColor: palette.card, borderColor: palette.border }]}> 
              <Text style={[styles.emptyTitle, { color: palette.text }]}>No conversations</Text>
              <Text style={[styles.emptySub, { color: palette.mutedText }]}>Create a thread to begin chatting with CFI Assistant.</Text>
            </View>
          ) : null}
        </ScrollView>
      )}

      <TouchableOpacity
        style={[styles.fab, { bottom: insets.bottom + 78 }]}
        onPress={() => {
          void createAndOpenThread();
        }}
        activeOpacity={0.85}
        disabled={creatingThread}
      >
        {creatingThread ? (
          <ActivityIndicator size="small" color="#ffffff" />
        ) : (
          <MaterialIcons name="add" size={28} color="#ffffff" />
        )}
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setModalVisible(false);
          setSelectedThread(null);
        }}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: palette.card, borderColor: palette.border }]}>
            <Text style={[styles.modalTitle, { color: palette.text }]}>Rename Thread</Text>
            <TextInput
              value={draftTitle}
              onChangeText={setDraftTitle}
              placeholder="Conversation title"
              placeholderTextColor={palette.mutedText}
              style={[
                styles.modalInput,
                {
                  color: palette.text,
                  borderColor: palette.border,
                  backgroundColor: isDark ? "#1e1c29" : "#f8fafc",
                },
              ]}
              autoFocus
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                onPress={() => {
                  setModalVisible(false);
                  setSelectedThread(null);
                }}
                style={styles.modalButton}
              >
                <Text style={[styles.modalButtonText, { color: palette.mutedText }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  void submitRename();
                }}
                style={[styles.modalButton, styles.modalButtonPrimary]}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={[styles.modalButtonText, { color: "#fff" }]}>Save</Text>
                )}
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
    gap: 8,
  },
  headerButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  headerKicker: {
    color: "#5b13ec",
    fontSize: 10,
    textTransform: "uppercase",
    letterSpacing: 1.2,
    fontWeight: "700",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginTop: 2,
  },
  searchWrap: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchInputWrap: {
    borderWidth: 1,
    borderRadius: 12,
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 8,
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
  threadCard: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
    gap: 8,
    shadowColor: "#000",
    shadowOpacity: 0.14,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  threadTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  threadTitle: {
    fontSize: 16,
    fontWeight: "700",
    flex: 1,
  },
  threadTime: {
    fontSize: 11,
    fontWeight: "600",
  },
  threadPreview: {
    fontSize: 13,
    lineHeight: 18,
  },
  threadActionsRow: {
    marginTop: 4,
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  deleteAction: {
    minWidth: 40,
    minHeight: 18,
    justifyContent: "center",
  },
  actionText: {
    fontSize: 12,
    color: "#5b13ec",
    fontWeight: "600",
  },
  emptyWrap: {
    marginTop: 12,
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: "700",
  },
  emptySub: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 18,
  },
  fab: {
    position: "absolute",
    right: 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#5b13ec",
    shadowColor: "#5b13ec",
    shadowOpacity: 0.4,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 16,
    elevation: 7,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  modalCard: {
    width: "100%",
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 10,
  },
  modalInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  modalActions: {
    marginTop: 14,
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
  },
  modalButton: {
    minWidth: 84,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  modalButtonPrimary: {
    backgroundColor: "#5b13ec",
  },
  modalButtonText: {
    fontSize: 14,
    fontWeight: "700",
  },
});
