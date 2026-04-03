import {
  SubscriptionContextType,
  SubscriptionState,
  SubscriptionTier,
} from "@/types/subscription";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { AppState } from "react-native";
import Purchases from "react-native-purchases";
import type {
  CustomerInfo,
  PurchasesOfferings,
  PurchasesPackage,
} from "react-native-purchases";
import { useAuth } from "./auth-context";
import {
  getExpirationDate,
  getManagementUrl,
  getOfferings,
  hasActiveEntitlement,
  initializeRevenueCat,
  logOutRevenueCat,
  purchasePackage as rcPurchase,
  restoreTransactions,
} from "@/services/subscription/revenucat-service";

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(
  undefined
);

const initialState: SubscriptionState = {
  tier: SubscriptionTier.Free,
  isActive: false,
  expirationDate: null,
  managementUrl: null,
  loading: true,
  initialized: false,
};

export function SubscriptionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, initialized: authInitialized } = useAuth();
  const [state, setState] = useState<SubscriptionState>(initialState);
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const [offerings, setOfferings] = useState<PurchasesOfferings | null>(null);
  const [configured, setConfigured] = useState(false);

  const updateStateFromCustomerInfo = useCallback((info: CustomerInfo) => {
    const active = hasActiveEntitlement(info);
    setCustomerInfo(info);
    setState((prev) => ({
      ...prev,
      tier: active ? SubscriptionTier.Premium : SubscriptionTier.Free,
      isActive: active,
      expirationDate: getExpirationDate(info),
      managementUrl: getManagementUrl(info),
      loading: false,
      initialized: true,
    }));
  }, []);

  // Initialize RevenueCat when user is available
  useEffect(() => {
    if (!authInitialized) return;

    if (!user) {
      // User signed out — reset state
      if (configured) {
        void logOutRevenueCat();
        setConfigured(false);
      }
      setState({ ...initialState, loading: false, initialized: true });
      setCustomerInfo(null);
      setOfferings(null);
      return;
    }

    let mounted = true;

    const init = async () => {
      try {
        await initializeRevenueCat(user.id);
        setConfigured(true);

        const [info, offers] = await Promise.all([
          Purchases.getCustomerInfo(),
          getOfferings(),
        ]);

        if (!mounted) return;

        updateStateFromCustomerInfo(info);
        setOfferings(offers);
      } catch (error) {
        console.error("Failed to initialize subscriptions:", error);
        if (mounted) {
          setState((prev) => ({
            ...prev,
            loading: false,
            initialized: true,
          }));
        }
      }
    };

    void init();

    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authInitialized, user?.id, updateStateFromCustomerInfo, configured]);

  // Listen for customer info updates
  useEffect(() => {
    if (!configured) return;

    const listener = (info: CustomerInfo) => {
      updateStateFromCustomerInfo(info);
    };

    Purchases.addCustomerInfoUpdateListener(listener);

    return () => {
      Purchases.removeCustomerInfoUpdateListener(listener);
    };
  }, [configured, updateStateFromCustomerInfo]);

  // Refresh subscription status when app comes to foreground
  useEffect(() => {
    if (!configured) return;

    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active") {
        console.log("[Subscription] App foregrounded, refreshing status...");
        Purchases.getCustomerInfo()
          .then((info) => {
            const active = hasActiveEntitlement(info);
            console.log("[Subscription] Refreshed — active:", active, "entitlements:", Object.keys(info.entitlements.active));
            updateStateFromCustomerInfo(info);
          })
          .catch((err) =>
            console.error("[Subscription] Failed to refresh status:", err)
          );
      }
    });

    return () => subscription.remove();
  }, [configured, updateStateFromCustomerInfo]);

  const purchase = useCallback(
    async (
      pkg: PurchasesPackage
    ): Promise<{ success: boolean; error?: string }> => {
      try {
        setState((prev) => ({ ...prev, loading: true }));
        const { customerInfo: info } = await rcPurchase(pkg);
        updateStateFromCustomerInfo(info);
        return { success: hasActiveEntitlement(info) };
      } catch (error: any) {
        if (error.userCancelled) {
          return { success: false };
        }
        return {
          success: false,
          error: error.message || "Purchase failed",
        };
      } finally {
        setState((prev) => ({ ...prev, loading: false }));
      }
    },
    [updateStateFromCustomerInfo]
  );

  const restore = useCallback(async (): Promise<{
    success: boolean;
    error?: string;
  }> => {
    try {
      setState((prev) => ({ ...prev, loading: true }));
      const info = await restoreTransactions();
      updateStateFromCustomerInfo(info);
      const active = hasActiveEntitlement(info);
      return {
        success: true,
        error: active
          ? undefined
          : "No active subscriptions found to restore.",
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || "Failed to restore purchases",
      };
    } finally {
      setState((prev) => ({ ...prev, loading: false }));
    }
  }, [updateStateFromCustomerInfo]);

  const value: SubscriptionContextType = {
    ...state,
    isPremium: state.tier === SubscriptionTier.Premium && state.isActive,
    customerInfo,
    offerings,
    purchase,
    restore,
  };

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  const context = useContext(SubscriptionContext);
  if (context === undefined) {
    throw new Error(
      "useSubscription must be used within a SubscriptionProvider"
    );
  }
  return context;
}
