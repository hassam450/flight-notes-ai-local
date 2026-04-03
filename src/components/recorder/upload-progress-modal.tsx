import { MaterialCommunityIcons, MaterialIcons } from "@expo/vector-icons";
import React from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";

import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import type { RecordingSourceType } from "@/types/recorder";

type UploadProgressModalProps = {
  visible: boolean;
  fileName: string;
  sourceType: RecordingSourceType;
  progress: number;
  onCancel: () => void;
  isCancelable?: boolean;
};

function titleForSource(sourceType: RecordingSourceType) {
  return sourceType === "imported_document" || sourceType === "manual_text" ? "Uploading Document..." : "Uploading Audio...";
}

function iconForSource(sourceType: RecordingSourceType) {
  return sourceType === "imported_document" || sourceType === "manual_text" ? "file-document-outline" : "music-note";
}

export function UploadProgressModal({
  visible,
  fileName,
  sourceType,
  progress,
  onCancel,
  isCancelable = true,
}: UploadProgressModalProps) {
  const colorScheme = useColorScheme();
  const theme = (colorScheme ?? "light") as "light" | "dark";
  const palette = Colors[theme];
  const isDark = colorScheme === "dark";
  const pct = Math.max(0, Math.min(100, Math.round(progress)));

  return (
    <Modal transparent animationType="fade" visible={visible}>
      <View style={styles.backdrop}>
        <View style={[styles.card, { backgroundColor: isDark ? "#251b3d" : "#ffffff" }]}>
          <Text style={[styles.title, { color: isDark ? "#fff" : palette.text }]}>
            {titleForSource(sourceType)}
          </Text>

          <View style={styles.fileWrap}>
            <View style={[styles.iconWrap, { backgroundColor: "rgba(91,19,236,0.2)" }]}>
              <MaterialCommunityIcons name={iconForSource(sourceType)} size={38} color={palette.primary} />
            </View>
            <Text style={[styles.fileName, { color: isDark ? "#cbd5e1" : palette.mutedText }]} numberOfLines={1}>
              {fileName}
            </Text>
          </View>

          <View style={styles.progressBlock}>
            <View style={styles.progressHeader}>
              <Text style={[styles.progressLabel, { color: isDark ? "#94a3b8" : palette.mutedText }]}>Progress</Text>
              <Text style={[styles.progressValue, { color: palette.primary }]}>{pct}%</Text>
            </View>
            <View style={[styles.track, { backgroundColor: isDark ? "rgba(255,255,255,0.1)" : "#e2e8f0" }]}>
              <View style={[styles.fill, { width: `${pct}%`, backgroundColor: palette.primary }]} />
            </View>
          </View>

          <Pressable onPress={onCancel} disabled={!isCancelable} style={styles.cancelAction}>
            <MaterialIcons name="cancel" size={16} color={isDark ? "#94a3b8" : palette.mutedText} />
            <Text style={[styles.cancelText, { color: isDark ? "#94a3b8" : palette.mutedText }]}>Cancel</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  card: {
    width: "100%",
    maxWidth: 320,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    paddingHorizontal: 22,
    paddingTop: 20,
    paddingBottom: 14,
    alignItems: "center",
  },
  title: { fontSize: 18, fontWeight: "700", marginBottom: 20 },
  fileWrap: { alignItems: "center", marginBottom: 24 },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  fileName: { fontSize: 13, fontWeight: "600", maxWidth: 220 },
  progressBlock: { width: "100%", marginBottom: 16 },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1.2,
  },
  progressValue: { fontSize: 16, fontWeight: "700" },
  track: {
    width: "100%",
    height: 8,
    borderRadius: 999,
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    borderRadius: 999,
  },
  cancelAction: {
    height: 32,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  cancelText: { fontSize: 14, fontWeight: "500" },
});
