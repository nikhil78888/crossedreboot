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
import { useStory } from "../hooks/use-story";
import colors from "../lib/colors";

// Set once the player has seen the "how a challenge works" explainer, so it only
// shows on their first Challenge tap and then launches straight in after.
const CHALLENGE_INTRO_SEEN_KEY = "challenge_intro_seen_v1";

export const NewGameButtons = () => {
  const router = useRouter();
  const { variant } = useVariant();
  const [showChallengeIntro, setShowChallengeIntro] = useState(false);
  const {
    level: storyLevel,
    boss: storyBoss,
    avatar: storyAvatar,
    isBoss: storyIsBoss,
    playStory,
    launching: storyLaunching,
  } = useStory();

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

      {/* Story Mode — the HERO. Big card that anchors the page: the 200-level
          solo ladder that pulls players deep into a session. Shows the level you
          resume at and the boss waiting there. */}
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={playStory}
        disabled={storyLaunching}
        className="flex-row items-center rounded-3xl p-6"
        style={{ backgroundColor: "#ede9fe", minHeight: 188 }}
      >
        <View className="flex-1 pr-4">
          <View className="flex-row flex-wrap items-center" style={{ gap: 8 }}>
            <Text className="font-[jost700] text-[24px] text-crossed-gray-900">
              Story Mode
            </Text>
            <View
              className="rounded-full px-3"
              style={{ backgroundColor: "#7c3aed", paddingVertical: 3 }}
            >
              <Text
                style={{
                  fontFamily: "jost700",
                  fontSize: 13,
                  lineHeight: 18,
                  color: "white",
                }}
              >
                Lv {storyLevel}
              </Text>
            </View>
          </View>
          <Text className="mt-2 font-[jost400] text-[14px] text-crossed-gray-900/60">
            {storyIsBoss ? "⚔️ Boss: " : "Next up: "}
            <Text className="font-[jost600] text-crossed-gray-900/80">
              {storyBoss}
            </Text>
          </Text>
          <View
            className="mt-4 flex-row items-center self-start rounded-full px-5 py-3"
            style={{ backgroundColor: "#7c3aed" }}
          >
            <Text className="font-[jost700] text-[15px] text-white">
              {storyLaunching ? "Loading…" : `Play Level ${storyLevel}`}
            </Text>
            {!storyLaunching && <Text className="ml-1 text-white">→</Text>}
          </View>
        </View>
        <View
          className="items-center justify-center rounded-full"
          style={{
            height: 104,
            width: 104,
            backgroundColor: "white",
            borderWidth: storyIsBoss ? 4 : 3,
            borderColor: storyIsBoss ? "#dc2626" : "#7c3aed",
          }}
        >
          <Text style={{ fontSize: 54, lineHeight: 64 }}>{storyAvatar}</Text>
        </View>
      </TouchableOpacity>

      {/* Play Ranked — the SECOND hero. A big card, on par with Story, so the two
          together fill the first screen. */}
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => {
          trackEvent(events.START_RANKED_GAME_CLICK);
          playRanked();
        }}
        className="mt-4 flex-row items-center rounded-3xl p-6"
        style={{ backgroundColor: colors["crossed-blue"]["50"], minHeight: 172 }}
      >
        <Image
          source={images.play_ranked}
          style={{ height: 104, width: 104 }}
          contentFit="contain"
        />
        <View className="ml-4 flex-1">
          <Text className="font-[jost700] text-[24px] text-crossed-gray-900">
            Play Ranked
          </Text>
          <Text className="mt-1.5 font-[jost400] text-[14px] text-crossed-gray-900/60">
            Compete worldwide & climb the leaderboard.
          </Text>
          <View
            className="mt-4 flex-row items-center self-start rounded-full px-5 py-3"
            style={{ backgroundColor: colors["crossed-blue"]["450"] }}
          >
            <Text className="font-[jost700] text-[15px] text-white">Play</Text>
            <Text className="ml-1 text-white">→</Text>
          </View>
        </View>
      </TouchableOpacity>

      {/* Beat My Time + Play a Friend — side by side, below the fold. Taller cards
          with a vertical layout so they read cleanly at half width. */}
      <View className="mt-4 flex-row" style={{ gap: 12 }}>
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={onChallengePress}
          className="flex-1 rounded-3xl p-4"
          style={{ backgroundColor: "#dcfce7", minHeight: 150 }}
        >
          <Image
            source={images.solo}
            style={{ height: 48, width: 48 }}
            contentFit="contain"
          />
          <Text className="mt-3 font-[jost700] text-[16px] text-crossed-gray-900">
            Beat My Time
          </Text>
          <Text className="mt-1 font-[jost400] text-[12px] text-crossed-gray-900/60">
            Solve, then send it to a friend to beat.
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => {
            trackEvent(events.START_FRIENDLY_GAME_CLICK);
            playFriendly();
          }}
          className="flex-1 rounded-3xl p-4"
          style={{ backgroundColor: "#ede9fe", minHeight: 150 }}
        >
          <Image
            source={images.play_friendly}
            style={{ height: 48, width: 48 }}
            contentFit="contain"
          />
          <Text className="mt-3 font-[jost700] text-[16px] text-crossed-gray-900">
            Play a Friend
          </Text>
          <Text className="mt-1 font-[jost400] text-[12px] text-crossed-gray-900/60">
            Text a link to play live.
          </Text>
        </TouchableOpacity>
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
