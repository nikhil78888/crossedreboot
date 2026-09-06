import { Text, View } from "react-native";
import { TouchableOpacity } from "react-native-gesture-handler";
import { Image } from "expo-image";
import { images } from "../lib/images";
import { useRouter } from "expo-router";
import { useCallback, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { events, trackEvent } from "../lib/track-event";
import { VariantTabs } from "./VariantTabs";
import { useVariant } from "../hooks/use-variant";
import { ChallengeIntroSheet } from "./ChallengeIntroSheet";
import { DailySection } from "./DailySection";
import colors from "../lib/colors";

// Set once the player has seen the "how a challenge works" explainer, so it only
// shows on their first Challenge tap and then launches straight in after.
const CHALLENGE_INTRO_SEEN_KEY = "challenge_intro_seen_v1";

export const NewGameButtons = () => {
  const router = useRouter();
  const { variant } = useVariant();
  const [showChallengeIntro, setShowChallengeIntro] = useState(false);

  // Every mode first goes to the difficulty picker, which then runs the action
  // (gate check + create/join) with the chosen Regular/Hard. Variant comes from
  // the app-wide VariantTabs selection (read in the difficulty screen).
  const pick = useCallback(
    (mode: string) => router.push(`/select-difficulty?mode=${mode}`),
    [router]
  );
  // Trivia has its own category + level setup instead of the Regular/Hard picker.
  const playSolo = useCallback(
    () =>
      variant === "TRIVIA" ? router.push("/trivia-setup") : pick("SOLO"),
    [variant, router, pick]
  );
  // Friendly skips the difficulty picker entirely: go straight to the waiting
  // screen, which creates the game (random Regular/Hard) and pops the share
  // sheet. One tap → share a link.
  const playFriendly = useCallback(
    () =>
      variant === "TRIVIA"
        ? router.push("/trivia-setup?mode=friendly")
        : router.push("/invite-friend?create=1&autoShare=1"),
    [variant, router]
  );
  const playRanked = useCallback(
    () =>
      variant === "TRIVIA"
        ? router.push("/trivia-setup?mode=ranked")
        : pick("RANKED"),
    [variant, router, pick]
  );
  // Tournaments disabled (2026-08) — see the commented bracket UI below.
  // const playTournament = useCallback(() => pick("TOURNAMENT"), [pick]);
  // const playPrivateTournament = useCallback(
  //   () => pick("PRIVATE_TOURNAMENT"),
  //   [pick]
  // );

  // A challenge is a SOLO solve that you then send. Launch that flow.
  const startChallenge = useCallback(() => {
    trackEvent(events.START_SOLO_GAME_CLICK);
    playSolo();
  }, [playSolo]);

  // First Challenge tap shows the "how it works" explainer; after they've seen
  // it once, tapping the card launches straight into the puzzle.
  const onChallengePress = useCallback(async () => {
    try {
      if (await AsyncStorage.getItem(CHALLENGE_INTRO_SEEN_KEY)) {
        startChallenge();
        return;
      }
    } catch {
      // if the flag can't be read, just show the explainer
    }
    setShowChallengeIntro(true);
  }, [startChallenge]);

  const proceedFromChallengeIntro = useCallback(async () => {
    try {
      await AsyncStorage.setItem(CHALLENGE_INTRO_SEEN_KEY, "1");
    } catch {
      // best-effort — worst case they see the explainer again next time
    }
    setShowChallengeIntro(false);
    startChallenge();
  }, [startChallenge]);

  return (
    <View>
      {/* Daily Duel + streak + goal — the daily-return hook, top of Home. */}
      <DailySection />

      {/* Crosswords / Sudoku tabs — drive every mode button below + leaderboard.
          A touch of vertical padding so the bar isn't jammed between the tiles
          above and the hero below. */}
      <View className="mb-5 mt-3">
        <VariantTabs />
      </View>

      {/* Beat My Time — the HERO. The async "play, then send it" challenge is the
          friend mechanic that actually gets used (live friend matches sit at ~0,
          async challenges are the real, growing usage), so it leads. */}
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={onChallengePress}
        className="rounded-2xl"
        style={{ backgroundColor: "#dcfce7" }}
      >
        <View className="flex-row items-center p-5">
          <View className="flex-1 pr-2">
            <Text className="font-[jost700] text-[22px] text-crossed-gray-900">
              Beat My Time
            </Text>
            <Text className="mt-1 font-[jost400] text-[13px] text-crossed-gray-900/60">
              Solve a puzzle, then send it to a friend to beat.
            </Text>
            <View
              className="mt-3 flex-row items-center self-start rounded-full px-4 py-2"
              style={{ backgroundColor: "#16a34a" }}
            >
              <Text className="font-[jost700] text-[14px] text-white">Play</Text>
              <Text className="ml-1 text-white">→</Text>
            </View>
          </View>
          <Image
            source={images.solo}
            style={{ height: 104, width: 104 }}
            contentFit="contain"
          />
        </View>
      </TouchableOpacity>

      {/* Play a Friend (live) | Play Ranked — half-width cards below the hero. */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "stretch",
          gap: 12,
          marginTop: 12,
        }}
      >
        <View
          style={{
            flex: 1,
            borderRadius: 16,
            backgroundColor: colors["crossed-blue"]["50"],
          }}
        >
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => {
              trackEvent(events.START_RANKED_GAME_CLICK);
              playRanked();
            }}
            style={{ flex: 1, padding: 14 }}
          >
            <Image
              source={images.play_ranked}
              style={{ height: 44, width: 44 }}
              contentFit="contain"
            />
            <Text
              className="mt-2 font-[jost700] text-[15px] text-crossed-gray-900"
              numberOfLines={3}
            >
              Play Ranked
            </Text>
            <Text className="mt-1 font-[jost400] text-[12px] text-crossed-gray-900/55">
              Compete worldwide & climb the leaderboard.
            </Text>
          </TouchableOpacity>
        </View>
        <View style={{ flex: 1, borderRadius: 16, backgroundColor: "#ede9fe" }}>
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => {
              trackEvent(events.START_FRIENDLY_GAME_CLICK);
              playFriendly();
            }}
            style={{ flex: 1, padding: 14 }}
          >
            <Image
              source={images.play_friendly}
              style={{ height: 44, width: 44 }}
              contentFit="contain"
            />
            <Text
              className="mt-2 font-[jost700] text-[15px] text-crossed-gray-900"
              numberOfLines={3}
            >
              Play a Friend
            </Text>
            <Text className="mt-1 font-[jost400] text-[12px] text-crossed-gray-900/55">
              Text a link to play live.
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Tournaments (public + private) disabled (2026-08): not enough concurrent
          players to fill a bracket. Uncomment both blocks to restore. */}
      {/*
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => {
          trackEvent(events.START_RANKED_GAME_CLICK);
          playTournament();
        }}
        style={{
          flexDirection: "row",
          alignItems: "center",
          marginTop: 12,
          borderRadius: 16,
          paddingHorizontal: 20,
          paddingVertical: 16,
          backgroundColor: colors["crossed-yellow"]["300"],
        }}
      >
        <Text style={{ fontSize: 30 }}>🏆</Text>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text className="font-[jost700] text-[18px] text-crossed-gray-900">
            Tournament
          </Text>
          <Text className="font-[jost400] text-[12px] text-crossed-gray-900/70">
            8-player bracket · winner takes the crown
          </Text>
        </View>
        <Text className="text-crossed-gray-900/50 text-xl">›</Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={playPrivateTournament}
        className="mt-2 flex-row items-center justify-center py-2"
      >
        <Text style={{ fontSize: 15 }}>🔒</Text>
        <Text className="ml-1.5 font-[jost600] text-[14px] text-crossed-blue-450">
          Create a private tournament with friends
        </Text>
      </TouchableOpacity>
      */}

      {/* First-time "how a challenge works" explainer */}
      <ChallengeIntroSheet
        visible={showChallengeIntro}
        onStart={proceedFromChallengeIntro}
        onClose={() => setShowChallengeIntro(false)}
      />
    </View>
  );
};
