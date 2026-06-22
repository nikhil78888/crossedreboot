import { useCallback, useEffect, useState } from "react";
import { Platform } from "react-native";
import Purchases, {
  CustomerInfo,
  PurchasesOffering,
  PurchasesPackage,
} from "react-native-purchases";
import { supabase } from "../lib/supabase";
import { useMyProfile } from "./use-my-profile";
import {
  FREE_COMPETITIVE_PER_DAY,
  GATED_GAME_TYPES,
  hasProEntitlement,
} from "../lib/revenuecat";

export const useSubscription = () => {
  const [isPro, setIsPro] = useState(false);
  const [offering, setOffering] = useState<PurchasesOffering | null>(null);
  const [loading, setLoading] = useState(true);
  // Human-readable reason the paywall has no plans, shown on-screen so it can be
  // diagnosed from TestFlight without a Mac/Console.app.
  const [diagnostic, setDiagnostic] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (Platform.OS !== "ios") {
      setLoading(false);
      return;
    }
    try {
      const info = await Purchases.getCustomerInfo();
      setIsPro(hasProEntitlement(info));
      const offerings = await Purchases.getOfferings();
      // Prefer the Current offering, but fall back to ANY offering that has
      // fetchable packages — so the paywall still works if "Current" isn't set
      // in RevenueCat while products clearly exist.
      const chosen =
        offerings.current ??
        Object.values(offerings.all).find(
          (o) => o.availablePackages.length > 0
        ) ??
        null;
      setOffering(chosen);
      const all = Object.keys(offerings.all);
      const count = chosen?.availablePackages.length ?? 0;
      console.info("[RevenueCat] offerings", {
        current: offerings.current?.identifier ?? null,
        chosen: chosen?.identifier ?? null,
        packageCount: count,
        allOfferings: all,
      });
      // Build an on-screen reason when there are no purchasable plans.
      if (count > 0) {
        setDiagnostic(null);
      } else if (all.length === 0) {
        setDiagnostic(
          "No offerings reached the app. Check the RevenueCat API key + bundle ID match this app, and that the Paid Apps Agreement is active in App Store Connect."
        );
      } else {
        setDiagnostic(
          `Offering(s) ${all.join(", ")} returned 0 fetchable products. The products exist in RevenueCat, so this is almost always the App Store Connect side: Paid Apps Agreement not Active, or the IDs (rc_1999_1y / rc_199_1m) don't exactly match the App Store Connect product IDs.`
        );
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.warn("[RevenueCat] getOfferings failed", e);
      setDiagnostic(`Couldn't load plans: ${msg}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    if (Platform.OS !== "ios") return;
    const listener = (info: CustomerInfo) => setIsPro(hasProEntitlement(info));
    Purchases.addCustomerInfoUpdateListener(listener);
    return () => {
      Purchases.removeCustomerInfoUpdateListener(listener);
    };
  }, [refresh]);

  const purchase = useCallback(async (pkg: PurchasesPackage) => {
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    setIsPro(hasProEntitlement(customerInfo));
    return hasProEntitlement(customerInfo);
  }, []);

  const restore = useCallback(async () => {
    const info = await Purchases.restorePurchases();
    setIsPro(hasProEntitlement(info));
    return hasProEntitlement(info);
  }, []);

  return { isPro, offering, loading, purchase, restore, refresh, diagnostic };
};

// Gate for competitive games (ranked/friendly/tournament). Returns whether the
// player can start another one today and how many free games remain.
export const useGameGate = () => {
  const { myProfile } = useMyProfile();
  const { isPro } = useSubscription();

  const checkCanPlay = useCallback(async () => {
    if (isPro) return { allowed: true, remaining: Infinity, isPro: true };
    if (!myProfile)
      return {
        allowed: true,
        remaining: FREE_COMPETITIVE_PER_DAY,
        isPro: false,
      };
    const since = new Date();
    since.setUTCHours(0, 0, 0, 0);
    const { count } = await supabase
      .from("games")
      .select("id, profiles!gamePlayers!inner(id)", {
        count: "exact",
        head: true,
      })
      .in("gameType", GATED_GAME_TYPES as unknown as string[])
      .gte("createdAt", since.toISOString())
      .filter("profiles.id", "eq", myProfile.id);
    const played = count ?? 0;
    return {
      allowed: played < FREE_COMPETITIVE_PER_DAY,
      remaining: Math.max(0, FREE_COMPETITIVE_PER_DAY - played),
      isPro: false,
    };
  }, [isPro, myProfile]);

  return { checkCanPlay };
};
