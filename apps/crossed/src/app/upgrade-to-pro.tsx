import { useState } from "react";
import { ActivityIndicator, Alert, ScrollView, Text, View } from "react-native";
import { TouchableOpacity } from "react-native-gesture-handler";
import { useRouter } from "expo-router";
import { PurchasesPackage } from "react-native-purchases";
import { useSubscription } from "../hooks/use-subscription";
import { Button } from "../components/Button";
import { FREE_COMPETITIVE_PER_DAY } from "../lib/revenuecat";
import colors from "../lib/colors";

const PERKS = [
  "Unlimited ranked, friendly & tournament games",
  "No daily limit",
  "Support an indie crossword app ❤️",
];

export default function UpgradeToPro() {
  const router = useRouter();
  const { isPro, offering, loading, purchase, restore, diagnostic } =
    useSubscription();
  const [busy, setBusy] = useState(false);

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator />
      </View>
    );
  }

  if (isPro) {
    return (
      <View className="flex-1 items-center justify-center bg-white px-8">
        <Text style={{ fontSize: 52 }}>👑</Text>
        <Text className="mt-3 text-2xl font-[jost700] text-center">
          You&apos;re Crossed Pro!
        </Text>
        <Text className="mt-2 text-base font-[jost400] text-center text-crossed-gray-400">
          Unlimited games unlocked. Manage your subscription in your Apple ID
          settings.
        </Text>
        <View className="mt-8 w-full">
          <Button
            label="Back"
            intent="secondary"
            size="lg"
            onPress={() => router.back()}
          />
        </View>
      </View>
    );
  }

  const packages = offering?.availablePackages ?? [];

  const onBuy = async (pkg: PurchasesPackage) => {
    try {
      setBusy(true);
      const ok = await purchase(pkg);
      if (ok) {
        Alert.alert("You're Pro! 🎉", "Enjoy unlimited games.");
        router.back();
      }
    } catch (e) {
      const err = e as { userCancelled?: boolean };
      if (!err.userCancelled) {
        Alert.alert(
          "Purchase failed",
          "Something went wrong — please try again."
        );
      }
    } finally {
      setBusy(false);
    }
  };

  const onRestore = async () => {
    try {
      setBusy(true);
      const ok = await restore();
      Alert.alert(
        ok ? "Restored 🎉" : "Nothing to restore",
        ok
          ? "Your Pro subscription is active."
          : "No active subscription found."
      );
      if (ok) router.back();
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView
      className="flex-1 bg-white px-6"
      contentContainerStyle={{ paddingBottom: 40, paddingTop: 16 }}
    >
      <Text className="text-center" style={{ fontSize: 52 }}>
        👑
      </Text>
      <Text className="mt-2 text-center text-[28px] font-[jost700]">
        Crossed Pro
      </Text>
      <Text className="mt-1 text-center font-[jost400] text-crossed-gray-400">
        You get {FREE_COMPETITIVE_PER_DAY} free competitive games a day. Go Pro
        for unlimited play.
      </Text>

      <View className="mt-6">
        {PERKS.map((p) => (
          <View key={p} className="flex-row items-center mb-2">
            <Text className="text-crossed-green-700 text-lg mr-2">✓</Text>
            <Text className="font-[jost500] text-[15px] flex-1">{p}</Text>
          </View>
        ))}
      </View>

      <View className="mt-6">
        {packages.length === 0 ? (
          <View className="py-4">
            <Text className="text-center font-[jost400] text-crossed-gray-400">
              Plans are loading… if this persists, check your connection.
            </Text>
            {!!diagnostic && (
              <Text className="mt-3 text-center font-[jost400] text-[11px] text-crossed-gray-400">
                {diagnostic}
              </Text>
            )}
          </View>
        ) : (
          packages.map((pkg) => {
            const isAnnual = pkg.packageType === "ANNUAL";
            const blue = colors["crossed-blue"]["450"];
            const title =
              pkg.product.title?.replace(/\s*\(.*\)\s*$/, "") ||
              (isAnnual ? "Yearly" : "Monthly");
            return (
              <TouchableOpacity
                key={pkg.identifier}
                disabled={busy}
                activeOpacity={0.85}
                onPress={() => onBuy(pkg)}
                style={{
                  marginBottom: 14,
                  borderRadius: 16,
                  paddingVertical: 18,
                  paddingHorizontal: 18,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  backgroundColor: isAnnual ? blue : "#ffffff",
                  borderWidth: 2,
                  borderColor: blue,
                  shadowColor: "#000",
                  shadowOpacity: 0.15,
                  shadowRadius: 8,
                  shadowOffset: { width: 0, height: 4 },
                  elevation: 4,
                  opacity: busy ? 0.6 : 1,
                }}
              >
                <View style={{ flex: 1, paddingRight: 12 }}>
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <Text
                      style={{
                        fontFamily: "jost700",
                        fontSize: 18,
                        color: isAnnual ? "#ffffff" : blue,
                      }}
                    >
                      {title}
                    </Text>
                    {isAnnual && (
                      <View
                        style={{
                          marginLeft: 8,
                          backgroundColor: colors["crossed-yellow"]["300"],
                          borderRadius: 999,
                          paddingHorizontal: 8,
                          paddingVertical: 2,
                        }}
                      >
                        <Text style={{ fontFamily: "jost700", fontSize: 10, color: "#1f2937" }}>
                          BEST VALUE
                        </Text>
                      </View>
                    )}
                  </View>
                  <Text
                    style={{
                      marginTop: 3,
                      fontFamily: "jost400",
                      fontSize: 13,
                      color: isAnnual ? "rgba(255,255,255,0.85)" : "#6b7280",
                    }}
                  >
                    {pkg.product.priceString}
                    {isAnnual ? " billed yearly" : " billed monthly"}
                  </Text>
                </View>
                <View
                  style={{
                    backgroundColor: isAnnual ? "#ffffff" : blue,
                    borderRadius: 999,
                    paddingVertical: 9,
                    paddingHorizontal: 18,
                  }}
                >
                  <Text
                    style={{
                      fontFamily: "jost700",
                      fontSize: 15,
                      color: isAnnual ? blue : "#ffffff",
                    }}
                  >
                    Subscribe
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </View>

      <View className="mt-2">
        <Button
          label="Restore Purchases"
          intent="secondary"
          mode="text"
          size="base"
          onPress={onRestore}
        />
      </View>
      <View className="mt-2">
        <Button
          label="Not now"
          intent="secondary"
          size="lg"
          onPress={() => router.back()}
        />
      </View>

      {busy && (
        <View className="mt-4 items-center">
          <ActivityIndicator />
        </View>
      )}

      <Text className="mt-6 text-center font-[jost400] text-[11px] text-crossed-gray-400">
        Subscriptions renew automatically until cancelled. Manage or cancel in
        your Apple ID settings.
      </Text>
    </ScrollView>
  );
}
