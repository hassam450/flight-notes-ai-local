/**
 * Category Picker Modal — lets users choose a certification category
 * (PPL, Instrument, etc.) before starting a quiz or oral exam.
 */

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

import { NOTE_CATEGORIES } from "@/constants/categories";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";

type CategoryPickerModalProps = {
  visible: boolean;
  onClose: () => void;
  onSelect: (category: string) => void;
};

const CATEGORY_ICONS: Record<string, keyof typeof MaterialIcons.glyphMap> = {
  PPL: "flight-takeoff",
  Instrument: "speed",
  Commercial: "local-airport",
  "Multi-Engine": "connecting-airports",
  CFI: "school",
};

export default function CategoryPickerModal({
  visible,
  onClose,
  onSelect,
}: CategoryPickerModalProps) {
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
          {
            backgroundColor: isDark ? "#1a1225" : "#ffffff",
          },
        ]}
      >
        {/* Handle bar */}
        <View
          style={[
            styles.handle,
            { backgroundColor: isDark ? "rgba(255,255,255,0.15)" : "#d1d5db" },
          ]}
        />

        {/* Title */}
        <Text style={[styles.title, { color: palette.text }]}>
          Choose Category
        </Text>
        <Text style={[styles.subtitle, { color: palette.mutedText }]}>
          Select a certification to practice
        </Text>

        {/* Category list */}
        <View style={styles.list}>
          {NOTE_CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat}
              activeOpacity={0.8}
              style={[
                styles.categoryRow,
                {
                  backgroundColor: isDark
                    ? "rgba(91,19,236,0.06)"
                    : "rgba(91,19,236,0.04)",
                  borderColor: isDark
                    ? "rgba(91,19,236,0.15)"
                    : "rgba(91,19,236,0.1)",
                },
              ]}
              onPress={() => onSelect(cat)}
            >
              <View style={styles.categoryIcon}>
                <MaterialIcons
                  name={CATEGORY_ICONS[cat] || "quiz"}
                  size={22}
                  color="#5b13ec"
                />
              </View>
              <Text style={[styles.categoryLabel, { color: palette.text }]}>
                {cat}
              </Text>
              <MaterialIcons
                name="chevron-right"
                size={22}
                color={palette.mutedText}
              />
            </TouchableOpacity>
          ))}
        </View>

        {/* Cancel */}
        <TouchableOpacity
          activeOpacity={0.8}
          style={[
            styles.cancelButton,
            {
              borderColor: isDark ? "rgba(255,255,255,0.08)" : "#e5e7eb",
            },
          ]}
          onPress={onClose}
        >
          <Text style={[styles.cancelText, { color: palette.mutedText }]}>
            Cancel
          </Text>
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
    // Pull up to overlap the overlay
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
  categoryRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
  },
  categoryIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: "rgba(91,19,236,0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  categoryLabel: {
    flex: 1,
    fontSize: 16,
    fontWeight: "600",
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
