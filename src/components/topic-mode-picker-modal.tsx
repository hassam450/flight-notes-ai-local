import { MaterialIcons } from "@expo/vector-icons";
import React from "react";
import {
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";

import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";

type TopicMode = "mcq" | "oral_exam";

type TopicModePickerModalProps = {
  visible: boolean;
  topicLabel: string;
  onClose: () => void;
  onSelect: (mode: TopicMode) => void;
};

export default function TopicModePickerModal({
  visible,
  topicLabel,
  onClose,
  onSelect,
}: TopicModePickerModalProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const palette = Colors[(colorScheme ?? "light") as keyof typeof Colors];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay} />
      </TouchableWithoutFeedback>

      <View
        style={[
          styles.sheet,
          { backgroundColor: isDark ? "#1a1225" : "#ffffff" },
        ]}
      >
        <View
          style={[
            styles.handle,
            { backgroundColor: isDark ? "rgba(255,255,255,0.15)" : "#d1d5db" },
          ]}
        />

        <Text style={[styles.title, { color: palette.text }]}>
          Choose Learning Mode
        </Text>
        <Text style={[styles.subtitle, { color: palette.mutedText }]}>
          {topicLabel}
        </Text>

        <View style={styles.list}>
          <TouchableOpacity
            activeOpacity={0.8}
            style={[
              styles.optionRow,
              {
                backgroundColor: isDark
                  ? "rgba(91,19,236,0.06)"
                  : "rgba(91,19,236,0.04)",
                borderColor: isDark
                  ? "rgba(91,19,236,0.15)"
                  : "rgba(91,19,236,0.1)",
              },
            ]}
            onPress={() => onSelect("mcq")}
          >
            <View style={styles.optionIcon}>
              <MaterialIcons name="quiz" size={22} color="#5b13ec" />
            </View>
            <View style={styles.optionTextWrap}>
              <Text style={[styles.optionTitle, { color: palette.text }]}>MCQ Quiz</Text>
              <Text style={[styles.optionDescription, { color: palette.mutedText }]}>Timed questions with explanations</Text>
            </View>
            <MaterialIcons name="chevron-right" size={22} color={palette.mutedText} />
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            style={[
              styles.optionRow,
              {
                backgroundColor: isDark
                  ? "rgba(91,19,236,0.06)"
                  : "rgba(91,19,236,0.04)",
                borderColor: isDark
                  ? "rgba(91,19,236,0.15)"
                  : "rgba(91,19,236,0.1)",
              },
            ]}
            onPress={() => onSelect("oral_exam")}
          >
            <View style={styles.optionIcon}>
              <MaterialIcons name="record-voice-over" size={22} color="#5b13ec" />
            </View>
            <View style={styles.optionTextWrap}>
              <Text style={[styles.optionTitle, { color: palette.text }]}>AI Oral Prep</Text>
              <Text style={[styles.optionDescription, { color: palette.mutedText }]}>DPE-style oral questioning</Text>
            </View>
            <MaterialIcons name="chevron-right" size={22} color={palette.mutedText} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          activeOpacity={0.8}
          style={[
            styles.cancelButton,
            { borderColor: isDark ? "rgba(255,255,255,0.08)" : "#e5e7eb" },
          ]}
          onPress={onClose}
        >
          <Text style={[styles.cancelText, { color: palette.mutedText }]}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingBottom: 36,
    paddingTop: 12,
    marginTop: -20,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    marginBottom: 20,
  },
  list: {
    gap: 10,
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
  },
  optionIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: "rgba(91,19,236,0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  optionTextWrap: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  optionDescription: {
    fontSize: 12,
    marginTop: 2,
  },
  cancelButton: {
    marginTop: 16,
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelText: {
    fontSize: 15,
    fontWeight: "600",
  },
});
