import { MaterialIcons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
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
import { fetchToolkitResources } from "@/services/toolkit/resource-library-service";
import type {
  ToolkitResource,
  ToolkitResourceFilterCategory,
} from "@/types/toolkit-resource";
import {
  formatToolkitResourceCategory,
  TOOLKIT_RESOURCE_CATEGORIES,
} from "@/types/toolkit-resource";

const FEATURED_CARD_BG = "#1E1C29";
const FEATURED_BORDER = "rgba(255,255,255,0.08)";

function matchesSearch(resource: ToolkitResource, query: string) {
  if (!query) return true;

  const haystack = [
    resource.title,
    resource.documentCode ?? "",
    resource.description,
    resource.keywords.join(" "),
  ]
    .join(" ")
    .toLowerCase();

  return haystack.includes(query);
}

function getCategoryColors(category: ToolkitResourceFilterCategory) {
  switch (category) {
    case "handbooks":
      return { accent: "#7c45f0", bg: "rgba(124,69,240,0.16)" };
    case "regulations":
      return { accent: "#3b82f6", bg: "rgba(59,130,246,0.16)" };
    case "standards":
      return { accent: "#10b981", bg: "rgba(16,185,129,0.16)" };
    case "advisory":
      return { accent: "#f97316", bg: "rgba(249,115,22,0.16)" };
    default:
      return { accent: "#5b13ec", bg: "rgba(91,19,236,0.16)" };
  }
}

export default function ToolkitResourcesScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const insets = useSafeAreaInsets();
  const isDark = colorScheme === "dark";
  const palette = Colors[isDark ? "dark" : "light"];

  const [resources, setResources] = useState<ToolkitResource[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] =
    useState<ToolkitResourceFilterCategory>("all");

  const loadResources = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchToolkitResources();
      setResources(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load aviation resources.",
      );
      setResources([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadResources();
    }, [loadResources]),
  );

  const normalizedQuery = query.trim().toLowerCase();

  const featuredResources = useMemo(() => {
    if (normalizedQuery || activeCategory !== "all") return [];
    return resources.filter((resource) => resource.isFeatured).slice(0, 2);
  }, [activeCategory, normalizedQuery, resources]);

  const filteredResources = useMemo(() => {
    return resources.filter((resource) => {
      if (
        activeCategory !== "all" &&
        resource.category !== activeCategory
      ) {
        return false;
      }

      return matchesSearch(resource, normalizedQuery);
    });
  }, [activeCategory, normalizedQuery, resources]);

  return (
    <View style={[styles.container, { backgroundColor: palette.background }]}> 
      <StatusBar style={isDark ? "light" : "dark"} />

      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + 8,
            borderBottomColor: isDark ? "rgba(91,19,236,0.18)" : "#e5e7eb",
            backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.76)",
          },
        ]}
      >
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => router.back()}
          activeOpacity={0.8}
        >
          <MaterialIcons name="chevron-left" size={24} color={palette.mutedText} />
        </TouchableOpacity>

        <View style={{ flex: 1 }}>
          <Text style={[styles.headerKicker, { color: palette.mutedText }]}>Toolkit</Text>
          <Text style={[styles.headerTitle, { color: palette.text }]}>FAA Library</Text>
        </View>

        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => {
            setQuery("");
            setActiveCategory("all");
          }}
          activeOpacity={0.8}
        >
          <MaterialIcons name="restart-alt" size={20} color={palette.mutedText} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 16,
          paddingBottom: insets.bottom + 88,
          gap: 18,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.searchWrap, { backgroundColor: palette.card, borderColor: palette.border }]}> 
          <MaterialIcons name="search" size={18} color={palette.mutedText} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search FAA handbooks, AIM, ACs..."
            placeholderTextColor={palette.mutedText}
            style={[styles.searchInput, { color: palette.text }]}
          />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
          {TOOLKIT_RESOURCE_CATEGORIES.map((category) => {
            const selected = activeCategory === category;
            const colors = getCategoryColors(category);
            return (
              <TouchableOpacity
                key={category}
                activeOpacity={0.8}
                onPress={() => setActiveCategory(category)}
                style={[
                  styles.chip,
                  {
                    backgroundColor: selected ? colors.bg : palette.card,
                    borderColor: selected ? colors.accent : palette.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.chipText,
                    { color: selected ? colors.accent : palette.mutedText },
                  ]}
                >
                  {formatToolkitResourceCategory(category)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {featuredResources.length > 0 ? (
          <View style={styles.sectionWrap}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: palette.text }]}>Featured Reads</Text>
              <Text style={[styles.sectionCaption, { color: palette.mutedText }]}>FAA essentials for fast review</Text>
            </View>

            {featuredResources.map((resource) => {
              const colors = getCategoryColors(resource.category);
              return (
                <Pressable
                  key={resource.id}
                  onPress={() => router.push(`/toolkit/resources/${resource.id}`)}
                  style={({ pressed }) => [styles.featuredCard, { opacity: pressed ? 0.94 : 1 }]}
                >
                  <View style={[styles.featuredIconWrap, { backgroundColor: colors.bg }]}>
                    <MaterialIcons name="menu-book" size={24} color={colors.accent} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={styles.featuredMetaRow}>
                      <Text style={[styles.featuredChip, { color: colors.accent }]}>
                        {formatToolkitResourceCategory(resource.category)}
                      </Text>
                      {resource.documentCode ? (
                        <Text style={[styles.featuredCode, { color: palette.mutedText }]}>
                          {resource.documentCode}
                        </Text>
                      ) : null}
                    </View>
                    <Text style={styles.featuredTitle}>{resource.title}</Text>
                    <Text numberOfLines={2} style={styles.featuredDescription}>
                      {resource.description}
                    </Text>
                  </View>
                  <MaterialIcons name="chevron-right" size={22} color="#9ca3af" />
                </Pressable>
              );
            })}
          </View>
        ) : null}

        <View style={styles.sectionWrap}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: palette.text }]}>Resources</Text>
            <Text style={[styles.sectionCaption, { color: palette.mutedText }]}>
              {filteredResources.length} document{filteredResources.length === 1 ? "" : "s"}
            </Text>
          </View>

          {loading ? (
            <View style={[styles.centerState, { backgroundColor: palette.card, borderColor: palette.border }]}> 
              <ActivityIndicator size="small" color="#5b13ec" />
              <Text style={[styles.stateText, { color: palette.mutedText }]}>Loading FAA resources...</Text>
            </View>
          ) : error ? (
            <View style={[styles.centerState, { backgroundColor: palette.card, borderColor: palette.border }]}> 
              <MaterialIcons name="error-outline" size={20} color="#ef4444" />
              <Text style={[styles.stateTitle, { color: palette.text }]}>Unable to load library</Text>
              <Text style={[styles.stateText, { color: palette.mutedText }]}>{error}</Text>
              <TouchableOpacity style={styles.retryButton} onPress={() => void loadResources()} activeOpacity={0.8}>
                <Text style={styles.retryButtonText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : filteredResources.length === 0 ? (
            <View style={[styles.centerState, { backgroundColor: palette.card, borderColor: palette.border }]}> 
              <MaterialIcons name="search-off" size={22} color={palette.mutedText} />
              <Text style={[styles.stateTitle, { color: palette.text }]}>No matching resources</Text>
              <Text style={[styles.stateText, { color: palette.mutedText }]}>Try a different search term or reset filters.</Text>
            </View>
          ) : (
            filteredResources.map((resource) => {
              const colors = getCategoryColors(resource.category);
              return (
                <Pressable
                  key={resource.id}
                  onPress={() => router.push(`/toolkit/resources/${resource.id}`)}
                  style={({ pressed }) => [
                    styles.resourceCard,
                    {
                      backgroundColor: palette.card,
                      borderColor: palette.border,
                      opacity: pressed ? 0.95 : 1,
                    },
                  ]}
                >
                  <View style={[styles.resourceIconWrap, { backgroundColor: colors.bg }]}>
                    <MaterialIcons name="picture-as-pdf" size={20} color={colors.accent} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={styles.resourceMetaRow}>
                      <Text style={[styles.resourceCategory, { color: colors.accent }]}> 
                        {formatToolkitResourceCategory(resource.category)}
                      </Text>
                      {resource.documentCode ? (
                        <Text style={[styles.resourceCode, { color: palette.mutedText }]}> 
                          {resource.documentCode}
                        </Text>
                      ) : null}
                    </View>
                    <Text style={[styles.resourceTitle, { color: palette.text }]}> 
                      {resource.title}
                    </Text>
                    <Text numberOfLines={2} style={[styles.resourceDescription, { color: palette.mutedText }]}> 
                      {resource.description}
                    </Text>
                  </View>
                  <MaterialIcons name="chevron-right" size={20} color={palette.mutedText} />
                </Pressable>
              );
            })
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderBottomWidth: 1,
  },
  headerButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  headerKicker: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  headerTitle: {
    marginTop: 4,
    fontSize: 30,
    fontWeight: "700",
    letterSpacing: -0.4,
  },
  searchWrap: {
    minHeight: 52,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 14,
  },
  chipsRow: {
    gap: 10,
    paddingRight: 8,
  },
  chip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  chipText: {
    fontSize: 13,
    fontWeight: "700",
  },
  sectionWrap: {
    gap: 12,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    gap: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  sectionCaption: {
    fontSize: 12,
    fontWeight: "600",
  },
  featuredCard: {
    backgroundColor: FEATURED_CARD_BG,
    borderColor: FEATURED_BORDER,
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  featuredIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  featuredMetaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
  },
  featuredChip: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.7,
  },
  featuredCode: {
    fontSize: 11,
    fontWeight: "600",
  },
  featuredTitle: {
    marginTop: 6,
    color: "#fff",
    fontSize: 17,
    fontWeight: "700",
  },
  featuredDescription: {
    marginTop: 6,
    color: "#9ca3af",
    fontSize: 13,
    lineHeight: 19,
  },
  resourceCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  resourceIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  resourceMetaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
  },
  resourceCategory: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.7,
  },
  resourceCode: {
    fontSize: 11,
    fontWeight: "600",
  },
  resourceTitle: {
    marginTop: 6,
    fontSize: 15,
    fontWeight: "700",
  },
  resourceDescription: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 18,
  },
  centerState: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 24,
    alignItems: "center",
    gap: 10,
  },
  stateTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  stateText: {
    textAlign: "center",
    fontSize: 13,
    lineHeight: 18,
  },
  retryButton: {
    marginTop: 4,
    backgroundColor: "#5b13ec",
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  retryButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 13,
  },
});
