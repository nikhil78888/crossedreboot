import { Alert, Text, View } from "react-native";
import { TouchableOpacity } from "react-native-gesture-handler";
import { Image } from "expo-image";
import { images } from "../lib/images";
import { useRouter } from "expo-router";
import { useGame } from "../hooks/use-game";
import { useCallback } from "react";
import { events, trackEvent } from "../lib/track-event";
import { useOnlineStatus } from "../hooks/use-online-status";
import { useTournament } from "../hooks/use-tournament";
import { useGameGate } from "../hooks/use-subscription";
import { useVariant } from "../hooks/use-variant";
import { VariantTabs } from "./VariantTabs";
import colors from "../lib/colors";

export const NewGameButtons = () => {
  const router = useRouter();
  const { joinLobby } = useOnlineStatus();
  const { createFriendlyGame, createSoloGame } = useGame({ gameId: undefined });
  const { joinTournament, joiningTournament, createPrivateTournament } =
    useTournament({
      tournamentId: undefined,
    });
  const { checkCanPlay } = useGameGate();

  // App-wide Crosswords vs Sudoku selection — drives every mode button below and
  // the leaderboard/stats/rank shown elsewhere.
  const { variant } = useVariant();

  // Returns true if the player may start a competitive game; otherwise sends
  // them to the paywall and returns false.
  const passesGate = useCallback(async () => {
    const gate = await checkCanPlay();
    if (!gate.allowed) {
      router.push("/upgrade-to-pro");
      return false;
    }
    return true;
  }, [checkCanPlay, router]);

  const playSolo = useCallback(async () => {
    const gameId = await createSoloGame(variant);
    router.push(`/game?gameId=${gameId}`);
  }, [createSoloGame, router, variant]);

  const playFriendly = useCallback(async () => {
    if (!(await passesGate())) return;
    const gameId = await createFriendlyGame(variant);
    router.push(`/invite-friend?gameId=${gameId}`);
  }, [createFriendlyGame, router, passesGate, variant]);

  const playRanked = useCallback(async () => {
    if (!(await passesGate())) return;
    try {
      await joinLobby(variant);
      router.push(`/ranked-lobby?variant=${variant}`);
    } catch (error) {
      Alert.alert("Could not join Lobby");
    }
  }, [joinLobby, router, passesGate, variant]);

  const playTournament = useCallback(async () => {
    if (!(await passesGate())) return;
    try {
      const id = await joinTournament(variant);
      if (id) {
        router.push(`/tournament?tournamentId=${id}`);
      }
    } catch (error) {
      Alert.alert("Could not join tournament");
    }
  }, [joinTournament, router, passesGate, variant]);

  const playPrivateTournament = useCallback(async () => {
    if (!(await passesGate())) return;
    try {
      const id = await createPrivateTournament(variant);
      if (id) {
        router.push(`/tournament?tournamentId=${id}`);
      }
    } catch (error) {
      Alert.alert("Could not create tournament");
    }
  }, [createPrivateTournament, router, passesGate, variant]);

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

      {/* With Friend / Solo cards */}
      <View style={{ flexDirection: "row", gap: 12, marginTop: 12 }}>
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => {
            trackEvent(events.START_FRIENDLY_GAME_CLICK);
            playFriendly();
          }}
          style={{ flex: 1, borderRadius: 16, padding: 16, backgroundColor: "#ede9fe" }}
        >
          <Image
            source={images.friend}
            style={{ height: 48, width: 48 }}
            contentFit="contain"
          />
          <Text className="mt-3 font-[jost700] text-[16px] text-crossed-gray-900">
            With Your Friend
          </Text>
          <Text className="mt-1 font-[jost400] text-[12px] text-crossed-gray-900/55">
            Invite and challenge your friend.
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => {
            trackEvent(events.START_SOLO_GAME_CLICK);
            playSolo();
          }}
          style={{ flex: 1, borderRadius: 16, padding: 16, backgroundColor: "#dcfce7" }}
        >
          <Image
            source={images.solo}
            style={{ height: 48, width: 48 }}
            contentFit="contain"
          />
          <Text className="mt-3 font-[jost700] text-[16px] text-crossed-gray-900">
            Solo Game
          </Text>
          <Text className="mt-1 font-[jost400] text-[12px] text-crossed-gray-900/55">
            Play at your own pace anytime.
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tournament bar */}
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => {
          trackEvent(events.START_RANKED_GAME_CLICK);
          playTournament();
        }}
        disabled={joiningTournament}
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
            {joiningTournament
              ? "Finding a bracket…"
              : "8-player bracket · winner takes the crown"}
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
