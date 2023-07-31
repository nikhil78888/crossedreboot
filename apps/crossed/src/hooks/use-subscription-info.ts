import Purchases from "react-native-purchases";
import useSWR from "swr";

export const useSubscriptionInfo = () => {
  const { data } = useSWR("offerings", async () => {
    const offerings = await Purchases.getOfferings();
    const customerInfo = await Purchases.getCustomerInfo();
    return { offerings, customerInfo };
  });

  const avaialbleSubscriptions = data?.offerings.current?.availablePackages;
  const currentSubscription = data?.customerInfo.activeSubscriptions[0];

  return {
    offerings: data?.offerings,
    customerInfo: data?.customerInfo,
    currentSubscription,
    avaialbleSubscriptions,
  };
};
