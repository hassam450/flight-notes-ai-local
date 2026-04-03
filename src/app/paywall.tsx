import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { PurchasesPackage } from "react-native-purchases";

import { Colors } from "@/constants/theme";
import { useSubscription } from "@/contexts/subscription-context";
import { useColorScheme } from "@/hooks/use-color-scheme";

const PRIVACY_URL = "https://flightnotesai.com/privacy";
const TERMS_URL = "https://flightnotesai.com/terms";

const FEATURES = [
  "Unlimited AI transcriptions",
  "Advanced flight summaries",
  "AI-generated flashcards & quizzes",
  "Oral exam practice",
  "Aviation AI chatbot",
  "Weather briefings",
  "Priority support",
];

export default function PaywallScreen() {
  const router = useRouter();
  const { mode } = useLocalSearchParams<{ mode?: string }>();
  const isUpgradeMode = mode === "upgrade";
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const palette = Colors[colorScheme ?? "light"];

  const { offerings, purchase, restore, loading } = useSubscription();
  const [selectedPackage, setSelectedPackage] =
    useState<PurchasesPackage | null>(null);
  const [restoring, setRestoring] = useState(false);

  const packages = React.useMemo(
    () => offerings?.current?.availablePackages ?? [],
    [offerings]
  );

  // Auto-select first package
  React.useEffect(() => {
    if (packages.length > 0 && !selectedPackage) {
      // Prefer annual, fallback to first
      const annual = packages.find(
        (p) =>
          p.packageType === "ANNUAL" ||
          p.identifier.toLowerCase().includes("annual") ||
          p.identifier.toLowerCase().includes("yearly")
      );
      setSelectedPackage(annual ?? packages[0]);
    }
  }, [packages, selectedPackage]);

  const navigateAfterSuccess = () => {
    if (isUpgradeMode) {
      router.back();
    } else {
      router.replace("/(tabs)");
    }
  };

  const handlePurchase = async () => {
    if (!selectedPackage) return;
    const result = await purchase(selectedPackage);
    if (result.success) {
      navigateAfterSuccess();
    } else if (result.error) {
      Alert.alert("Purchase Failed", result.error);
    } else {
      Alert.alert(
        "Purchase Processing",
        "Your purchase is being processed. Please try restoring purchases in a moment."
      );
    }
  };

  const handleRestore = async () => {
    setRestoring(true);
    const result = await restore();
    setRestoring(false);

    if (result.success && !result.error) {
      Alert.alert("Restored!", "Your subscription has been restored.", [
        { text: "OK", onPress: navigateAfterSuccess },
      ]);
    } else if (result.error) {
      Alert.alert("Restore", result.error);
    }
  };

  const getPackageLabel = (pkg: PurchasesPackage): string => {
    const id = pkg.identifier.toLowerCase();
    if (id.includes("annual") || id.includes("yearly") || pkg.packageType === "ANNUAL")
      return "Annual";
    if (id.includes("month") || pkg.packageType === "MONTHLY") return "Monthly";
    if (id.includes("week") || pkg.packageType === "WEEKLY") return "Weekly";
    return pkg.identifier;
  };

  const getPackageSavings = (pkg: PurchasesPackage): string | null => {
    const id = pkg.identifier.toLowerCase();
    if (id.includes("annual") || id.includes("yearly") || pkg.packageType === "ANNUAL")
      return "Best Value";
    return null;
  };

  return (
    <View style={[styles.container, { backgroundColor: palette.background }]}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header gradient */}
        <LinearGradient
          colors={["#5b13ec", "#430db0"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.header, { paddingTop: insets.top + 12 }]}
        >
          {/* Close button */}
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => {
              if (isUpgradeMode) {
                router.back();
              } else {
                router.replace("/(tabs)");
              }
            }}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Ionicons name="close" size={28} color="#fff" />
          </TouchableOpacity>

          {/* Branding */}
          <View style={styles.branding}>
            <View style={styles.iconCircle}>
              <Ionicons name="airplane" size={32} color="#5b13ec" />
            </View>
            <Text style={styles.headerTitle}>Flight Notes AI</Text>
            <Text style={styles.headerSubtitle}>
              Unlock the full power of your aviation study companion
            </Text>
          </View>
        </LinearGradient>

        <View style={styles.body}>
          {/* Features list */}
          <View style={styles.featuresSection}>
            <Text style={[styles.sectionTitle, { color: palette.text }]}>
              Premium includes
            </Text>
            {FEATURES.map((feature) => (
              <View key={feature} style={styles.featureRow}>
                <Ionicons
                  name="checkmark-circle"
                  size={22}
                  color="#5b13ec"
                />
                <Text style={[styles.featureText, { color: palette.text }]}>
                  {feature}
                </Text>
              </View>
            ))}
          </View>

          {/* Package cards */}
          {packages.length > 0 ? (
            <View style={styles.packagesSection}>
              {packages.map((pkg) => {
                const isSelected =
                  selectedPackage?.identifier === pkg.identifier;
                const savings = getPackageSavings(pkg);
                return (
                  <TouchableOpacity
                    key={pkg.identifier}
                    style={[
                      styles.packageCard,
                      {
                        backgroundColor: palette.card,
                        borderColor: isSelected ? "#5b13ec" : palette.border,
                        borderWidth: isSelected ? 2 : 1,
                      },
                    ]}
                    onPress={() => setSelectedPackage(pkg)}
                    activeOpacity={0.7}
                  >
                    {savings && (
                      <View style={styles.savingsBadge}>
                        <Text style={styles.savingsText}>{savings}</Text>
                      </View>
                    )}
                    <View style={styles.packageInfo}>
                      <Text
                        style={[styles.packageLabel, { color: palette.text }]}
                      >
                        {getPackageLabel(pkg)}
                      </Text>
                      <Text
                        style={[
                          styles.packagePrice,
                          { color: palette.mutedText },
                        ]}
                      >
                        {pkg.product.priceString}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.radioOuter,
                        {
                          borderColor: isSelected ? "#5b13ec" : palette.border,
                        },
                      ]}
                    >
                      {isSelected && <View style={styles.radioInner} />}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : (
            <View style={styles.noOfferings}>
              <Text style={[styles.noOfferingsText, { color: palette.mutedText }]}>
                {loading
                  ? "Loading plans..."
                  : "No subscription plans available at this time."}
              </Text>
              {loading && (
                <ActivityIndicator
                  size="small"
                  color="#5b13ec"
                  style={{ marginTop: 12 }}
                />
              )}
            </View>
          )}

          {/* Subscribe CTA */}
          <TouchableOpacity
            style={[
              styles.ctaButton,
              (!selectedPackage || loading) && styles.ctaButtonDisabled,
            ]}
            onPress={handlePurchase}
            disabled={!selectedPackage || loading}
            activeOpacity={0.8}
          >
            {loading && !restoring ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.ctaText}>Subscribe</Text>
            )}
          </TouchableOpacity>

          {/* Restore */}
          <TouchableOpacity
            style={styles.restoreButton}
            onPress={handleRestore}
            disabled={restoring}
            activeOpacity={0.7}
          >
            {restoring ? (
              <ActivityIndicator size="small" color={palette.mutedText} />
            ) : (
              <Text
                style={[styles.restoreText, { color: palette.mutedText }]}
              >
                Restore Purchases
              </Text>
            )}
          </TouchableOpacity>

          {/* Footer links */}
          <View style={styles.footer}>
            <TouchableOpacity onPress={() => Linking.openURL(TERMS_URL)}>
              <Text style={[styles.footerLink, { color: palette.mutedText }]}>
                Terms of Service
              </Text>
            </TouchableOpacity>
            <Text style={[styles.footerDot, { color: palette.mutedText }]}>
              ·
            </Text>
            <TouchableOpacity onPress={() => Linking.openURL(PRIVACY_URL)}>
              <Text style={[styles.footerLink, { color: palette.mutedText }]}>
                Privacy Policy
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingBottom: 32,
    paddingHorizontal: 20,
  },
  closeButton: {
    alignSelf: "flex-end",
    padding: 4,
    marginBottom: 8,
  },
  branding: {
    alignItems: "center",
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: "#fff",
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 15,
    color: "rgba(255,255,255,0.85)",
    textAlign: "center",
    lineHeight: 22,
  },
  body: {
    paddingHorizontal: 20,
    paddingTop: 28,
  },
  featuresSection: {
    marginBottom: 28,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 16,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  featureText: {
    fontSize: 15,
    flex: 1,
  },
  packagesSection: {
    gap: 12,
    marginBottom: 24,
  },
  packageCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderRadius: 16,
    position: "relative",
    overflow: "hidden",
  },
  savingsBadge: {
    position: "absolute",
    top: 0,
    right: 0,
    backgroundColor: "#5b13ec",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderBottomLeftRadius: 10,
  },
  savingsText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
  },
  packageInfo: {
    flex: 1,
  },
  packageLabel: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 2,
  },
  packagePrice: {
    fontSize: 14,
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#5b13ec",
  },
  noOfferings: {
    alignItems: "center",
    paddingVertical: 32,
  },
  noOfferingsText: {
    fontSize: 14,
    textAlign: "center",
  },
  ctaButton: {
    backgroundColor: "#5b13ec",
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
    marginBottom: 12,
  },
  ctaButtonDisabled: {
    opacity: 0.5,
  },
  ctaText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
  },
  restoreButton: {
    alignItems: "center",
    paddingVertical: 12,
    marginBottom: 20,
  },
  restoreText: {
    fontSize: 14,
    fontWeight: "500",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    paddingBottom: 8,
  },
  footerLink: {
    fontSize: 12,
    textDecorationLine: "underline",
  },
  footerDot: {
    fontSize: 12,
  },
});
