import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { TOOLKIT_CHECKLISTS } from "@/constants/toolkit-checklists";
import { Colors } from "@/constants/theme";

const SURFACE_BG = "#1E1C29";
const SURFACE_BORDER = "rgba(255,255,255,0.08)";

export default function ToolkitChecklistsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const palette = Colors.dark;

  const [activeId, setActiveId] = useState(TOOLKIT_CHECKLISTS[0]?.id);
  const [checkedMap, setCheckedMap] = useState<Record<string, boolean>>({});

  const activeChecklist =
    TOOLKIT_CHECKLISTS.find((section) => section.id === activeId) ?? TOOLKIT_CHECKLISTS[0];

  const completedCount = useMemo(() => {
    if (!activeChecklist) return 0;
    return activeChecklist.items.filter((item) => checkedMap[`${activeChecklist.id}:${item}`]).length;
  }, [activeChecklist, checkedMap]);

  const toggleItem = (item: string) => {
    if (!activeChecklist) return;
    const key = `${activeChecklist.id}:${item}`;
    setCheckedMap((current) => ({
      ...current,
      [key]: !current[key],
    }));
  };

  const resetChecklist = () => {
    if (!activeChecklist) return;
    setCheckedMap((current) => {
      const next = { ...current };
      for (const item of activeChecklist.items) {
        delete next[`${activeChecklist.id}:${item}`];
      }
      return next;
    });
  };

  return (
    <View style={[styles.container, { backgroundColor: palette.background }]}>
      <StatusBar style="light" />

      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 8,
          paddingBottom: insets.bottom + 32,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.headerButton}
              onPress={() => router.back()}
              activeOpacity={0.8}
            >
              <MaterialIcons name="chevron-left" size={24} color={palette.mutedText} />
            </TouchableOpacity>
            <View style={styles.headerTitleWrap}>
              <Text style={[styles.headerKicker, { color: palette.primaryLight }]}>Toolkit</Text>
              <Text style={[styles.headerTitle, { color: palette.text }]}>Checklists</Text>
            </View>
            <TouchableOpacity
              style={styles.headerButton}
              onPress={resetChecklist}
              activeOpacity={0.8}
            >
              <MaterialIcons name="restart-alt" size={22} color={palette.mutedText} />
            </TouchableOpacity>
          </View>

          <View style={styles.heroCard}>
            <Text style={[styles.heroTitle, { color: palette.text }]}>Session checklist mode</Text>
            <Text style={[styles.heroSub, { color: palette.mutedText }]}>
              Use these as training/reference flows only. Always defer to your aircraft POH and
              instructor guidance.
            </Text>
            <View style={styles.heroMetaRow}>
              <View style={styles.heroMetaChip}>
                <MaterialIcons name="fact-check" size={16} color="#34d399" />
                <Text style={styles.heroMetaText}>
                  {completedCount}/{activeChecklist?.items.length ?? 0} complete
                </Text>
              </View>
              <View style={styles.heroMetaChip}>
                <MaterialIcons name="flight" size={16} color="#a78bfa" />
                <Text style={styles.heroMetaText}>{activeChecklist?.title ?? "Checklist"}</Text>
              </View>
            </View>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.segmentRow}
          >
            {TOOLKIT_CHECKLISTS.map((section) => {
              const isActive = section.id === activeChecklist?.id;
              return (
                <TouchableOpacity
                  key={section.id}
                  activeOpacity={0.85}
                  style={[styles.segmentChip, isActive && styles.segmentChipActive]}
                  onPress={() => setActiveId(section.id)}
                >
                  <Text
                    style={[
                      styles.segmentText,
                      { color: isActive ? "#fff" : palette.mutedText },
                    ]}
                  >
                    {section.title}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <View style={styles.checklistCard}>
            <Text style={[styles.sectionTitle, { color: palette.text }]}>
              {activeChecklist?.title}
            </Text>
            <Text style={[styles.sectionSubtitle, { color: palette.mutedText }]}>
              {activeChecklist?.subtitle}
            </Text>

            <View style={styles.itemsList}>
              {activeChecklist?.items.map((item, index) => {
                const checked = checkedMap[`${activeChecklist.id}:${item}`] ?? false;
                return (
                  <Pressable
                    key={item}
                    onPress={() => toggleItem(item)}
                    style={[styles.itemRow, checked && styles.itemRowChecked]}
                  >
                    <View style={[styles.itemIndex, checked && styles.itemIndexChecked]}>
                      <Text style={styles.itemIndexText}>{index + 1}</Text>
                    </View>
                    <View style={styles.itemTextWrap}>
                      <Text
                        style={[
                          styles.itemText,
                          { color: checked ? "#d1fae5" : palette.text },
                        ]}
                      >
                        {item}
                      </Text>
                    </View>
                    <MaterialIcons
                      name={checked ? "check-circle" : "radio-button-unchecked"}
                      size={22}
                      color={checked ? "#34d399" : palette.mutedText}
                    />
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    paddingHorizontal: 20,
    gap: 18,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: SURFACE_BORDER,
  },
  headerTitleWrap: {
    flex: 1,
    alignItems: "center",
  },
  headerKicker: {
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 1,
    fontWeight: "700",
  },
  headerTitle: {
    marginTop: 4,
    fontSize: 24,
    fontWeight: "700",
  },
  heroCard: {
    borderRadius: 18,
    backgroundColor: SURFACE_BG,
    borderWidth: 1,
    borderColor: SURFACE_BORDER,
    padding: 18,
    gap: 10,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: "700",
  },
  heroSub: {
    fontSize: 14,
    lineHeight: 20,
  },
  heroMetaRow: {
    flexDirection: "row",
    gap: 10,
    flexWrap: "wrap",
  },
  heroMetaChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  heroMetaText: {
    color: "#f3f4f6",
    fontSize: 12,
    fontWeight: "600",
  },
  segmentRow: {
    gap: 10,
    paddingRight: 20,
  },
  segmentChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: SURFACE_BORDER,
    backgroundColor: "rgba(255,255,255,0.03)",
  },
  segmentChipActive: {
    borderColor: "rgba(124,69,240,0.45)",
    backgroundColor: "rgba(91,19,236,0.28)",
  },
  segmentText: {
    fontSize: 13,
    fontWeight: "600",
  },
  checklistCard: {
    borderRadius: 18,
    backgroundColor: SURFACE_BG,
    borderWidth: 1,
    borderColor: SURFACE_BORDER,
    padding: 18,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: "700",
  },
  sectionSubtitle: {
    marginTop: 6,
    fontSize: 14,
    lineHeight: 20,
  },
  itemsList: {
    marginTop: 18,
    gap: 12,
  },
  itemRow: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: SURFACE_BORDER,
    backgroundColor: "rgba(255,255,255,0.03)",
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  itemRowChecked: {
    borderColor: "rgba(52,211,153,0.35)",
    backgroundColor: "rgba(16,185,129,0.14)",
  },
  itemIndex: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  itemIndexChecked: {
    backgroundColor: "rgba(52,211,153,0.2)",
  },
  itemIndexText: {
    color: "#f3f4f6",
    fontSize: 12,
    fontWeight: "700",
  },
  itemTextWrap: {
    flex: 1,
  },
  itemText: {
    fontSize: 15,
    lineHeight: 21,
    fontWeight: "600",
  },
});
