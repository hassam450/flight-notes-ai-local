import { MaterialIcons } from "@expo/vector-icons";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as FileSystem from "expo-file-system/legacy";
import * as WebBrowser from "expo-web-browser";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Pdf from "react-native-pdf";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { fetchToolkitResourceById } from "@/services/toolkit/resource-library-service";
import type { ToolkitResource } from "@/types/toolkit-resource";
import { formatToolkitResourceCategory } from "@/types/toolkit-resource";

function getCategoryAccent(category: ToolkitResource["category"]) {
  switch (category) {
    case "handbooks":
      return "#7c45f0";
    case "regulations":
      return "#3b82f6";
    case "standards":
      return "#10b981";
    case "advisory":
      return "#f97316";
    default:
      return "#5b13ec";
  }
}

export default function ToolkitResourceViewerScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ resourceId?: string }>();
  const resourceId = params.resourceId?.toString() ?? "";
  const colorScheme = useColorScheme();
  const insets = useSafeAreaInsets();
  const isDark = colorScheme === "dark";
  const palette = Colors[isDark ? "dark" : "light"];

  const [resource, setResource] = useState<ToolkitResource | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [localPdfUri, setLocalPdfUri] = useState<string | null>(null);

  const downloadPdfToCache = useCallback(async (nextResource: ToolkitResource) => {
    const cacheDirectory = FileSystem.cacheDirectory;
    if (!cacheDirectory) {
      throw new Error("PDF cache directory is unavailable on this device.");
    }

    const localUri = `${cacheDirectory}faa-resource-${nextResource.slug}.pdf`;
    const existingFile = await FileSystem.getInfoAsync(localUri);
    if (!existingFile.exists) {
      await FileSystem.downloadAsync(nextResource.pdfUrl, localUri);
    }

    return localUri;
  }, []);

  const loadResource = useCallback(async () => {
    if (!resourceId) {
      setError("Missing resource identifier.");
      return;
    }

    setLoading(true);
    setError(null);
    setLocalPdfUri(null);
    setPdfLoading(true);
    setPdfError(null);
    try {
      const data = await fetchToolkitResourceById(resourceId);
      if (!data) {
        setError("This FAA resource is unavailable.");
        setResource(null);
      } else {
        setResource(data);
        if (Platform.OS !== "web") {
          const downloadedUri = await downloadPdfToCache(data);
          setLocalPdfUri(downloadedUri);
        }
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load resource details.",
      );
      setResource(null);
      setLocalPdfUri(null);
    } finally {
      setLoading(false);
    }
  }, [downloadPdfToCache, resourceId]);

  useFocusEffect(
    useCallback(() => {
      void loadResource();
    }, [loadResource]),
  );

  const openExternal = async () => {
    if (!resource?.pdfUrl) return;
    await WebBrowser.openBrowserAsync(resource.pdfUrl);
  };

  const accent = resource ? getCategoryAccent(resource.category) : "#5b13ec";

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
        <TouchableOpacity style={styles.headerButton} onPress={() => router.back()} activeOpacity={0.8}>
          <MaterialIcons name="chevron-left" size={24} color={palette.mutedText} />
        </TouchableOpacity>

        <View style={{ flex: 1 }}>
          <Text style={[styles.headerKicker, { color: accent }]}>FAA Document</Text>
          <Text numberOfLines={2} style={[styles.headerTitle, { color: palette.text }]}> 
            {resource?.title ?? "Resource Viewer"}
          </Text>
        </View>

        {resource ? (
          <TouchableOpacity style={styles.headerButton} onPress={() => void openExternal()} activeOpacity={0.8}>
            <MaterialIcons name="open-in-new" size={20} color={palette.mutedText} />
          </TouchableOpacity>
        ) : (
          <View style={styles.headerButton} />
        )}
      </View>

      {loading ? (
        <View style={styles.centerState}>
          <ActivityIndicator size="small" color="#5b13ec" />
          <Text style={[styles.stateText, { color: palette.mutedText }]}>Loading document...</Text>
        </View>
      ) : error ? (
        <View style={styles.centerState}>
          <MaterialIcons name="error-outline" size={22} color="#ef4444" />
          <Text style={[styles.stateTitle, { color: palette.text }]}>Unable to open resource</Text>
          <Text style={[styles.stateText, { color: palette.mutedText }]}>{error}</Text>
          <TouchableOpacity style={styles.primaryButton} onPress={() => void loadResource()} activeOpacity={0.8}>
            <Text style={styles.primaryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : resource ? (
        <View style={styles.viewerWrap}>
          <View style={[styles.metaCard, { backgroundColor: palette.card, borderColor: palette.border }]}> 
            <View style={styles.metaRow}>
              <Text style={[styles.categoryText, { color: accent }]}> 
                {formatToolkitResourceCategory(resource.category)}
              </Text>
              {resource.documentCode ? (
                <Text style={[styles.codeText, { color: palette.mutedText }]}> 
                  {resource.documentCode}
                </Text>
              ) : null}
            </View>
            <Text style={[styles.descriptionText, { color: palette.mutedText }]}> 
              {resource.description}
            </Text>
          </View>

          {Platform.OS === "web" ? (
            <View style={[styles.webFallbackCard, { backgroundColor: palette.card, borderColor: palette.border }]}> 
              <MaterialIcons name="language" size={22} color={accent} />
              <Text style={[styles.stateTitle, { color: palette.text }]}>Open in browser</Text>
              <Text style={[styles.stateText, { color: palette.mutedText }]}> 
                The embedded FAA PDF viewer is available in the native app. Use the button below on web.
              </Text>
              <TouchableOpacity style={styles.primaryButton} onPress={() => void openExternal()} activeOpacity={0.8}>
                <Text style={styles.primaryButtonText}>Open PDF</Text>
              </TouchableOpacity>
            </View>
          ) : pdfError ? (
            <View style={[styles.webFallbackCard, { backgroundColor: palette.card, borderColor: palette.border }]}> 
              <MaterialIcons name="error-outline" size={22} color="#ef4444" />
              <Text style={[styles.stateTitle, { color: palette.text }]}>PDF failed to load</Text>
              <Text style={[styles.stateText, { color: palette.mutedText }]}>{pdfError}</Text>
              <View style={styles.errorActionsRow}>
                <TouchableOpacity
                  style={[styles.secondaryButton, { borderColor: palette.border }]}
                  onPress={() => setPdfError(null)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.secondaryButtonText, { color: palette.text }]}>Retry</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.primaryButton} onPress={() => void openExternal()} activeOpacity={0.8}>
                  <Text style={styles.primaryButtonText}>Open in Browser</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={styles.pdfWrap}>
              {pdfLoading ? (
                <View style={[styles.pdfLoadingOverlay, { backgroundColor: palette.background }]}> 
                  <ActivityIndicator size="small" color="#5b13ec" />
                  <Text style={[styles.stateText, { color: palette.mutedText }]}>Rendering FAA document...</Text>
                </View>
              ) : null}

              <Pdf
                source={{ uri: localPdfUri ?? "", cache: false }}
                trustAllCerts={false}
                style={styles.pdf}
                onLoadProgress={(percent) => {
                  if (percent < 1) {
                    setPdfLoading(true);
                  }
                }}
                onLoadComplete={() => {
                  setPdfLoading(false);
                  setPdfError(null);
                }}
                onError={(pdfErr) => {
                  setPdfLoading(false);
                  setPdfError(
                    pdfErr instanceof Error
                      ? pdfErr.message
                      : "The PDF could not be rendered.",
                  );
                }}
              />
            </View>
          )}
        </View>
      ) : null}
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
    fontSize: 21,
    fontWeight: "700",
    lineHeight: 27,
  },
  viewerWrap: {
    flex: 1,
    padding: 16,
    gap: 14,
  },
  metaCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    gap: 8,
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
  },
  categoryText: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.7,
    textTransform: "uppercase",
  },
  codeText: {
    fontSize: 11,
    fontWeight: "600",
  },
  descriptionText: {
    fontSize: 13,
    lineHeight: 18,
  },
  pdfWrap: {
    flex: 1,
    overflow: "hidden",
    borderRadius: 18,
  },
  pdf: {
    flex: 1,
    width: "100%",
    backgroundColor: "#111827",
    borderRadius: 18,
  },
  pdfLoadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  centerState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    gap: 10,
  },
  stateTitle: {
    fontSize: 16,
    fontWeight: "700",
    textAlign: "center",
  },
  stateText: {
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center",
  },
  webFallbackCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 18,
    alignItems: "center",
    gap: 10,
  },
  errorActionsRow: {
    marginTop: 2,
    flexDirection: "row",
    gap: 10,
  },
  primaryButton: {
    backgroundColor: "#5b13ec",
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 11,
  },
  primaryButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 13,
  },
  secondaryButton: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 11,
  },
  secondaryButtonText: {
    fontWeight: "700",
    fontSize: 13,
  },
});
