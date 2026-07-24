import { Pressable, Text, View } from "react-native";
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
  const playFriendly = useCallback(
    () =>
      variant === "TRIVIA"
        ? router.push("/trivia-setup?mode=friendly")
        : pick("FRIENDLY"),
    [variant, router, pick]
  );
  const playRanked = useCallback(
    () =>
      variant === "TRIVIA"
        ? router.push("/trivia-setup?mode=ranked")
        : pick("RANKED"),
    [variant, router, pick]
  );
  const playTournament = useCallback(() => pick("TOURNAMENT"), [pick]);
  const playPrivateTournament = useCallback(
    () => pick("PRIVATE_TOURNAMENT"),
    [pick]
  );

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
      {/* Crosswords / Sudoku tabs — drive every mode button below + leaderboard. */}
      <View className="mb-4">
        <VariantTabs />
      </View>

      {/* Play Ranked hero */}
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => {
          trackEvent(events.START_RANKED_GAME_CLICK);
          playRanked();
        }}
        className="rounded-2xl"
        style={{ backgroundColor: colors["crossed-blue"]["50"] }}
      >
        <View className="flex-row items-center p-5">
          <View className="flex-1 pr-2">
            <Text className="font-[jost700] text-[22px] text-crossed-gray-900">
              Play Ranked
            </Text>
            <Text className="mt-1 font-[jost400] text-[13px] text-crossed-gray-900/60">
              Compete with players worldwide and climb the leaderboard.
            </Text>
            <View
              className="mt-3 flex-row items-center self-start rounded-full px-4 py-2"
              style={{ backgroundColor: colors["crossed-blue"]["450"] }}
            >
              <Text className="font-[jost700] text-[14px] text-white">
                Play Now
              </Text>
              <Text className="ml-1 text-white">→</Text>
            </View>
          </View>
          <Image
            source={images.play_ranked}
            style={{ height: 110, width: 116 }}
            contentFit="contain"
          />
        </View>
      </TouchableOpacity>

      {/* Live Match / Challenge cards. RN Pressable (not RNGH TouchableOpacity)
          as the direct row children: with alignItems:"stretch" + flex:1 they
          fill equal-height columns. RNGH doesn't reliably fill via flex. */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "stretch",
          gap: 12,
          marginTop: 12,
        }}
      >
        <Pressable
          onPress={() => {
            trackEvent(events.START_FRIENDLY_GAME_CLICK);
            playFriendly();
          }}
          style={({ pressed }) => ({
            flex: 1,
            borderRadius: 16,
            padding: 16,
            backgroundColor: "#ede9fe",
            opacity: pressed ? 0.9 : 1,
          })}
        >
          <Image
            source={images.friend}
            style={{ height: 48, width: 48 }}
            contentFit="contain"
          />
          <Text
            className="mt-3 font-[jost700] text-[16px] text-crossed-gray-900"
            numberOfLines={2}
          >
            Live Match
          </Text>
          <Text className="mt-1 font-[jost400] text-[12px] text-crossed-gray-900/55">
            Race a friend in real time.
          </Text>
        </Pressable>
        <Pressable
          onPress={onChallengePress}
          style={({ pressed }) => ({
            flex: 1,
            borderRadius: 16,
            padding: 16,
            backgroundColor: "#dcfce7",
            opacity: pressed ? 0.9 : 1,
          })}
        >
          <Image
            source={images.solo}
            style={{ height: 48, width: 48 }}
            contentFit="contain"
          />
          <Text
            className="mt-3 font-[jost700] text-[16px] text-crossed-gray-900"
            numberOfLines={2}
          >
            Challenge a Friend
          </Text>
          <Text className="mt-1 font-[jost400] text-[12px] text-crossed-gray-900/55">
            Solve a puzzle, then send it for a friend to beat.
          </Text>
        </Pressable>
      </View>

      {/* Tournament bar */}
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

      {/* Private friends-only tournament */}
      <TouchableOpacity
        onPress={playPrivateTournament}
        className="mt-2 flex-row items-center justify-center py-2"
      >
        <Text style={{ fontSize: 15 }}>🔒</Text>
        <Text className="ml-1.5 font-[jost600] text-[14px] text-crossed-blue-450">
          Create a private tournament with friends
        </Text>
      </TouchableOpacity>

      {/* First-time "how a challenge works" explainer */}
      <ChallengeIntroSheet
        visible={showChallengeIntro}
        onStart={proceedFromChallengeIntro}
        onClose={() => setShowChallengeIntro(false)}
      />
    </View>
  );
};
