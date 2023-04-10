import auth from "@react-native-firebase/auth";
import useSWR from "swr";

export const useCurrentUser = () => {
  const { data: currentUser, isLoading: loadingCurrentUser } = useSWR(
    "current-user",
    async () => {
      let currentUser = auth().currentUser;
      if (!currentUser) {
        await auth().signInAnonymously();
        currentUser = auth().currentUser;
      }
      return currentUser;
    }
  );

  return {
    currentUser,
    loadingCurrentUser,
  };
};
