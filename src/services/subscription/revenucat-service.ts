import { Platform } from "react-native";
import Purchases, {
  LOG_LEVEL,
  type CustomerInfo,
  type PurchasesOfferings,
  type PurchasesPackage,
} from "react-native-purchases";

export const ENTITLEMENT_ID = "Flight Notes AI Pro";

export async function initializeRevenueCat(userId: string): Promise<void> {
  const apiKey = Platform.select({
    ios: process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY,
    android: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY,
  });

  if (!apiKey) {
    console.warn("RevenueCat API key not configured for this platform");
    return;
  }

  if (__DEV__) {
    Purchases.setLogLevel(LOG_LEVEL.DEBUG);
  }

  Purchases.configure({ apiKey, appUserID: userId });
  console.log("RevenueCat configured for user:", userId);
}

export async function getOfferings(): Promise<PurchasesOfferings | null> {
  try {
    const offerings = await Purchases.getOfferings();
    return offerings;
  } catch (error) {
    console.error("Failed to fetch offerings:", error);
    return null;
  }
}

export async function purchasePackage(
  pkg: PurchasesPackage
): Promise<{ customerInfo: CustomerInfo }> {
  const { customerInfo } = await Purchases.purchasePackage(pkg);
  return { customerInfo };
}

export async function restoreTransactions(): Promise<CustomerInfo> {
  const customerInfo = await Purchases.restorePurchases();
  return customerInfo;
}

export async function getCustomerInfo(): Promise<CustomerInfo> {
  return Purchases.getCustomerInfo();
}

export async function logOutRevenueCat(): Promise<void> {
  try {
    if (await Purchases.isConfigured()) {
      await Purchases.logOut();
    }
  } catch (error) {
    console.error("Failed to log out RevenueCat:", error);
  }
}

export function hasActiveEntitlement(customerInfo: CustomerInfo): boolean {
  return (
    typeof customerInfo.entitlements.active[ENTITLEMENT_ID] !== "undefined"
  );
}

export function getExpirationDate(customerInfo: CustomerInfo): string | null {
  const entitlement = customerInfo.entitlements.active[ENTITLEMENT_ID];
  return entitlement?.expirationDate ?? null;
}

export function getManagementUrl(customerInfo: CustomerInfo): string | null {
  return customerInfo.managementURL;
}
