import { useEffect, useRef } from "react";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import { Text, View } from "react-native";
import { Button } from "../components/Button";
import { WaitingSpinner } from "../components/WaitingSpinner";
import { useTournamentQueue } from "../hooks/use-tournament-queue";
import { useTournamentAssignment } from "../hooks/use-tournament-assignment";
import { useMyProfile } from "../hooks/use-my-profile";
import { events, trackEvent } from "../lib/track-event";

/*
The tournament lobby: enqueue into tournamentQueue, then wait while the backend
matcher batches players into an 8-person bracket. When seated, drop into the
bracket. Mirrors the ranked lobby. A partial group is bot-filled by the matcher
after a short wait, so a lone player still gets a bracket within ~15s.
*/
export default function TournamentLobby() {
  const router = useRouter();
  const navigation = useNavigation();
  const { variant: variantParam, difficulty: difficultyParam } =
    useLocalSearchParams();
  const variant = variantParam === "SUDOKU" ? "SUDOKU" : "CROSSWORD";
  const difficulty = difficultyParam === "HARD" ? "HARD" : "REGULAR";

  const { myProfile } = useMyProfile();
  const { joinTournamentQueue, leaveTournamentQueue } = useTournamentQueue();
  const { tournamentId } = useTournamentAssignment();

  // Enqueue once — but only after the profile has loaded (joinTournamentQueue
  // no-ops without it). Gating on myProfile so we don't burn the one-shot guard
  // before the profile is ready and then never actually enqueue.
  const joined = useRef(false);
  useEffect(() => {
    if (joined.current || !myProfile) return;
    joined.current = true;
    joinTournamentQueue(variant, difficulty);
    trackEvent(events.TOURNAMENT_ENQUEUED, { variant, difficulty });
  }, [joinTournamentQueue, variant, difficulty, myProfile]);

  // When the matcher seats us, leave the queue and drop into the bracket.
  const entered = useRef(false);
  useEffect(() => {
    if (tournamentId && !entered.current) {
      entered.current = true;
      trackEvent(events.TOURNAMENT_MATCHED, { variant, difficulty });
      leaveTournamentQueue();
      router.replace(`/tournament?tournamentId=${tournamentId}`);
    }
  }, [tournamentId, leaveTournamentQueue, router]);

  // Leave the queue if the player backs out before being seated.
  useEffect(() => {
    const unsubscribe = navigation.addListener("beforeRemove", () => {
      if (!entered.current) leaveTournamentQueue();
    });
    return unsubscribe;
  }, [navigation, leaveTournamentQueue]);

  return (
    <View className="flex-1 bg-white items-center">
      <Text className="mt-7 px-6 text-center font-[jost600] text-base">
        Finding a tournament for you to compete in.
      </Text>
      <View className="mt-10 items-center">
        <Text style={{ fontSize: 64 }}>🏆</Text>
        <View className="mt-6 flex-row items-center">
          <WaitingSpinner />
          <Text className="ml-2 text-sm font-[jost600]">
            matching you into a bracket...
          </Text>
        </View>
        <Text className="mt-3 px-10 text-center font-[jost400] text-xs text-crossed-gray-400">
          We group players into brackets of 8. If it's quiet, we'll fill the
          empty seats with bots near your level.
        </Text>
      </View>
      <View className="absolute bottom-8 inset-x-4">
        <Button
          label="Go back home"
          intent={"secondary"}
          size={"lg"}
          onPress={() => router.back()}
        />
      </View>
    </View>
  );
}
