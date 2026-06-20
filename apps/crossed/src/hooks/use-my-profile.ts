import useSWR from "swr";
import useSWRMutation from "swr/mutation";
import { useAuth } from "./use-auth";
import { Database } from "types-and-validators";
import { supabase } from "../lib/supabase";

/*
This hook deals with a user's profile in the profiles tables
in supabase. The `userId` column in the profiles table maps 
to the firebase user's uid. 
*/

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
        if (data && data.length > 0) {
          return data[0];
        }
        // Self-heal: the user is authenticated but has no profile row. This
        // happens when sign-up completed Firebase auth but the profile insert
        // failed (e.g. the backend was briefly unavailable). Without a profile
        // the user is stuck — solo/ranked silently do nothing. Create it now.
        const fallbackUsername =
          user.displayName?.trim() || `player_${user.uid.slice(0, 8)}`;
        const { data: created, error: createError } = await supabase
          .from("profiles")
          .upsert({ userId: user.uid, username: fallbackUsername })
          .select()
          .single();
        if (createError) {
          throw createError;
        }
        return created;
      } catch (error) {
        console.error(error);
        throw error;
      }
    }
  });

  const { trigger: createProfile, isMutating: isCreatingProfile } =
    useSWRMutation(
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

  const { trigger: updateProfile, isMutating: isUpdatingProfile } =
    useSWRMutation(
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
    refreshMyProfile,
    isLoadingMyProfile,
    createProfile,
    isCreatingProfile,
    updateProfile,
    isUpdatingProfile,
  };
};
