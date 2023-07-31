import { Text, View } from "react-native";
import { useSubscriptionInfo } from "../hooks/use-subscription-info";
import Purchases from "react-native-purchases";
import { Button } from "../components/Button";
import { useState } from "react";
import { LoaderScreen } from "react-native-ui-lib";
import { events, trackEvent } from "../lib/track-event";

const getSubscriptionPeriod = (period: string) => {
  switch (period) {
    case "P1M":
      return "Month";
    case "P1Y":
      return "Year";
    default:
      break;
  }
};

export default function UpgradeToPro() {
  const [isPurchasing, setIsPurchasing] = useState(false);
  const { avaialbleSubscriptions } = useSubscriptionInfo();
  return (
    <View className="flex-1 bg-crossed-gray-50">
      <View className="mt-12 flex-row items-center">
        <View className="h-[52px] aspect-square bg-crossed-yellow-300" />
        <Text className="ml-4 pt-4 text-crossed-gray-900 text-3xl font-[besleyMedium] leading-none ">
          Upgrade to {"\n"} Crossed pro
        </Text>
      </View>
      <View className="mt-12 px-5 space-y-5">
        {avaialbleSubscriptions?.map((pack) => {
          return (
            <Button
              key={pack.identifier}
              intent={"primary"}
              size={"large"}
              label={`${pack.product.title} - ${
                pack.product.priceString
              }/${getSubscriptionPeriod(
                pack.product.subscriptionPeriod as string
              )}`}
              onPress={async () => {
                try {
                  trackEvent(events.UPGRADE_CLICK);
                  setIsPurchasing(true);
                  await Purchases.purchaseStoreProduct(pack.product);
                } catch (error) {
                  console.info(error);
                } finally {
                  setIsPurchasing(false);
                }
              }}
            />
          );
        })}
      </View>
      <View className="mt-12 px-5">
        <Button
          intent={"primary"}
          size={"large"}
          label="Restore Purchases"
          onPress={async () => {
            try {
              trackEvent(events.RESTORE_PURCHASES_CLICK);
              setIsPurchasing(true);
              await Purchases.restorePurchases();
            } catch (error) {
              console.info(error);
            } finally {
              setIsPurchasing(false);
            }
          }}
        />
      </View>
      {isPurchasing && (
        <View className="absolute inset-0 h-full w-full bg-black/50">
          <LoaderScreen />
        </View>
      )}
    </View>
  );
}
