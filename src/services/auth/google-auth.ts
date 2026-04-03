import { supabase } from "@/lib/supabase";
import { AuthResult } from "@/types/auth";
import { Platform } from "react-native";

// Lazy load Google Sign-In to avoid errors in Expo Go
let GoogleSignin: any = null;
let statusCodes: any = null;

const loadGoogleSignin = async () => {
  if (GoogleSignin) return true;

  try {
    const module = await import("@react-native-google-signin/google-signin");
    GoogleSignin = module.GoogleSignin;
    statusCodes = module.statusCodes;

    // Configure Google Sign-In
    const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
    const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;

    if (!webClientId) {
      throw new Error(
        "Missing EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID. Google Sign-In requires a Web OAuth client ID."
      );
    }

    GoogleSignin.configure({
      webClientId,
      iosClientId,
      offlineAccess: true,
    });

    return true;
  } catch (error) {
    console.warn(
      "Google Sign-In not available (likely running in Expo Go):",
      error
    );
    return false;
  }
};

export async function signInWithGoogle(): Promise<AuthResult> {
  const isAvailable = await loadGoogleSignin();

  if (!isAvailable) {
    return {
      success: false,
      error:
        'Google Sign-In requires a development build. Run "npx expo run:ios" or "npx expo run:android" to use this feature.',
    };
  }

  try {
    // Check if device supports Google Play Services (Android)
    if (Platform.OS === "android") {
      await GoogleSignin.hasPlayServices();
    }

    // Sign in with Google
    const userInfo = await GoogleSignin.signIn();
    const idToken = userInfo.data?.idToken;

    if (!idToken) {
      return { success: false, error: "No ID token received from Google" };
    }

    // Sign in to Supabase with Google token
    const { error } = await supabase.auth.signInWithIdToken({
      provider: "google",
      token: idToken,
    });

    if (error) {
      console.error("Supabase Google sign-in error:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error: any) {
    console.error("Google sign-in error:", error);

    // Handle specific error codes
    if (error.code === statusCodes?.SIGN_IN_CANCELLED) {
      return { success: false, error: "Sign in was cancelled" };
    } else if (error.code === statusCodes?.IN_PROGRESS) {
      return { success: false, error: "Sign in is already in progress" };
    } else if (error.code === statusCodes?.PLAY_SERVICES_NOT_AVAILABLE) {
      return { success: false, error: "Google Play Services not available" };
    }

    return {
      success: false,
      error: error.message || "Failed to sign in with Google",
    };
  }
}

export async function signOutGoogle(): Promise<void> {
  if (!GoogleSignin) return;

  try {
    await GoogleSignin.signOut();
  } catch (error) {
    console.error("Google sign-out error:", error);
  }
}
