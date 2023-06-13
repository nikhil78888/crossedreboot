import auth from "@react-native-firebase/auth";
import useSWR from "swr";
import { profileCollection } from "../lib/firebase-collection";

export const useCurrentUser = () => {
  const {
    data,
    isLoading: isLoadingCurrentUser,
    mutate: refreshUser,
    error: fetchCurrentUserError,
  } = useSWR("current-user", async () => {
    const currentUser = auth().currentUser;
    if (currentUser) {
      const profileDocument = await profileCollection
        .doc(currentUser.uid)
        .get();
      const profile = profileDocument.data();
      return {
        profile,
        currentUser,
      };
    }
  });

  if (fetchCurrentUserError) {
    console.error({ fetchCurrentUserError });
  }

  return {
    user: data?.currentUser,
    profile: data?.profile,
    isLoadingCurrentUser,
    refreshUser,
  };
};
