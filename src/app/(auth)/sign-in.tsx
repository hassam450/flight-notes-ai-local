import { useAuth } from "@/contexts/auth-context";
import { FontAwesome, MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useEffect, useRef } from "react";
import {
  ActivityIndicator,
  Animated,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function SignInScreen() {
  const { signInWithGoogle, signInWithApple, loading } = useAuth();
  const floatAnim = useRef(new Animated.Value(0)).current;

  // Floating animation for logo
  useEffect(() => {
    const floatAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: 1,
          duration: 3000,
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 3000,
          useNativeDriver: true,
        }),
      ])
    );
    floatAnimation.start();
    return () => floatAnimation.stop();
  }, []);

  const floatY = floatAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -10],
  });

  const handleGoogleSignIn = async () => {
    const result = await signInWithGoogle();
    if (result.success) {
      router.replace("/(tabs)");
    }
  };

  const handleAppleSignIn = async () => {
    const result = await signInWithApple();
    if (result.success) {
      router.replace("/(tabs)");
    }
  };

  const handleEmailSignIn = () => {
    router.push("/(auth)/email-sign-in");
  };

  return (
    <View style={styles.container}>
      {/* Background gradient */}
      <LinearGradient
        colors={["#161022", "#1e162e", "#161022"]}
        style={styles.gradientBackground}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      {/* Grid pattern overlay */}
      <View style={styles.gridOverlay} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Logo and branding with floating animation */}
        <Animated.View
          style={[styles.header, { transform: [{ translateY: floatY }] }]}
        >
          <View style={styles.logoContainer}>
            <View style={styles.logoGlowOuter} />
            <View style={styles.logoGlow} />
            <Image
              source={require("@/assets/images/ic-logo.png")}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>
          <Text style={styles.title}>
            Flight Notes <Text style={styles.titleAccent}>AI</Text>
          </Text>
          <Text style={styles.subtitle}>
            Your AI Co-Pilot for study & oral exam prep.
          </Text>
        </Animated.View>

        {/* Auth buttons */}
        <View style={styles.buttonContainer}>
          {/* Apple Sign In */}
          {Platform.OS === "ios" && (
            <TouchableOpacity
              style={styles.appleButton}
              onPress={handleAppleSignIn}
              disabled={loading}
              activeOpacity={0.9}
            >
              <View style={styles.buttonContent}>
                <MaterialIcons name="apple" size={20} color="#000" />
                <Text style={styles.appleButtonText}>Continue with Apple</Text>
              </View>
            </TouchableOpacity>
          )}

          {/* Google Sign In */}
          <TouchableOpacity
            style={styles.googleButton}
            onPress={handleGoogleSignIn}
            disabled={loading}
            activeOpacity={0.9}
          >
            <View style={styles.buttonContent}>
              <FontAwesome name="google" size={20} color="#4285F4" />
              <Text style={styles.googleButtonText}>Continue with Google</Text>
            </View>
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Email Sign In */}
          <TouchableOpacity
            style={styles.emailLink}
            onPress={handleEmailSignIn}
            activeOpacity={0.8}
          >
            <MaterialIcons
              name="mail"
              size={18}
              color="#5b13ec"
              style={styles.emailIcon}
            />
            <Text style={styles.emailLinkText}>Sign in with Email</Text>
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>By continuing, you agree to our</Text>
          <View style={styles.footerLinks}>
            <TouchableOpacity>
              <Text style={styles.footerLink}>Terms of Service</Text>
            </TouchableOpacity>
            <Text style={styles.footerText}> & </Text>
            <TouchableOpacity>
              <Text style={styles.footerLink}>Privacy Policy</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Loading overlay */}
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#5b13ec" />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#161022",
  },
  gradientBackground: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  gridOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.05,
    backgroundColor: "transparent",
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 100,
    paddingBottom: 40,
    justifyContent: "space-between",
    minHeight: "100%",
  },
  header: {
    alignItems: "center",
    marginTop: 40,
  },
  logoContainer: {
    marginBottom: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  logoGlowOuter: {
    position: "absolute",
    width: 88,
    height: 88,
    borderRadius: 22,
    backgroundColor: "transparent",
    shadowColor: "#5b13ec",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 10,
  },
  logoGlow: {
    position: "absolute",
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: "#5b13ec",
    opacity: 0.2,
  },
  logoImage: {
    width: 80,
    height: 80,
  },
  title: {
    fontSize: 30,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 12,
    letterSpacing: -0.5,
  },
  titleAccent: {
    color: "#5b13ec",
  },
  subtitle: {
    fontSize: 17,
    color: "rgba(255, 255, 255, 0.5)",
    textAlign: "center",
    maxWidth: 260,
    lineHeight: 24,
  },
  buttonContainer: {
    width: "100%",
    marginTop: "auto",
    marginBottom: 32,
  },
  appleButton: {
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingVertical: 18,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  appleButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000",
  },
  googleButton: {
    backgroundColor: "#251e35",
    borderRadius: 12,
    paddingVertical: 18,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(91, 19, 236, 0.2)",
  },
  googleButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
  iconWrapper: {
    width: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  googleIconWrapper: {
    width: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
  dividerText: {
    color: "rgba(255, 255, 255, 0.4)",
    paddingHorizontal: 16,
    fontSize: 14,
  },
  emailLink: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
  },
  emailIcon: {
    marginRight: 8,
  },
  emailLinkText: {
    color: "#5b13ec",
    fontSize: 15,
    fontWeight: "600",
  },
  footer: {
    alignItems: "center",
    paddingBottom: 16,
  },
  footerText: {
    color: "rgba(255, 255, 255, 0.35)",
    fontSize: 12,
  },
  footerLinks: {
    flexDirection: "row",
    marginTop: 4,
  },
  footerLink: {
    color: "rgba(255, 255, 255, 0.5)",
    fontSize: 12,
    textDecorationLine: "underline",
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(22, 16, 34, 0.8)",
    alignItems: "center",
    justifyContent: "center",
  },
});
