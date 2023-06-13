import auth from "@react-native-firebase/auth";
import useSWR from "swr";
import useSWRMutation from "swr/mutation";
import axios from "axios";
import { getSupabase } from "../lib/supabase";

export const useAuth = () => {
  const {
    data: user,
    isLoading: isLoadingUser,
    mutate: refreshUser,
    error: fetchUserError,
  } = useSWR("auth-user", async () => {
    try {
      const user = auth().currentUser;
      // const supabase = getSupabase();
      if (user) {
        const firebaseIdToken = await user.getIdToken(true);
        const response = await axios.post(
          "http://localhost:5001/api/auth/login-with-firebase-token",
          { firebaseToken: firebaseIdToken }
        );
        console.log({ supabaseToken: response.data.supabaseToken });
        getSupabase(response.data.supabaseToken);
      }
      return user;
    } catch (error) {
      console.error(error);
      throw error;
    }
  });

  const {
    trigger: setDisplayName,
    isMutating: isSettingDisplayName,
    error: setDisplayNameError,
  } = useSWRMutation(
    "sign-in-anonymously",
    async (_key, { arg }: { arg: { username: string } }) => {
      try {
        const credentials = await auth().signInAnonymously();
        const { user } = credentials;
        await user.updateProfile({ displayName: arg.username });
        const firebaseIdToken = await user.getIdToken(true);
        const response = await axios.post(
          "http://localhost:5001/api/auth/login-with-firebase-token",
          { firebaseToken: firebaseIdToken }
        );
        const supabase = getSupabase(response.data.supabaseToken);
        const { error } = await supabase
          .from("profiles")
          .upsert({ userId: user.uid, username: arg.username });
        if (error) {
          throw error;
        }
        await refreshUser();
      } catch (error) {
        console.error(error);
        throw error;
      }
    }
  );

  const {
    trigger: linkAccount,
    isMutating: isLinkingAccount,
    error: linkAccountError,
  } = useSWRMutation(
    "link-account",
    async (
      _key,
      { arg }: { arg: { name: string; email: string; password: string } }
    ) => {
      try {
        if (user) {
          const credential = auth.EmailAuthProvider.credential(
            arg.email,
            arg.password
          );
          await user.linkWithCredential(credential);
          await refreshUser();
        }
      } catch (error) {
        console.error(error);
        throw error;
      }
    }
  );

  const {
    trigger: signInWithEmail,
    isMutating: isSigningInWithEmail,
    error: signInWithEmailError,
  } = useSWRMutation(
    "sign-in-with-email",
    async (_key, { arg }: { arg: { email: string; password: string } }) => {
      try {
        await auth().signInWithEmailAndPassword(arg.email, arg.password);
        await refreshUser();
      } catch (error) {
        console.error(error);
        throw error;
      }
    }
  );

  const {
    trigger: logout,
    isMutating: isLoggingOut,
    error: logoutError,
  } = useSWRMutation("logout", async (_key) => {
    try {
      await auth().signOut();
      await refreshUser();
      // TODO - sign out from supabase
    } catch (error) {
      console.error(error);
      throw error;
    }
  });

  return {
    user,
    isLoadingUser,
    fetchUserError,
    refreshUser,
    setDisplayName,
    isSettingDisplayName,
    setDisplayNameError,
    linkAccount,
    isLinkingAccount,
    linkAccountError,
    signInWithEmail,
    isSigningInWithEmail,
    signInWithEmailError,
    logout,
    isLoggingOut,
    logoutError,
  };
};
