import useSWR from "swr";
import useSWRMutation from "swr/mutation";
import { useAuth } from "./use-auth";
import { Database } from "types-and-validators";
import { supabase } from "../lib/supabase";

export const useMyProfile = () => {
  const { user } = useAuth();

  const {
    data: myProfile,
    isLoading: isLoadingMyProfile,
    mutate: refreshMyProfile,
  } = useSWR(user ? "my-profile" : null, async () => {
    if (user) {
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select()
          .eq("userId", user.uid);
        if (error) {
          throw error;
        }
        return data[0];
      } catch (error) {
        console.error(error);
        throw error;
      }
    }
  });

  const { trigger: createProfile } = useSWRMutation(
    user ? "create-profile" : null,
    async (
      _key,
      {
        arg,
      }: {
        arg: Database["public"]["Tables"]["profiles"]["Insert"];
      }
    ) => {
      try {
        const { error } = await supabase.from("profiles").insert(arg);
        if (error) {
          throw error;
        }
        await refreshMyProfile();
      } catch (error) {
        console.error(error);
        throw error;
      }
    }
  );

  const { trigger: updateProfile } = useSWRMutation(
    user ? "update-profile" : null,
    async (
      _key,
      {
        arg,
      }: {
        arg: Database["public"]["Tables"]["profiles"]["Update"];
      }
    ) => {
      try {
        const { error } = await supabase
          .from("profiles")
          .update(arg)
          .eq("userId", arg.userId);
        if (error) {
          throw error;
        }
        await refreshMyProfile();
      } catch (error) {
        console.error(error);
        throw error;
      }
    }
  );

  return {
    myProfile,
    isLoadingMyProfile,
    createProfile,
    updateProfile,
  };
};
