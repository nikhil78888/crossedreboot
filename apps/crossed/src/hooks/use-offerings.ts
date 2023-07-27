import Purchases from "react-native-purchases";
import useSWR from "swr";

export const useOfferings = () => {
  const { data: offerings } = useSWR("offerings", async () => {
    const offerings = await Purchases.getOfferings();
    return offerings;
  });

  return { offerings };
};
