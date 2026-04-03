import type {
  CustomerInfo,
  PurchasesOfferings,
  PurchasesPackage,
} from "react-native-purchases";

export enum SubscriptionTier {
  Free = "free",
  Premium = "premium",
}

export interface SubscriptionState {
  tier: SubscriptionTier;
  isActive: boolean;
  expirationDate: string | null;
  managementUrl: string | null;
  loading: boolean;
  initialized: boolean;
}

export interface SubscriptionContextType extends SubscriptionState {
  isPremium: boolean;
  customerInfo: CustomerInfo | null;
  offerings: PurchasesOfferings | null;
  purchase: (pkg: PurchasesPackage) => Promise<{ success: boolean; error?: string }>;
  restore: () => Promise<{ success: boolean; error?: string }>;
}
