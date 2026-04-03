import { Ionicons } from "@expo/vector-icons";
import Constants from "expo-constants";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Colors } from "@/constants/theme";
import { useAuth } from "@/contexts/auth-context";
import { useSubscription } from "@/contexts/subscription-context";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { supabase } from "@/lib/supabase";
import { fetchNotesCount } from "@/services/notes/notes-service";
import {
  fetchReadiness,
  fetchTotalPracticeTime,
} from "@/services/quiz/learning-sessions-service";

const SUPPORT_EMAIL = "support@flightnotesai.com";
const PRIVACY_URL = "https://flightnotesai.com/privacy";
const TERMS_URL = "https://flightnotesai.com/terms";

export default function ProfileScreen() {
  const colorScheme = useColorScheme();
  const palette = Colors[colorScheme ?? "light"];
  const { user, signOut, updatePassword } = useAuth();
  const { isPremium, expirationDate, managementUrl, restore: restorePurchases } = useSubscription();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // Stats
  const [notesCount, setNotesCount] = useState(0);
  const [totalPracticeTime, setTotalPracticeTime] = useState(0);
  const [totalSessions, setTotalSessions] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  // Edit name modal
  const [editNameVisible, setEditNameVisible] = useState(false);
  const [editNameValue, setEditNameValue] = useState("");
  const [savingName, setSavingName] = useState(false);

  // Change password modal (Android)
  const [changePasswordVisible, setChangePasswordVisible] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  const displayName =
    user?.user_metadata?.full_name?.toString().trim() ||
    user?.email?.split("@")[0] ||
    "Pilot";
  const avatarUrl = user?.user_metadata?.avatar_url?.toString();
  const isEmailAuth = user?.app_metadata?.provider === "email";

  const memberSince = user?.created_at
    ? new Date(user.created_at).toLocaleDateString("en-US", {
        month: "short",
        year: "numeric",
      })
    : "";

  const loadData = useCallback(async () => {
    try {
      const [notes, time, readiness] = await Promise.all([
        fetchNotesCount(),
        fetchTotalPracticeTime(),
        fetchReadiness(),
      ]);
      setNotesCount(notes);
      setTotalPracticeTime(time);
      setTotalSessions(
        readiness.reduce((sum, r) => sum + r.totalSessions, 0),
      );
    } catch (error) {
      console.error("Failed to load profile stats:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadData();
    }, [loadData]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const formatPracticeTime = (seconds: number) => {
    if (seconds <= 0) return "0m";
    const hours = Math.floor(seconds / 3600);
    const mins = Math.round((seconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
  };

  // ── Edit Name ────────────────────────────────────────────────────
  const handleEditName = () => {
    setEditNameValue(
      user?.user_metadata?.full_name?.toString().trim() || "",
    );
    setEditNameVisible(true);
  };

  const handleSaveName = async () => {
    const trimmed = editNameValue.trim();
    if (!trimmed) return;

    setSavingName(true);
    try {
      const { error } = await supabase.auth.updateUser({
        data: { full_name: trimmed },
      });
      if (error) {
        Alert.alert("Error", error.message);
      } else {
        setEditNameVisible(false);
      }
    } catch {
      Alert.alert("Error", "Failed to update name.");
    } finally {
      setSavingName(false);
    }
  };

  // ── Change Password ──────────────────────────────────────────────
  const handleChangePassword = () => {
    if (Platform.OS === "ios") {
      Alert.prompt(
        "Change Password",
        "Enter your new password (min 6 characters):",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Update",
            onPress: async (value) => {
              if (!value || value.length < 6) {
                Alert.alert("Error", "Password must be at least 6 characters.");
                return;
              }
              const result = await updatePassword(value);
              if (result.success) {
                Alert.alert("Success", "Password updated successfully.");
              } else {
                Alert.alert("Error", result.error || "Failed to update password.");
              }
            },
          },
        ],
        "secure-text",
      );
    } else {
      setNewPassword("");
      setChangePasswordVisible(true);
    }
  };

  const handleSavePassword = async () => {
    if (newPassword.length < 6) {
      Alert.alert("Error", "Password must be at least 6 characters.");
      return;
    }
    setSavingPassword(true);
    try {
      const result = await updatePassword(newPassword);
      if (result.success) {
        setChangePasswordVisible(false);
        Alert.alert("Success", "Password updated successfully.");
      } else {
        Alert.alert("Error", result.error || "Failed to update password.");
      }
    } finally {
      setSavingPassword(false);
    }
  };

  // ── Logout ───────────────────────────────────────────────────────
  const handleLogout = () => {
    Alert.alert("Log Out", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log Out",
        style: "destructive",
        onPress: async () => {
          setLoggingOut(true);
          try {
            await signOut();
          } catch {
            Alert.alert("Error", "Failed to log out. Please try again.");
          } finally {
            setLoggingOut(false);
          }
        },
      },
    ]);
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      "Delete Account",
      `To delete your account and all associated data, please contact us at ${SUPPORT_EMAIL}`,
      [
        { text: "OK", style: "default" },
        {
          text: "Contact Support",
          onPress: () => Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=Account%20Deletion%20Request`),
        },
      ],
    );
  };

  const appVersion = Constants.expoConfig?.version ?? "1.0.0";

  return (
    <View style={[styles.container, { backgroundColor: palette.background }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{
          paddingTop: insets.top + 8,
          paddingBottom: insets.bottom + 100,
        }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.content}>
          {/* ── User Info Header ── */}
          <View style={styles.userHeader}>
            <View
              style={[
                styles.avatarContainer,
                { borderColor: "rgba(91,19,236,0.5)" },
              ]}
            >
              {avatarUrl ? (
                <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
              ) : (
                <Text style={styles.avatarFallbackText}>
                  {displayName.slice(0, 1).toUpperCase()}
                </Text>
              )}
            </View>
            <Text style={[styles.userName, { color: palette.text }]}>
              {displayName}
            </Text>
            <Text style={[styles.userEmail, { color: palette.mutedText }]}>
              {user?.email ?? ""}
            </Text>
            {memberSince ? (
              <Text style={[styles.memberSince, { color: palette.mutedText }]}>
                Member since {memberSince}
              </Text>
            ) : null}
          </View>

          {/* ── Subscription Status ── */}
          <View
            style={[
              styles.subscriptionCard,
              { backgroundColor: palette.card, borderColor: palette.border },
            ]}
          >
            <View style={styles.subscriptionHeader}>
              <View>
                <Text style={[styles.subscriptionLabel, { color: palette.mutedText }]}>
                  Current Plan
                </Text>
                <Text style={[styles.subscriptionTier, { color: palette.text }]}>
                  {isPremium ? "Premium" : "Free"}
                </Text>
                {isPremium && expirationDate && (
                  <Text style={[styles.subscriptionExpiry, { color: palette.mutedText }]}>
                    Renews {new Date(expirationDate).toLocaleDateString()}
                  </Text>
                )}
              </View>
              <View
                style={[
                  styles.subscriptionBadge,
                  { backgroundColor: isPremium ? "#5b13ec" : "rgba(91,19,236,0.15)" },
                ]}
              >
                <Ionicons
                  name={isPremium ? "star" : "star-outline"}
                  size={18}
                  color={isPremium ? "#fff" : "#5b13ec"}
                />
              </View>
            </View>
            {isPremium ? (
              managementUrl ? (
                <TouchableOpacity
                  style={styles.subscriptionAction}
                  onPress={() => Linking.openURL(managementUrl)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.subscriptionActionText, { color: "#5b13ec" }]}>
                    Manage Subscription
                  </Text>
                  <Ionicons name="open-outline" size={16} color="#5b13ec" />
                </TouchableOpacity>
              ) : null
            ) : (
              <TouchableOpacity
                style={styles.upgradeButton}
                onPress={() => router.push("/paywall?mode=upgrade")}
                activeOpacity={0.8}
              >
                <Text style={styles.upgradeButtonText}>Upgrade to Premium</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* ── Quick Stats ── */}
          <View style={styles.statsRow}>
            <StatCard
              label="Notes"
              value={isLoading ? "–" : String(notesCount)}
              palette={palette}
            />
            <StatCard
              label="Practice"
              value={isLoading ? "–" : formatPracticeTime(totalPracticeTime)}
              palette={palette}
            />
            <StatCard
              label="Sessions"
              value={isLoading ? "–" : String(totalSessions)}
              palette={palette}
            />
          </View>

          {/* ── Account Settings ── */}
          <Text style={[styles.sectionLabel, { color: palette.mutedText }]}>
            ACCOUNT
          </Text>
          <View
            style={[
              styles.menuCard,
              { backgroundColor: palette.card, borderColor: palette.border },
            ]}
          >
            <MenuRow
              icon="person-outline"
              label="Edit Display Name"
              onPress={handleEditName}
              palette={palette}
            />
            <View style={[styles.divider, { backgroundColor: palette.border }]} />
            {isEmailAuth && (
              <>
                <MenuRow
                  icon="lock-closed-outline"
                  label="Change Password"
                  onPress={handleChangePassword}
                  palette={palette}
                />
                <View style={[styles.divider, { backgroundColor: palette.border }]} />
              </>
            )}
            <MenuRow
              icon="bag-handle-outline"
              label="Restore Purchases"
              onPress={async () => {
                const result = await restorePurchases();
                if (result.success && !result.error) {
                  Alert.alert("Restored", "Your purchases have been restored.");
                } else if (result.error) {
                  Alert.alert("Restore", result.error);
                }
              }}
              palette={palette}
            />
            <View style={[styles.divider, { backgroundColor: palette.border }]} />
            <MenuRow
              icon="information-circle-outline"
              label="App Version"
              value={appVersion}
              palette={palette}
            />
          </View>

          {/* ── Support & Legal ── */}
          <Text style={[styles.sectionLabel, { color: palette.mutedText }]}>
            SUPPORT
          </Text>
          <View
            style={[
              styles.menuCard,
              { backgroundColor: palette.card, borderColor: palette.border },
            ]}
          >
            <MenuRow
              icon="mail-outline"
              label="Help & Support"
              onPress={() => Linking.openURL(`mailto:${SUPPORT_EMAIL}`)}
              palette={palette}
            />
            <View style={[styles.divider, { backgroundColor: palette.border }]} />
            <MenuRow
              icon="shield-checkmark-outline"
              label="Privacy Policy"
              onPress={() => Linking.openURL(PRIVACY_URL)}
              palette={palette}
            />
            <View style={[styles.divider, { backgroundColor: palette.border }]} />
            <MenuRow
              icon="document-text-outline"
              label="Terms of Service"
              onPress={() => Linking.openURL(TERMS_URL)}
              palette={palette}
            />
          </View>

          {/* ── Danger Zone ── */}
          <View style={{ marginTop: 28, gap: 12 }}>
            <TouchableOpacity
              style={[
                styles.dangerButton,
                { backgroundColor: palette.card, borderColor: palette.border },
              ]}
              onPress={handleLogout}
              activeOpacity={0.7}
              disabled={loggingOut}
            >
              {loggingOut ? (
                <ActivityIndicator size="small" color={palette.error} />
              ) : (
                <Ionicons name="log-out-outline" size={20} color={palette.error} />
              )}
              <Text style={[styles.dangerButtonText, { color: palette.error }]}>
                {loggingOut ? "Logging out..." : "Log Out"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.dangerButton,
                { backgroundColor: palette.card, borderColor: palette.border },
              ]}
              onPress={handleDeleteAccount}
              activeOpacity={0.7}
            >
              <Ionicons name="trash-outline" size={20} color={palette.error} />
              <Text style={[styles.dangerButtonText, { color: palette.error }]}>
                Delete Account
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* ── Edit Name Modal ── */}
      <Modal
        visible={editNameVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setEditNameVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalContent,
              { backgroundColor: palette.card },
            ]}
          >
            <Text style={[styles.modalTitle, { color: palette.text }]}>
              Edit Display Name
            </Text>
            <TextInput
              style={[
                styles.modalInput,
                {
                  color: palette.text,
                  backgroundColor: palette.inputBackground,
                  borderColor: palette.inputBorder,
                },
              ]}
              value={editNameValue}
              onChangeText={setEditNameValue}
              placeholder="Enter your name"
              placeholderTextColor={palette.mutedText}
              autoFocus
              maxLength={50}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, { borderColor: palette.border, borderWidth: 1 }]}
                onPress={() => setEditNameVisible(false)}
                disabled={savingName}
              >
                <Text style={[styles.modalButtonText, { color: palette.text }]}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalButton,
                  { backgroundColor: "#5b13ec" },
                ]}
                onPress={handleSaveName}
                disabled={savingName || !editNameValue.trim()}
              >
                {savingName ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={[styles.modalButtonText, { color: "#fff" }]}>
                    Save
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Change Password Modal (Android) ── */}
      <Modal
        visible={changePasswordVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setChangePasswordVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalContent,
              { backgroundColor: palette.card },
            ]}
          >
            <Text style={[styles.modalTitle, { color: palette.text }]}>
              Change Password
            </Text>
            <Text style={[styles.modalSubtitle, { color: palette.mutedText }]}>
              Enter your new password (min 6 characters)
            </Text>
            <TextInput
              style={[
                styles.modalInput,
                {
                  color: palette.text,
                  backgroundColor: palette.inputBackground,
                  borderColor: palette.inputBorder,
                },
              ]}
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder="New password"
              placeholderTextColor={palette.mutedText}
              secureTextEntry
              autoFocus
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, { borderColor: palette.border, borderWidth: 1 }]}
                onPress={() => setChangePasswordVisible(false)}
                disabled={savingPassword}
              >
                <Text style={[styles.modalButtonText, { color: palette.text }]}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalButton,
                  { backgroundColor: "#5b13ec" },
                ]}
                onPress={handleSavePassword}
                disabled={savingPassword || newPassword.length < 6}
              >
                {savingPassword ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={[styles.modalButtonText, { color: "#fff" }]}>
                    Update
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ── StatCard ─────────────────────────────────────────────────────────────────

type StatCardProps = {
  label: string;
  value: string;
  palette: (typeof Colors)["light"];
};

function StatCard({ label, value, palette }: StatCardProps) {
  return (
    <View
      style={[
        styles.statCard,
        { backgroundColor: palette.card, borderColor: palette.border },
      ]}
    >
      <Text style={[styles.statValue, { color: palette.text }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: palette.mutedText }]}>
        {label}
      </Text>
    </View>
  );
}

// ── MenuRow ──────────────────────────────────────────────────────────────────

type MenuRowProps = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value?: string;
  onPress?: () => void;
  palette: (typeof Colors)["light"];
};

function MenuRow({ icon, label, value, onPress, palette }: MenuRowProps) {
  const content = (
    <View style={styles.menuRow}>
      <View style={styles.menuRowLeft}>
        <Ionicons name={icon} size={20} color={palette.mutedText} />
        <Text style={[styles.menuRowLabel, { color: palette.text }]}>
          {label}
        </Text>
      </View>
      {value ? (
        <Text style={[styles.menuRowValue, { color: palette.mutedText }]}>
          {value}
        </Text>
      ) : onPress ? (
        <Ionicons name="chevron-forward" size={18} color={palette.mutedText} />
      ) : null}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity activeOpacity={0.7} onPress={onPress}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
}

// ── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
  },

  // User header
  userHeader: {
    alignItems: "center",
    marginBottom: 28,
  },
  avatarContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    borderWidth: 2,
    backgroundColor: "rgba(91,19,236,0.16)",
    marginBottom: 14,
  },
  avatarImage: {
    width: "100%",
    height: "100%",
  },
  avatarFallbackText: {
    color: "#5b13ec",
    fontSize: 28,
    fontWeight: "700",
  },
  userName: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 14,
    marginBottom: 4,
  },
  memberSince: {
    fontSize: 12,
  },

  // Subscription card
  subscriptionCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 28,
  },
  subscriptionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  subscriptionLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  subscriptionTier: {
    fontSize: 20,
    fontWeight: "700",
  },
  subscriptionExpiry: {
    fontSize: 12,
    marginTop: 2,
  },
  subscriptionBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  subscriptionAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 14,
  },
  subscriptionActionText: {
    fontSize: 14,
    fontWeight: "600",
  },
  upgradeButton: {
    backgroundColor: "#5b13ec",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 14,
  },
  upgradeButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },

  // Stats
  statsRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 28,
  },
  statCard: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  statValue: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
  },

  // Section label
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.2,
    marginBottom: 10,
    marginLeft: 4,
  },

  // Menu card
  menuCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
    marginBottom: 24,
  },
  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    height: 50,
    paddingHorizontal: 16,
  },
  menuRowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  menuRowLabel: {
    fontSize: 15,
  },
  menuRowValue: {
    fontSize: 14,
  },
  divider: {
    height: 1,
    marginLeft: 48,
  },

  // Danger buttons
  dangerButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  dangerButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalContent: {
    width: "100%",
    borderRadius: 16,
    padding: 24,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    marginBottom: 16,
  },
  modalInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: "row",
    gap: 12,
  },
  modalButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 12,
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
});
