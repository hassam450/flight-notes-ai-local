import * as Burnt from "burnt";
import { useRouter } from "expo-router";
import { useCallback } from "react";

import { useSubscription } from "@/contexts/subscription-context";

export function usePaywallGuard() {
  const router = useRouter();
  const { isPremium } = useSubscription();

  const guardedNavigate = useCallback(
    (href: string) => {
      if (isPremium) {
        router.push(href as any);
        return;
      }

      Burnt.toast({
        title: "Subscribe to access this feature",
        message: "Subscribe to access this feature",
        preset: "error",
        haptic: "warning",
      });

      router.push("/paywall?mode=upgrade");
    },
    [isPremium, router],
  );

  return { guardedNavigate, isPremium };
}
