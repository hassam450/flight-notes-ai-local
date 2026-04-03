import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Colors } from "@/constants/theme";
import { fetchWeatherBrief } from "@/services/toolkit/weather-brief-service";
import type { WeatherBriefResponse } from "@/types/weather-brief";

const SURFACE_BG = "#1E1C29";
const SURFACE_BORDER = "rgba(255,255,255,0.08)";

function formatDateTime(value: string | null) {
  if (!value) return "Unavailable";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unavailable";
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function buildDecodeChips(report: WeatherBriefResponse["metar"]) {
  if (!report) return [];

  const chips: string[] = [];
  if (report.flightCategory && report.flightCategory !== "Unknown") {
    chips.push(report.flightCategory);
  }
  if (report.windSummary) {
    chips.push(report.windSummary);
  }
  if (report.visibilitySummary) {
    chips.push(report.visibilitySummary);
  }
  if (report.temperatureC !== null && report.dewpointC !== null) {
    chips.push(`${report.temperatureC}C / ${report.dewpointC}C`);
  }
  return chips;
}

export default function ToolkitWxBriefScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const palette = Colors.dark;

  const [airportId, setAirportId] = useState("KJFK");
  const [result, setResult] = useState<WeatherBriefResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const decodeChips = useMemo(() => buildDecodeChips(result?.metar ?? null), [result]);

  const handleLookup = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const next = await fetchWeatherBrief(airportId);
      setResult(next);
    } catch (lookupError) {
      setResult(null);
      setError(
        lookupError instanceof Error
          ? lookupError.message
          : "Unable to load the weather brief.",
      );
    } finally {
      setIsLoading(false);
    }
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
              <Text style={[styles.headerKicker, { color: "#f59e0b" }]}>Toolkit</Text>
              <Text style={[styles.headerTitle, { color: palette.text }]}>WX Brief</Text>
            </View>
            <View style={styles.headerSpacer} />
          </View>

          <View style={styles.searchCard}>
            <Text style={[styles.searchTitle, { color: palette.text }]}>METARs & TAFs</Text>
            <Text style={[styles.searchSub, { color: palette.mutedText }]}>
              Pull the latest briefing products for a 3 or 4 letter airport identifier.
            </Text>
            <View style={styles.searchRow}>
              <TextInput
                autoCapitalize="characters"
                autoCorrect={false}
                maxLength={4}
                placeholder="KJFK"
                placeholderTextColor="#6b7280"
                style={styles.input}
                value={airportId}
                onChangeText={(text) => setAirportId(text.replace(/[^a-z]/gi, "").toUpperCase())}
              />
              <TouchableOpacity
                activeOpacity={0.85}
                style={styles.lookupButton}
                onPress={() => void handleLookup()}
              >
                {isLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <MaterialIcons name="travel-explore" size={18} color="#fff" />
                    <Text style={styles.lookupButtonText}>Lookup</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
            <Text style={[styles.searchHint, { color: palette.mutedText }]}>
              Source: NOAA Aviation Weather Center
            </Text>
          </View>

          {error ? (
            <View style={styles.stateCard}>
              <MaterialIcons name="error-outline" size={24} color="#fca5a5" />
              <Text style={[styles.stateTitle, { color: palette.text }]}>Unable to load brief</Text>
              <Text style={[styles.stateSub, { color: palette.mutedText }]}>{error}</Text>
            </View>
          ) : null}

          {!error && !result && !isLoading ? (
            <View style={styles.stateCard}>
              <MaterialIcons name="cloud-queue" size={24} color="#fbbf24" />
              <Text style={[styles.stateTitle, { color: palette.text }]}>
                Ready for airport lookup
              </Text>
              <Text style={[styles.stateSub, { color: palette.mutedText }]}>
                Search an airport to load current METAR and TAF products.
              </Text>
            </View>
          ) : null}

          {result ? (
            <>
              <View style={styles.metaRow}>
                <View style={styles.metaChip}>
                  <MaterialIcons name="place" size={16} color="#f59e0b" />
                  <Text style={styles.metaChipText}>{result.airportId}</Text>
                </View>
                <View style={styles.metaChip}>
                  <MaterialIcons name="schedule" size={16} color="#a78bfa" />
                  <Text style={styles.metaChipText}>Updated {formatDateTime(result.fetchedAt)}</Text>
                </View>
              </View>

              <View style={styles.reportCard}>
                <View style={styles.reportHeader}>
                  <Text style={[styles.reportTitle, { color: palette.text }]}>METAR</Text>
                  <Text style={[styles.reportIssued, { color: palette.mutedText }]}>
                    Issued {formatDateTime(result.metar?.issuedAt ?? null)}
                  </Text>
                </View>
                <Text style={styles.rawText}>{result.metar?.rawText ?? "No METAR available."}</Text>
                <View style={styles.decodeRow}>
                  {decodeChips.map((chip) => (
                    <View key={chip} style={styles.decodeChip}>
                      <Text style={styles.decodeChipText}>{chip}</Text>
                    </View>
                  ))}
                  {decodeChips.length === 0 ? (
                    <Text style={[styles.emptyDecodeText, { color: palette.mutedText }]}>
                      No decoded details available.
                    </Text>
                  ) : null}
                </View>
                {result.metar?.cloudsSummary ? (
                  <Text style={[styles.helperText, { color: palette.mutedText }]}>
                    Clouds: {result.metar.cloudsSummary}
                  </Text>
                ) : null}
              </View>

              <View style={styles.reportCard}>
                <View style={styles.reportHeader}>
                  <Text style={[styles.reportTitle, { color: palette.text }]}>TAF</Text>
                  <Text style={[styles.reportIssued, { color: palette.mutedText }]}>
                    Issued {formatDateTime(result.taf?.issuedAt ?? null)}
                  </Text>
                </View>
                <Text style={styles.rawText}>{result.taf?.rawText ?? "No TAF available."}</Text>
                <Text style={[styles.helperText, { color: palette.mutedText }]}>
                  Valid {formatDateTime(result.taf?.validFrom ?? null)} to{" "}
                  {formatDateTime(result.taf?.validTo ?? null)}
                </Text>
              </View>

              <View style={styles.decodeCard}>
                <Text style={[styles.decodeTitle, { color: palette.text }]}>Decode quick guide</Text>
                <Text style={[styles.decodeBody, { color: palette.mutedText }]}>
                  `Z` timestamps are UTC, visibility is statute miles, and ceiling/flight category
                  should be cross-checked with the full report before dispatch decisions.
                </Text>
              </View>
            </>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    paddingHorizontal: 20,
    gap: 16,
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
  headerSpacer: {
    width: 40,
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
  searchCard: {
    borderRadius: 18,
    backgroundColor: SURFACE_BG,
    borderWidth: 1,
    borderColor: SURFACE_BORDER,
    padding: 18,
  },
  searchTitle: {
    fontSize: 22,
    fontWeight: "700",
  },
  searchSub: {
    marginTop: 6,
    fontSize: 14,
    lineHeight: 20,
  },
  searchRow: {
    marginTop: 16,
    flexDirection: "row",
    gap: 10,
  },
  input: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: SURFACE_BORDER,
    backgroundColor: "rgba(255,255,255,0.04)",
    paddingHorizontal: 14,
    paddingVertical: 14,
    color: "#fff",
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: 1.2,
  },
  lookupButton: {
    minWidth: 116,
    borderRadius: 14,
    paddingHorizontal: 18,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    backgroundColor: "#5b13ec",
  },
  lookupButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },
  searchHint: {
    marginTop: 12,
    fontSize: 12,
  },
  stateCard: {
    borderRadius: 18,
    backgroundColor: SURFACE_BG,
    borderWidth: 1,
    borderColor: SURFACE_BORDER,
    padding: 18,
    alignItems: "center",
    gap: 8,
  },
  stateTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  stateSub: {
    textAlign: "center",
    fontSize: 14,
    lineHeight: 20,
  },
  metaRow: {
    flexDirection: "row",
    gap: 10,
    flexWrap: "wrap",
  },
  metaChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  metaChipText: {
    color: "#f3f4f6",
    fontSize: 12,
    fontWeight: "600",
  },
  reportCard: {
    borderRadius: 18,
    backgroundColor: SURFACE_BG,
    borderWidth: 1,
    borderColor: SURFACE_BORDER,
    padding: 18,
    gap: 12,
  },
  reportHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  reportTitle: {
    fontSize: 20,
    fontWeight: "700",
  },
  reportIssued: {
    fontSize: 12,
  },
  rawText: {
    color: "#f3f4f6",
    fontSize: 14,
    lineHeight: 21,
    fontWeight: "600",
  },
  decodeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  decodeChip: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "rgba(91,19,236,0.18)",
  },
  decodeChipText: {
    color: "#ede9fe",
    fontSize: 12,
    fontWeight: "700",
  },
  emptyDecodeText: {
    fontSize: 13,
  },
  helperText: {
    fontSize: 13,
    lineHeight: 18,
  },
  decodeCard: {
    borderRadius: 18,
    backgroundColor: "rgba(245,158,11,0.1)",
    borderWidth: 1,
    borderColor: "rgba(245,158,11,0.25)",
    padding: 18,
  },
  decodeTitle: {
    fontSize: 17,
    fontWeight: "700",
  },
  decodeBody: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
  },
});
