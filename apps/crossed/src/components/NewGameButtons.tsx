import { Text, View } from "react-native";
import { TouchableOpacity } from "react-native-gesture-handler";
import { Image } from "expo-image";
import { images } from "../lib/images";
import { useRouter } from "expo-router";
import { useCallback } from "react";
import { events, trackEvent } from "../lib/track-event";
import { VariantTabs } from "./VariantTabs";
import { useVariant } from "../hooks/use-variant";
import colors from "../lib/colors";

export const NewGameButtons = () => {
  const router = useRouter();
  const { variant } = useVariant();

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
        ? router.push("/trivia-setup?mode=race")
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

      {/* With Friend / Solo cards (flex:1 on wrapper Views so they're equal
          halves and never overflow). */}
      <View style={{ flexDirection: "row", gap: 12, marginTop: 12 }}>
        <View style={{ flex: 1 }}>
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => {
              trackEvent(events.START_FRIENDLY_GAME_CLICK);
              playFriendly();
            }}
            style={{ borderRadius: 16, padding: 16, backgroundColor: "#ede9fe" }}
          >
            <Image
              source={images.friend}
              style={{ height: 48, width: 48 }}
              contentFit="contain"
            />
            <Text
              className="mt-3 font-[jost700] text-[16px] text-crossed-gray-900"
              numberOfLines={1}
            >
              Friendly
            </Text>
            <Text className="mt-1 font-[jost400] text-[12px] text-crossed-gray-900/55">
              Invite a friend to a live race.
            </Text>
          </TouchableOpacity>
        </View>
        <View style={{ flex: 1 }}>
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => {
              trackEvent(events.START_SOLO_GAME_CLICK);
              playSolo();
            }}
            style={{ borderRadius: 16, padding: 16, backgroundColor: "#dcfce7" }}
          >
            <Image
              source={images.solo}
              style={{ height: 48, width: 48 }}
              contentFit="contain"
            />
            <Text
              className="mt-3 font-[jost700] text-[16px] text-crossed-gray-900"
              numberOfLines={1}
            >
              Challenge
            </Text>
            <Text className="mt-1 font-[jost400] text-[12px] text-crossed-gray-900/55">
              Solve it, then send it — beat-my-time, anytime.
            </Text>
          </TouchableOpacity>
        </View>
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
    </View>
  );
};
