import { MaterialIcons } from "@expo/vector-icons";
import * as FileSystem from "expo-file-system/legacy";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Speech from "expo-speech";
import { StatusBar } from "expo-status-bar";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Animated,
    FlatList,
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Colors } from "@/constants/theme";
import { useAuth } from "@/contexts/auth-context";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { supabase } from "@/lib/supabase";
import { saveSession } from "@/services/quiz/learning-sessions-service";
import {
    evaluateOralExamSession,
    sendExaminerMessage,
} from "@/services/quiz/oral-exam-service";
import { getPrebuiltOralQuestions } from "@/services/quiz/prebuilt-assessments-service";
import type { RecorderSession } from "@/services/recorder/audio-recorder";
import {
    cleanupRecording,
    requestMicPermission,
    startRecording,
    stopRecording,
} from "@/services/recorder/audio-recorder";
import type { AssessmentSourceMode } from "@/types/assessment";
import type { ChatMessage, OralExamEvaluation } from "@/types/oral-exam";

const TOTAL_QUESTIONS = 6;

let messageIdCounter = 0;
function nextMessageId() {
  return `msg_${Date.now()}_${++messageIdCounter}`;
}

export default function OralExamScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    category?: string;
    topic?: string;
    sourceMode?: AssessmentSourceMode;
    noteIds?: string;
    targetCategory?: string;
    prebuiltSetId?: string;
    questionCount?: string;
  }>();
  const sourceMode: AssessmentSourceMode = params.sourceMode === "notes_ai" ? "notes_ai" : "prebuilt";
  const category = params.targetCategory || params.category || "PPL";
  const topic = params.topic || "";
  const prebuiltSetId = params.prebuiltSetId || "";
  const noteIds = (params.noteIds || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  const requestedQuestionCount = Number(params.questionCount) || TOTAL_QUESTIONS;
  const colorScheme = useColorScheme();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const isDark = colorScheme === "dark";
  const palette = Colors[colorScheme === "dark" ? "dark" : "light"];

  // ── State ──────────────────────────────────────────────────────
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [questionCount, setQuestionCount] = useState(0);
  const [startTime] = useState(Date.now());
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [showTextInput, setShowTextInput] = useState(false);

  const flatListRef = useRef<FlatList>(null);
  const recordingSessionRef = useRef<RecorderSession | null>(null);
  const recordingStartTimeRef = useRef<number>(0);
  const prebuiltQuestions = useMemo(
    () =>
      sourceMode === "prebuilt"
        ? getPrebuiltOralQuestions({
            category,
            prebuiltSetId: prebuiltSetId || undefined,
            topic: topic || undefined,
            count: requestedQuestionCount,
          })
        : [],
    [category, prebuiltSetId, requestedQuestionCount, sourceMode, topic],
  );
  const totalQuestions =
    sourceMode === "prebuilt"
      ? Math.max(1, prebuiltQuestions.length || requestedQuestionCount)
      : requestedQuestionCount;

  const speak = useCallback(async (text: string) => {
    if (!ttsEnabled) return;
    try {
      const ExpoAv = require("expo-av") as { Audio?: { setAudioModeAsync: (opts: Record<string, boolean>) => Promise<void> } };
      if (ExpoAv.Audio) {
        await ExpoAv.Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          playsInSilentModeIOS: true,
        });
      }
    } catch { /* expo-av not available, TTS may still work */ }

    Speech.speak(text, {
      language: "en-US",
      rate: 0.9,
      pitch: 1.0,
    });
  }, [ttsEnabled]);

  // Waveform animation values
  const waveAnims = useRef(
    Array.from({ length: 10 }, () => new Animated.Value(8)),
  ).current;

  // ── Start exam on mount ────────────────────────────────────────
  useEffect(() => {
    if (sourceMode === "prebuilt") {
      const firstQuestion = prebuiltQuestions[0];
      if (!firstQuestion) return;
      const examinerMsg: ChatMessage = {
        id: nextMessageId(),
        role: "examiner",
        content: firstQuestion,
        timestamp: Date.now(),
      };
      setMessages([examinerMsg]);
      setQuestionCount(1);
      void speak(firstQuestion);
      return;
    }
    void askExaminer([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Waveform animation ─────────────────────────────────────────
  useEffect(() => {
    if (!isRecording) return;

    const animations = waveAnims.map((anim, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(anim, {
            toValue: 8 + Math.random() * 28,
            duration: 300 + i * 100,
            useNativeDriver: false,
          }),
          Animated.timing(anim, {
            toValue: 8,
            duration: 300 + i * 100,
            useNativeDriver: false,
          }),
        ]),
      ),
    );

    animations.forEach((a) => a.start());
    return () => animations.forEach((a) => a.stop());
  }, [isRecording, waveAnims]);

  // ── Ask examiner ───────────────────────────────────────────────
  const askExaminer = useCallback(
    async (currentMessages: ChatMessage[]) => {
      if (sourceMode === "prebuilt") {
        const asked = currentMessages.filter((item) => item.role === "examiner").length;
        const nextQuestion = prebuiltQuestions[asked];
        if (!nextQuestion) return;
        const examinerMsg: ChatMessage = {
          id: nextMessageId(),
          role: "examiner",
          content: nextQuestion,
          timestamp: Date.now(),
        };
        setMessages((prev) => [...prev, examinerMsg]);
        setQuestionCount((prev) => prev + 1);
        await speak(nextQuestion);
        return;
      }

      setIsLoading(true);
      try {
        const response = await sendExaminerMessage(
          category,
          topic || undefined,
          currentMessages,
          totalQuestions,
          {
            sourceMode,
            noteIds,
            targetCategory: category,
          },
        );

        const examinerMsg: ChatMessage = {
          id: nextMessageId(),
          role: "examiner",
          content: response,
          timestamp: Date.now(),
        };

        setMessages((prev) => [...prev, examinerMsg]);
        setQuestionCount((prev) => prev + 1);

        await speak(response);
      } catch (error) {
        const errMsg =
          error instanceof Error ? error.message : "Failed to get response.";
        Alert.alert("Error", errMsg);
      } finally {
        setIsLoading(false);
      }
    },
    [category, topic, sourceMode, prebuiltQuestions, speak, totalQuestions, noteIds],
  );

  // ── Send student message ───────────────────────────────────────
  const handleSend = useCallback(async () => {
    const text = inputText.trim();
    if (!text || isLoading) return;

    setInputText("");
    setShowTextInput(false);

    const studentMsg: ChatMessage = {
      id: nextMessageId(),
      role: "student",
      content: text,
      timestamp: Date.now(),
    };

    const updatedMessages = [...messages, studentMsg];
    setMessages(updatedMessages);

    // Ask examiner for next question
    await askExaminer(updatedMessages);
  }, [inputText, isLoading, messages, askExaminer]);

  // ── End exam & evaluate ────────────────────────────────────────
  const handleEndExam = useCallback(async () => {
    if (messages.length < 2) {
      Alert.alert("Too Early", "Answer at least one question before ending.");
      return;
    }

    Speech.stop();
    setIsEvaluating(true);

    try {
      const evaluation: OralExamEvaluation = await evaluateOralExamSession(
        category,
        topic || undefined,
        messages,
        {
          sourceMode,
          noteIds,
          targetCategory: category,
        },
      );

      const timeTaken = Math.round((Date.now() - startTime) / 1000);

      // Save session
      if (user) {
        try {
          await saveSession({
            user_id: user.id,
            mode: "oral_exam",
            category,
            topic: topic || null,
            score: evaluation.score,
            total: evaluation.total,
            percentage: evaluation.percentage,
            time_taken_seconds: timeTaken,
            strengths: evaluation.strengths.map((s) => ({
              topic: s.topic,
              correct: Math.round((s.percentage / 100) * evaluation.total),
              total: evaluation.total,
              percentage: s.percentage,
            })),
            weaknesses: evaluation.weaknesses.map((w) => ({
              topic: w.topic,
              correct: Math.round((w.percentage / 100) * evaluation.total),
              total: evaluation.total,
              percentage: w.percentage,
            })),
          });
        } catch (saveError) {
          console.error("Failed to save oral exam session:", saveError);
        }
      }

      // Navigate to results
      router.replace({
        pathname: "/quiz-results",
        params: {
          score: String(evaluation.score),
          total: String(evaluation.total),
          percentage: String(evaluation.percentage),
          timeTaken: String(timeTaken),
          strengths: JSON.stringify(evaluation.strengths),
          weaknesses: JSON.stringify(evaluation.weaknesses),
          category,
          topic,
          mode: "oral_exam",
          sourceMode,
          prebuiltSetId,
          noteIds: noteIds.join(","),
          feedback: evaluation.feedback,
        },
      });
    } catch (error) {
      const errMsg =
        error instanceof Error ? error.message : "Failed to evaluate.";
      Alert.alert("Error", errMsg);
    } finally {
      setIsEvaluating(false);
    }
  }, [messages, category, topic, startTime, user, router, sourceMode, prebuiltSetId, noteIds]);

  // ── Close / back ───────────────────────────────────────────────
  const handleClose = useCallback(() => {
    Speech.stop();
    Alert.alert(
      "End Session?",
      "Your progress will be lost if you leave without ending the exam.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "End & Evaluate",
          onPress: () => void handleEndExam(),
        },
        {
          text: "Leave",
          style: "destructive",
          onPress: () => router.back(),
        },
      ],
    );
  }, [handleEndExam, router]);

  // ── TTS toggle ─────────────────────────────────────────────────
  const toggleTts = useCallback(() => {
    if (ttsEnabled) {
      Speech.stop();
    }
    setTtsEnabled((prev) => !prev);
  }, [ttsEnabled]);

  // ── Mic press — start/stop recording + transcribe ──────────────
  const handleMicPress = useCallback(async () => {
    if (isLoading || isTranscribing) return;

    if (isRecording && recordingSessionRef.current) {
      // Stop recording + transcribe
      setIsRecording(false);
      setIsTranscribing(true);

      try {
        const elapsed = Date.now() - recordingStartTimeRef.current;
        const draft = await stopRecording(recordingSessionRef.current, elapsed);
        recordingSessionRef.current = null;

        // Read the recorded file as base64
        const base64Audio = await FileSystem.readAsStringAsync(draft.fileUri, {
          encoding: FileSystem.EncodingType.Base64,
        });

        // Clean up the recording file
        await cleanupRecording(draft.fileUri);

        // Reset audio mode back to playback after recording
        try {
          const ExpoAv = require("expo-av") as { Audio?: { setAudioModeAsync: (opts: Record<string, boolean>) => Promise<void> } };
          if (ExpoAv.Audio) {
            await ExpoAv.Audio.setAudioModeAsync({
              allowsRecordingIOS: false,
              playsInSilentModeIOS: true,
            });
          }
        } catch { /* ignore */ }

        // Call the ai-stt Edge Function with base64 JSON
        const { data, error } = await supabase.functions.invoke<{ transcript?: string; error?: string }>(
          "ai-stt",
          {
            body: {
              audio: base64Audio,
              mimeType: "audio/m4a",
              fileName: "recording.m4a",
            },
          },
        );

        if (error) {
          throw new Error(error.message || "Transcription failed.");
        }

        if (!data?.transcript) {
          throw new Error(data?.error || "Empty transcription.");
        }

        // Auto-send the transcribed text as a student message
        const transcript = data.transcript.trim();
        const studentMsg: ChatMessage = {
          id: nextMessageId(),
          role: "student",
          content: transcript,
          timestamp: Date.now(),
        };

        const updatedMessages = [...messages, studentMsg];
        setMessages(updatedMessages);
        setIsTranscribing(false);

        // Ask examiner for next question
        await askExaminer(updatedMessages);
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : "Recording failed.";
        Alert.alert("Transcription Error", errMsg);
      } finally {
        setIsTranscribing(false);
      }
    } else {
      // Start recording
      try {
        const permission = await requestMicPermission(true);
        if (!permission.granted) {
          Alert.alert(
            "Microphone Permission",
            "Please enable microphone access in Settings to use voice input.",
          );
          return;
        }

        // Stop TTS while recording
        Speech.stop();

        const session = await startRecording();
        recordingSessionRef.current = session;
        recordingStartTimeRef.current = Date.now();
        setIsRecording(true);
        setShowTextInput(false);
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : "Failed to start recording.";
        Alert.alert("Recording Error", errMsg);
      }
    }
  }, [isLoading, isTranscribing, isRecording, messages, askExaminer]);

  // ── Render message bubble ──────────────────────────────────────
  const renderMessage = useCallback(
    ({ item }: { item: ChatMessage }) => {
      const isExaminer = item.role === "examiner";

      return (
        <View
          style={[
            styles.messageRow,
            isExaminer ? styles.examinerRow : styles.studentRow,
          ]}
        >
          {isExaminer && (
            <View style={styles.examinerAvatar}>
              <MaterialIcons name="flight-takeoff" size={16} color="#5b13ec" />
            </View>
          )}
          <View style={styles.messageBubbleWrap}>
            <Text
              style={[
                styles.roleLabel,
                isExaminer
                  ? { color: palette.mutedText }
                  : { color: "#5b13ec", textAlign: "right" },
              ]}
            >
              {isExaminer ? "Examiner AI" : "You"}
            </Text>
            <View
              style={[
                styles.messageBubble,
                isExaminer
                  ? [
                      styles.examinerBubble,
                      {
                        backgroundColor: isDark
                          ? "rgba(91,19,236,0.1)"
                          : "#ffffff",
                        borderColor: isDark
                          ? "rgba(91,19,236,0.2)"
                          : "#e5e7eb",
                      },
                    ]
                  : styles.studentBubble,
              ]}
            >
              <Text
                style={[
                  styles.messageText,
                  isExaminer ? { color: palette.text } : { color: "#ffffff" },
                ]}
              >
                {item.content}
              </Text>
            </View>
          </View>
        </View>
      );
    },
    [isDark, palette],
  );

  // ── Scroll to bottom on new messages ───────────────────────────
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length]);

  // ── Loading / Evaluating overlay ───────────────────────────────
  if (isEvaluating) {
    return (
      <View
        style={[
          styles.container,
          styles.center,
          { backgroundColor: palette.background },
        ]}
      >
        <StatusBar style={isDark ? "light" : "dark"} />
        <ActivityIndicator size="large" color="#5b13ec" />
        <Text style={[styles.loadingText, { color: palette.mutedText }]}>
          Evaluating your performance…
        </Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: palette.background }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={0}
    >
      <StatusBar style={isDark ? "light" : "dark"} />

      {/* ── Header ── */}
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + 8,
            backgroundColor: isDark
              ? "rgba(22,16,34,0.8)"
              : "rgba(246,246,248,0.8)",
            borderBottomColor: "rgba(91,19,236,0.1)",
          },
        ]}
      >
        <TouchableOpacity
          onPress={handleClose}
          style={styles.headerBackButton}
          activeOpacity={0.7}
        >
          <MaterialIcons name="chevron-left" size={28} color="#5b13ec" />
          <Text style={styles.headerBackText}>Back</Text>
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: palette.text }]}>
            AI Oral Exam
          </Text>
          <Text style={styles.headerCategory}>
            {topic ? `${category} · ${topic}` : category}
          </Text>
        </View>

        <TouchableOpacity
          onPress={() => {
            Alert.alert(
              "End Session?",
              "This will evaluate your answers and show your results.",
              [
                { text: "Cancel", style: "cancel" },
                {
                  text: "End & Evaluate",
                  style: "destructive",
                  onPress: () => void handleEndExam(),
                },
              ],
            );
          }}
          activeOpacity={0.7}
        >
          <Text style={styles.endSessionText}>End Session</Text>
        </TouchableOpacity>
      </View>

      {/* ── Messages ── */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderMessage}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 16,
          paddingBottom: 200,
        }}
        showsVerticalScrollIndicator={false}
        ListFooterComponent={
          isLoading ? (
            <View style={[styles.messageRow, styles.examinerRow]}>
              <View style={styles.examinerAvatar}>
                <MaterialIcons
                  name="flight-takeoff"
                  size={16}
                  color="#5b13ec"
                />
              </View>
              <View style={styles.messageBubbleWrap}>
                <Text style={[styles.roleLabel, { color: palette.mutedText }]}>
                  Examiner AI
                </Text>
                <View
                  style={[
                    styles.messageBubble,
                    styles.examinerBubble,
                    {
                      backgroundColor: isDark
                        ? "rgba(91,19,236,0.1)"
                        : "#ffffff",
                      borderColor: isDark
                        ? "rgba(91,19,236,0.2)"
                        : "#e5e7eb",
                    },
                  ]}
                >
                  <View style={styles.typingIndicator}>
                    <View style={styles.typingDot} />
                    <View style={[styles.typingDot, { opacity: 0.7 }]} />
                    <View style={[styles.typingDot, { opacity: 0.4 }]} />
                  </View>
                </View>
              </View>
            </View>
          ) : null
        }
      />

      {/* ── Bottom Input Area ── */}
      <View
        style={[
          styles.bottomBar,
          {
            paddingBottom: insets.bottom + 12,
            backgroundColor: isDark ? "rgba(31,22,49,0.95)" : "#ffffff",
            borderTopColor: isDark
              ? "rgba(91,19,236,0.2)"
              : "rgba(91,19,236,0.1)",
          },
        ]}
      >
        {/* Drag handle */}
        <View style={styles.dragHandle}>
          <View
            style={[
              styles.dragBar,
              {
                backgroundColor: isDark
                  ? "rgba(255,255,255,0.15)"
                  : "#d1d5db",
              },
            ]}
          />
        </View>

        {/* Waveform (shown while recording) */}
        {isRecording && (
          <View style={styles.waveformContainer}>
            {waveAnims.map((anim, i) => (
              <Animated.View
                key={i}
                style={[
                  styles.waveformBar,
                  {
                    height: anim,
                  },
                ]}
              />
            ))}
          </View>
        )}

        {/* Text input (shown when keyboard mode) */}
        {showTextInput && !isRecording && (
          <View style={styles.textInputRow}>
            <TextInput
              style={[
                styles.textInput,
                {
                  backgroundColor: isDark
                    ? "rgba(255,255,255,0.05)"
                    : "#f3f4f6",
                  color: palette.text,
                  borderColor: isDark
                    ? "rgba(91,19,236,0.3)"
                    : "rgba(91,19,236,0.15)",
                },
              ]}
              placeholder="Type your answer..."
              placeholderTextColor={palette.mutedText}
              value={inputText}
              onChangeText={setInputText}
              multiline
              maxLength={2000}
              editable={!isLoading}
              returnKeyType="send"
              onSubmitEditing={() => void handleSend()}
            />
            <TouchableOpacity
              onPress={() => void handleSend()}
              disabled={!inputText.trim() || isLoading}
              style={[
                styles.sendButton,
                (!inputText.trim() || isLoading) && { opacity: 0.4 },
              ]}
              activeOpacity={0.7}
            >
              <MaterialIcons name="send" size={22} color="#ffffff" />
            </TouchableOpacity>
          </View>
        )}

        {/* Action buttons row */}
        <View style={styles.actionsRow}>
          {/* Keyboard toggle */}
          <TouchableOpacity
            onPress={() => {
              setShowTextInput((prev) => !prev);
              setIsRecording(false);
            }}
            style={[
              styles.actionButton,
              showTextInput && !isRecording && styles.actionButtonActive,
            ]}
            activeOpacity={0.7}
          >
            <MaterialIcons
              name="keyboard"
              size={24}
              color={
                showTextInput && !isRecording
                  ? "#5b13ec"
                  : isDark
                    ? "#94a3b8"
                    : "#64748b"
              }
            />
          </TouchableOpacity>

          {/* Mic button */}
          <View style={styles.micButtonContainer}>
            {isRecording && (
              <>
                <View style={styles.micPulseOuter} />
                <View style={styles.micPulseInner} />
              </>
            )}
            <TouchableOpacity
              onPress={handleMicPress}
              style={[
                styles.micButton,
                isRecording && styles.micButtonRecording,
              ]}
              activeOpacity={0.85}
              disabled={isLoading || isTranscribing}
            >
              <MaterialIcons
                name={isRecording ? "stop" : isTranscribing ? "hourglass-top" : "mic"}
                size={32}
                color="#ffffff"
              />
            </TouchableOpacity>
          </View>

          {/* TTS toggle + question counter */}
          <View style={styles.rightActionCol}>
            <TouchableOpacity
              onPress={toggleTts}
              style={[
                styles.actionButton,
                ttsEnabled && styles.actionButtonActive,
              ]}
              activeOpacity={0.7}
            >
              <MaterialIcons
                name={ttsEnabled ? "volume-up" : "volume-off"}
                size={24}
                color={
                  ttsEnabled ? "#5b13ec" : isDark ? "#94a3b8" : "#64748b"
                }
              />
            </TouchableOpacity>
            <Text style={[styles.questionCounter, { color: "#5b13ec" }]}>
              Q{questionCount}/{totalQuestions}
            </Text>
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

// ── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    fontSize: 14,
    marginTop: 16,
    fontWeight: "500",
  },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  headerBackButton: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerBackText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#5b13ec",
    marginLeft: -2,
  },
  headerCenter: {
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: "700",
  },
  headerCategory: {
    fontSize: 10,
    fontWeight: "800",
    color: "#5b13ec",
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginTop: 2,
  },
  endSessionText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#ef4444",
  },

  // Messages
  messageRow: {
    flexDirection: "row",
    marginBottom: 20,
    maxWidth: "85%",
  },
  examinerRow: {
    alignSelf: "flex-start",
    alignItems: "flex-start",
  },
  studentRow: {
    alignSelf: "flex-end",
    justifyContent: "flex-end",
  },
  examinerAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(91,19,236,0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
    marginTop: 18,
    borderWidth: 1,
    borderColor: "rgba(91,19,236,0.3)",
  },
  messageBubbleWrap: {
    flex: 1,
  },
  roleLabel: {
    fontSize: 11,
    fontWeight: "600",
    marginBottom: 4,
    marginLeft: 4,
  },
  messageBubble: {
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  examinerBubble: {
    borderTopLeftRadius: 4,
    borderWidth: 1,
  },
  studentBubble: {
    backgroundColor: "#5b13ec",
    borderTopRightRadius: 4,
    shadowColor: "#5b13ec",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
  },
  typingIndicator: {
    flexDirection: "row",
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  typingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#5b13ec",
  },

  // Bottom bar
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: 1,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 10,
  },
  dragHandle: {
    alignItems: "center",
    paddingTop: 8,
    paddingBottom: 4,
  },
  dragBar: {
    width: 48,
    height: 5,
    borderRadius: 999,
  },

  // Waveform
  waveformContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
    height: 48,
    marginBottom: 8,
    paddingHorizontal: 24,
  },
  waveformBar: {
    width: 4,
    backgroundColor: "#5b13ec",
    borderRadius: 999,
    shadowColor: "#5b13ec",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 3,
  },

  // Text input
  textInputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    paddingHorizontal: 16,
    marginBottom: 12,
    marginTop: 4,
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 10,
    maxHeight: 100,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#5b13ec",
    alignItems: "center",
    justifyContent: "center",
  },

  // Actions row
  actionsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 32,
    paddingTop: 8,
    paddingBottom: 8,
  },
  actionButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  actionButtonActive: {
    backgroundColor: "rgba(91,19,236,0.1)",
  },

  // Mic button
  micButtonContainer: {
    alignItems: "center",
    justifyContent: "center",
    width: 80,
    height: 80,
  },
  micPulseOuter: {
    position: "absolute",
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "rgba(91,19,236,0.15)",
  },
  micPulseInner: {
    position: "absolute",
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: "rgba(91,19,236,0.25)",
  },
  micButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#5b13ec",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#5b13ec",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 8,
  },
  micButtonRecording: {
    backgroundColor: "#ef4444",
    shadowColor: "#ef4444",
  },

  // Right action column
  rightActionCol: {
    alignItems: "center",
    gap: 2,
  },
  questionCounter: {
    fontSize: 10,
    fontWeight: "700",
  },
});
