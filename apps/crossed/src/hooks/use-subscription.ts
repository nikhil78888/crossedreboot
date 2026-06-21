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

  const refresh = useCallback(async () => {
    if (Platform.OS !== "ios") {
      setLoading(false);
      return;
    }
    try {
      const info = await Purchases.getCustomerInfo();
      setIsPro(hasProEntitlement(info));
      const offerings = await Purchases.getOfferings();
      setOffering(offerings.current);
    } catch (e) {
      // offline / not configured yet — leave defaults
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

  return { isPro, offering, loading, purchase, restore, refresh };
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
