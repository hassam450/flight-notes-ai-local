import { supabase } from "@/lib/supabase";
import { AuthResult } from "@/types/auth";
import { Platform } from "react-native";

// Lazy load Apple Authentication to avoid errors in Expo Go
let AppleAuthentication: any = null;

const loadAppleAuth = async () => {
  if (AppleAuthentication) return true;

  try {
    const module = await import("expo-apple-authentication");
    AppleAuthentication = module;
    return true;
  } catch (error) {
    console.warn(
      "Apple Authentication not available (likely running in Expo Go):",
      error
    );
    return false;
  }
};

export async function signInWithApple(): Promise<AuthResult> {
  // Apple Sign-In is only available on iOS
  if (Platform.OS !== "ios") {
    return { success: false, error: "Apple Sign-In is only available on iOS" };
  }

  const isAvailable = await loadAppleAuth();

  if (!isAvailable) {
    return {
      success: false,
      error:
        'Apple Sign-In requires a development build. Run "npx expo run:ios" to use this feature.',
    };
  }

  try {
    // Check if Apple Authentication is available
    const isAvailableOnDevice = await AppleAuthentication.isAvailableAsync();
    if (!isAvailableOnDevice) {
      return {
        success: false,
        error: "Apple Sign-In is not available on this device",
      };
    }

    // Request Apple authentication
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });

    const { identityToken, fullName } = credential;

    if (!identityToken) {
      return { success: false, error: "No identity token received from Apple" };
    }

    // Sign in to Supabase with Apple token
    const { error } = await supabase.auth.signInWithIdToken({
      provider: "apple",
      token: identityToken,
    });

    if (error) {
      console.error("Supabase Apple sign-in error:", error);
      return { success: false, error: error.message };
    }

    // If this is a new user, we might want to store their name
    // Note: Apple only provides the name on first sign-in
    if (fullName?.givenName || fullName?.familyName) {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        await supabase.auth.updateUser({
          data: {
            full_name:
              `${fullName.givenName || ""} ${fullName.familyName || ""}`.trim(),
          },
        });
      }
    }

    return { success: true };
  } catch (error: any) {
    console.error("Apple sign-in error:", error);

    // Handle specific error codes
    if (error.code === "ERR_CANCELED") {
      return { success: false, error: "Sign in was cancelled" };
    } else if (error.code === "ERR_INVALID_RESPONSE") {
      return { success: false, error: "Invalid response from Apple" };
    } else if (error.code === "ERR_NOT_HANDLED") {
      return { success: false, error: "Sign in could not be handled" };
    }

    return {
      success: false,
      error: error.message || "Failed to sign in with Apple",
    };
  }
}
