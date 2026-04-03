import { DarkTheme, ThemeProvider } from "@react-navigation/native";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import "react-native-reanimated";

import "../styles/global.css";

import { SplashScreen } from "@/components/splash-screen";
import { AuthProvider, useAuth } from "@/contexts/auth-context";
import { SubscriptionProvider } from "@/contexts/subscription-context";

export const unstable_settings = {
  anchor: "(tabs)",
};

// Auth guard component to handle protected routes
function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, initialized: authInitialized } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (!authInitialized) return;

    const inAuthGroup = segments[0] === "(auth)";

    if (!user && !inAuthGroup) {
      router.replace("/(auth)/sign-in");
      return;
    }

    if (user && inAuthGroup) {
      router.replace("/(tabs)");
    }
  }, [user, authInitialized, segments]);

  if (!authInitialized) {
    return <SplashScreen />;
  }

  return <>{children}</>;
}

function RootLayoutNav() {
  return (
    <ThemeProvider value={DarkTheme}>
      <AuthGuard>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
          <Stack.Screen
            name="record"
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="notes/[id]"
            options={{ title: "Note Details", headerBackTitle: "Home" }}
          />
          <Stack.Screen
            name="summary/[id]"
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="flashcards/[id]"
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="modal"
            options={{ presentation: "modal", title: "Modal" }}
          />
          <Stack.Screen
            name="quiz"
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="quiz-results"
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="oral-exam"
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="topics"
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="certification-readiness"
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="test-setup"
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="toolkit/threads"
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="toolkit/chat/[threadId]"
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="toolkit/resources"
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="toolkit/resources/[resourceId]"
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="toolkit/checklists"
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="toolkit/wx-brief"
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="paywall"
            options={{ headerShown: false, gestureEnabled: false }}
          />
        </Stack>
      </AuthGuard>
      <StatusBar style="light" />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <SubscriptionProvider>
        <RootLayoutNav />
      </SubscriptionProvider>
    </AuthProvider>
  );
}
