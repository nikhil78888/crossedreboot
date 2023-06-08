import auth from "@react-native-firebase/auth";
import useSWR from "swr";
import useSWRMutation from "swr/mutation";
import { profileCollection } from "../firebase-collection";

export const useCurrentUser = () => {
  const {
    data,
    isLoading: isLoadingCurrentUser,
    mutate: refreshUser,
    error: fetchCurrentUserError,
  } = useSWR("current-user", async () => {
    let currentUser = auth().currentUser;
    if (!currentUser) {
      await auth().signInAnonymously();
      currentUser = auth().currentUser;
    }
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

  const { trigger: setUserName, isMutating: isSettingUsername } =
    useSWRMutation(
      "set-username",
      async (key, { arg }: { arg: { username: string } }) => {
        if (data?.currentUser) {
          await profileCollection
            .doc(data.currentUser.uid)
            .set({ username: arg.username }, { merge: true });
          await refreshUser();
        }
      }
    );

  return {
    user: data?.currentUser,
    profile: data?.profile,
    isLoadingCurrentUser,
    refreshUser,
    setUserName,
    isSettingUsername,
  };
};
