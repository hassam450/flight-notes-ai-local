import { supabase } from "@/lib/supabase";
import { signInWithApple } from "@/services/auth/apple-auth";
import { signInWithGoogle } from "@/services/auth/google-auth";
import { initRecordingsDb } from "@/services/recorder/recordings-db";
import { migrateLegacyRecordingsForUser } from "@/services/recorder/recordings-migration";
import { AuthContextType, AuthResult, AuthState } from "@/types/auth";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    loading: true,
    initialized: false,
  });

  // Initialize auth state and listen for changes
  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (mounted) {
          setState({
            user: session?.user ?? null,
            session,
            loading: false,
            initialized: true,
          });
        }
      } catch (error) {
        console.error("Error initializing auth:", error);
        if (mounted) {
          setState({
            user: null,
            session: null,
            loading: false,
            initialized: true,
          });
        }
      }
    };

    initializeAuth();

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) {
        setState((prev) => ({
          ...prev,
          user: session?.user ?? null,
          session,
          loading: false,
        }));
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const setupRecordingsStorage = async () => {
      try {
        await initRecordingsDb();
        if (state.user?.id) {
          await migrateLegacyRecordingsForUser(state.user.id);
        }
      } catch (error) {
        console.error("Error setting up recordings storage:", error);
      }
    };

    if (!state.initialized) return;
    void setupRecordingsStorage();
  }, [state.initialized, state.user?.id]);

  const handleGoogleSignIn = useCallback(async (): Promise<AuthResult> => {
    try {
      setState((prev) => ({ ...prev, loading: true }));
      const result = await signInWithGoogle();
      return result;
    } catch (error) {
      return { success: false, error: "Failed to sign in with Google" };
    } finally {
      setState((prev) => ({ ...prev, loading: false }));
    }
  }, []);

  const handleAppleSignIn = useCallback(async (): Promise<AuthResult> => {
    try {
      setState((prev) => ({ ...prev, loading: true }));
      const result = await signInWithApple();
      return result;
    } catch (error) {
      return { success: false, error: "Failed to sign in with Apple" };
    } finally {
      setState((prev) => ({ ...prev, loading: false }));
    }
  }, []);

  const handleEmailSignIn = useCallback(
    async (email: string, password: string): Promise<AuthResult> => {
      try {
        setState((prev) => ({ ...prev, loading: true }));
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          return { success: false, error: error.message };
        }
        return { success: true };
      } catch (error) {
        return { success: false, error: "Failed to sign in with email" };
      } finally {
        setState((prev) => ({ ...prev, loading: false }));
      }
    },
    []
  );

  const handleEmailSignUp = useCallback(
    async (
      email: string,
      password: string,
      fullName: string
    ): Promise<AuthResult> => {
      try {
        setState((prev) => ({ ...prev, loading: true }));
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
            },
          },
        });

        if (error) {
          return { success: false, error: error.message };
        }
        return { success: true };
      } catch (error) {
        return { success: false, error: "Failed to create account" };
      } finally {
        setState((prev) => ({ ...prev, loading: false }));
      }
    },
    []
  );

  const handleSignOut = useCallback(async () => {
    try {
      setState((prev) => ({ ...prev, loading: true }));
      await supabase.auth.signOut();
    } catch (error) {
      console.error("Error signing out:", error);
    } finally {
      setState((prev) => ({ ...prev, loading: false }));
    }
  }, []);

  const handleResetPassword = useCallback(
    async (email: string): Promise<AuthResult> => {
      try {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: "flightnotesai://reset-password",
        });

        if (error) {
          return { success: false, error: error.message };
        }
        return { success: true };
      } catch (error) {
        return { success: false, error: "Failed to send reset email" };
      }
    },
    []
  );

  const handleUpdatePassword = useCallback(
    async (newPassword: string): Promise<AuthResult> => {
      try {
        const { error } = await supabase.auth.updateUser({
          password: newPassword,
        });

        if (error) {
          return { success: false, error: error.message };
        }
        return { success: true };
      } catch (error) {
        return { success: false, error: "Failed to update password" };
      }
    },
    []
  );

  const value: AuthContextType = {
    ...state,
    signInWithGoogle: handleGoogleSignIn,
    signInWithApple: handleAppleSignIn,
    signInWithEmail: handleEmailSignIn,
    signUpWithEmail: handleEmailSignUp,
    signOut: handleSignOut,
    resetPassword: handleResetPassword,
    updatePassword: handleUpdatePassword,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
