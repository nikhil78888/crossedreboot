import { Text, View } from "react-native";
import { useSubscriptionInfo } from "../hooks/use-subscription-info";
import Purchases, { PurchasesPackage } from "react-native-purchases";
import { Button } from "../components/Button";
import { useEffect, useState } from "react";
import { LoaderScreen } from "react-native-ui-lib";
import { events, trackEvent } from "../lib/track-event";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { TouchableOpacity } from "react-native-gesture-handler";
import { classNames } from "../lib/utils";
import { Image } from "expo-image";
import { images } from "../lib/images";
import { useNavigation } from "expo-router";

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

const getSubscriptionDuration = (period: string) => {
  switch (period) {
    case "P1M":
      return "1 Month";
    case "P1Y":
      return "1 Year";
    default:
      break;
  }
};

export default function UpgradeToPro() {
  const navigation = useNavigation();
  const [isPurchasing, setIsPurchasing] = useState(false);
  const { avaialbleSubscriptions } = useSubscriptionInfo();
  const { bottom } = useSafeAreaInsets();
  const [purchase, setPurchase] = useState<PurchasesPackage | null>(null);
  useEffect(() => {
    navigation.setOptions({
      headerRight: () => {
        return (
          <Button
            intent={"secondary"}
            mode={"text"}
            size={"sm"}
            label="Restore"
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
        );
      },
    });
  }, []);
  return (
    <View className="flex-1 bg-white px-8" style={{ paddingBottom: bottom }}>
      <Text className="mt-4 text-[44px] leading-none font-[jost700] text-center">
        Upgrade to Crossed pro
      </Text>
      <Text className="mt-3 text-base font-[jost600] text-center">
        Upgrading to Crossed pro gets rid {"\n"} of all ads in the app.
      </Text>
      <View className="mt-9 space-y-5">
        {avaialbleSubscriptions?.map((pack) => {
          const selected = purchase?.identifier === pack.identifier;
          return (
            <TouchableOpacity
              onPress={() => setPurchase(pack)}
              key={pack.identifier}
              className={classNames(
                "flex-row items-center justify-between h-16 w-full pl-6 pr-5 py-2 rounded-2xl",
                selected
                  ? "bg-crossed-yellow-300 border border-crossed-yellow-300"
                  : "bg-cr-gray-350"
              )}
            >
              <View>
                <Text className="font-[jost700] text-sm">
                  {getSubscriptionDuration(
                    pack.product.subscriptionPeriod as string
                  )}
                </Text>
                <Text className="font-[jost300] text-xs tracking-tight">
                  Ad free access for{" "}
                  {getSubscriptionDuration(
                    pack.product.subscriptionPeriod as string
                  )}
                </Text>
              </View>
              <View className="flex-row items-center">
                <View className="items-end">
                  <Text className="font-[montserrat700] text-2xl">
                    {pack.product.priceString}
                  </Text>
                  <Text className="font-[jost300] text-xs tracking-tight -mt-1">
                    /{" "}
                    {getSubscriptionPeriod(
                      pack.product.subscriptionPeriod as string
                    )?.toLowerCase()}
                  </Text>
                </View>
                <Image
                  source={selected ? images.radio : images.radio_light}
                  className="ml-3 h-6 w-6"
                  contentFit="contain"
                />
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
      <View className="absolute bottom-20 inset-x-5">
        <Button
          intent={"primary"}
          size={"lg"}
          rounded={"full"}
          label="Get Now"
          onPress={async () => {
            if (!purchase) {
              return null;
            }
            try {
              trackEvent(events.UPGRADE_CLICK);
              setIsPurchasing(true);
              await Purchases.purchaseStoreProduct(purchase.product);
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
