import useSWR from "swr";
import { useCallback, useMemo } from "react";
import { useMyProfile } from "./use-my-profile";
import {
  loadChallengeResults,
  markChallengeResultsSeen,
  type ChallengeResultRow,
} from "../lib/challenge-utils";

// The original challenger's feedback feed: who accepted their shared challenge
// and whether they beat the time. Polls unseen results; dismissing marks seen.
export const useChallengeResults = () => {
  const { myProfile } = useMyProfile();
  const key = myProfile?.id ? ["challenge-results", myProfile.id] : null;

  const { data, mutate, isLoading } = useSWR<ChallengeResultRow[]>(
    key,
    () => loadChallengeResults(myProfile!.id, { unseenOnly: true }),
    {
      // Re-check when the app/screen regains focus so a challenger sees fresh
      // results on their next open without a manual refresh.
      revalidateOnFocus: true,
      refreshInterval: 60_000,
    }
  );

  const results = useMemo(() => data ?? [], [data]);

  // Optimistically drop dismissed rows, then persist the seen flag.
  const dismiss = useCallback(
    async (ids: string[]) => {
      if (!ids.length) return;
      await mutate(
        (cur) => (cur ?? []).filter((r) => !ids.includes(r.id)),
        { revalidate: false }
      );
      await markChallengeResultsSeen(ids);
    },
    [mutate]
  );

  const dismissAll = useCallback(
    () => dismiss(results.map((r) => r.id)),
    [dismiss, results]
  );

  return { results, isLoading, dismiss, dismissAll, refresh: mutate };
};
