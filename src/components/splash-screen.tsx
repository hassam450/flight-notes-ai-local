import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useRef } from "react";
import { Animated, Dimensions, Image, StyleSheet, Text, View } from "react-native";

const { width, height } = Dimensions.get("window");

export function SplashScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "dark"];

  // Animation values
  const logoScale = useRef(new Animated.Value(1)).current;
  const loadingBarPosition = useRef(new Animated.Value(-100)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Logo pulse animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(logoScale, {
          toValue: 0.98,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(logoScale, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Loading bar animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(loadingBarPosition, {
          toValue: 100,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(loadingBarPosition, {
          toValue: -100,
          duration: 0,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Gradient mesh background */}
      <LinearGradient
        colors={["#161022", "#5b13ec", "#161022"]}
        style={styles.gradientBackground}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      {/* Overlay gradient */}
      <LinearGradient
        colors={["transparent", "rgba(22, 16, 34, 0.8)"]}
        style={styles.overlay}
      />

      {/* Main content */}
      <View style={styles.content}>
        {/* Logo container */}
        <Animated.View
          style={[styles.logoContainer, { transform: [{ scale: logoScale }] }]}
        >
          {/* Outer glow */}
          <View style={styles.logoGlow} />

          {/* Logo image */}
          <Image
            source={require("@/assets/images/ic-logo.png")}
            style={styles.logoImage}
            resizeMode="contain"
          />
        </Animated.View>

        {/* Branding text */}
        <View style={styles.branding}>
          <Text style={styles.brandTitle}>Flight Notes</Text>
          <Text style={styles.brandSubtitle}>AI</Text>
        </View>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.tagline}>Your Co-Pilot for Study</Text>

        {/* Loading bar */}
        <View style={styles.loadingBarContainer}>
          <Animated.View
            style={[
              styles.loadingBar,
              {
                transform: [{ translateX: loadingBarPosition }],
              },
            ]}
          />
        </View>

        <Text style={styles.version}>VERSION 1.0.0</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "space-between",
  },
  gradientBackground: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.8,
  },
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    marginTop: -40,
  },
  logoContainer: {
    alignItems: "center",
    marginBottom: 32,
  },
  logoGlow: {
    position: "absolute",
    width: 128,
    height: 128,
    borderRadius: 64,
    backgroundColor: "#5b13ec",
    opacity: 0.4,
  },
  logoImage: {
    width: 96,
    height: 96,
  },
  branding: {
    alignItems: "center",
  },
  brandTitle: {
    fontSize: 36,
    fontWeight: "bold",
    color: "#fff",
    letterSpacing: -0.5,
    textShadowColor: "rgba(0, 0, 0, 0.3)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  brandSubtitle: {
    fontSize: 24,
    fontWeight: "300",
    color: "#7c45f0",
    letterSpacing: 8,
    marginTop: 4,
  },
  footer: {
    alignItems: "center",
    paddingBottom: 48,
  },
  tagline: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.6)",
    letterSpacing: 1,
    marginBottom: 16,
  },
  loadingBarContainer: {
    width: 192,
    height: 4,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 2,
    overflow: "hidden",
    marginBottom: 16,
  },
  loadingBar: {
    width: 64,
    height: "100%",
    backgroundColor: "#7c45f0",
    borderRadius: 2,
  },
  version: {
    fontSize: 10,
    color: "rgba(255, 255, 255, 0.3)",
    letterSpacing: 2,
  },
});
