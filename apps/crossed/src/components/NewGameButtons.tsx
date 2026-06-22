import { Alert, Text, View } from "react-native";
import { TouchableOpacity } from "react-native-gesture-handler";
import { Image } from "expo-image";
import { images } from "../lib/images";
import { useRouter } from "expo-router";
import { GameVariant, useGame } from "../hooks/use-game";
import { useCallback } from "react";
import { events, trackEvent } from "../lib/track-event";
import { useOnlineStatus } from "../hooks/use-online-status";
import { useTournament } from "../hooks/use-tournament";
import { useGameGate } from "../hooks/use-subscription";
import { useVariant } from "../hooks/use-variant";
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

  // App-wide Crossword vs Sudoku selection — drives every mode button below and
  // the leaderboard/rank shown elsewhere.
  const { variant, setVariant } = useVariant();

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

  const VARIANTS: {
    key: GameVariant;
    label: string;
    emoji: string;
    blurb: string;
  }[] = [
    { key: "CROSSWORD", label: "Crossword", emoji: "✍️", blurb: "Mini puzzles" },
    { key: "SUDOKU", label: "Sudoku", emoji: "🔢", blurb: "9×9 grids" },
  ];

  return (
    <View>
      {/* Crossword / Sudoku picker — two cards; the selected one drives every
          mode button below and the leaderboard. */}
      <View className="mb-4 flex-row" style={{ gap: 12 }}>
        {VARIANTS.map((v) => {
          const selected = variant === v.key;
          return (
            <TouchableOpacity
              key={v.key}
              activeOpacity={0.85}
              onPress={() => setVariant(v.key)}
              className="flex-1 rounded-2xl px-4 py-3"
              style={{
                backgroundColor: selected
                  ? colors["crossed-blue"]["450"]
                  : "#fff",
                borderWidth: 2,
                borderColor: selected
                  ? colors["crossed-blue"]["450"]
                  : colors["crossed-gray"]["100"],
                shadowColor: "#000",
                shadowOpacity: selected ? 0.18 : 0.05,
                shadowRadius: 8,
                shadowOffset: { width: 0, height: 3 },
                elevation: selected ? 4 : 1,
              }}
            >
              <View className="flex-row items-center">
                <Text style={{ fontSize: 22 }}>{v.emoji}</Text>
                <View className="ml-2 flex-1">
                  <Text
                    className="font-[jost700] text-[16px]"
                    style={{ color: selected ? "#fff" : "#1f2937" }}
                  >
                    {v.label}
                  </Text>
                  <Text
                    className="font-[jost400] text-[11px]"
                    style={{
                      color: selected ? "rgba(255,255,255,0.85)" : "#9ca3af",
                    }}
                  >
                    {v.blurb}
                  </Text>
                </View>
                {selected && (
                  <Text style={{ color: "#fff", fontSize: 14 }}>●</Text>
                )}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
      <TouchableOpacity
        onPress={() => {
          trackEvent(events.START_RANKED_GAME_CLICK);
          playRanked();
        }}
        className="bg-crossed-blue-50 h-[175px] rounded-2xl shadow-md"
      >
        <View className="flex-row items-center">
          <Image
            source={images.play_ranked}
            className="h-[119px] w-[126px] ml-[25] my-6"
          />
          <Text className="ml-7 font-[jost600] text-[26px]">Play Ranked</Text>
        </View>
      </TouchableOpacity>
      <View className="flex-row space-x-4 mt-3">
        <View className="flex-1">
          <TouchableOpacity
            onPress={() => {
              trackEvent(events.START_FRIENDLY_GAME_CLICK);
              playFriendly();
            }}
            className="bg-crossed-blue-50 h-[175px] w-full rounded-2xl shadow-md items-center"
          >
            <Image
              source={images.play_friendly}
              className="h-[94px] w-[94px] mt-[35px]"
            />
            <Text className="mt-2 font-[jost600] text-base">
              With Your Friend
            </Text>
          </TouchableOpacity>
        </View>
        <View className="flex-1">
          <TouchableOpacity
            onPress={() => {
              trackEvent(events.START_SOLO_GAME_CLICK);
              playSolo();
            }}
            className="bg-crossed-blue-50 h-[175px] w-full rounded-2xl shadow-md items-center"
          >
            <Image
              source={images.play_solo}
              className="h-[100px] w-[100px] mt-[25px]"
              contentFit="contain"
            />
            <Text className="mt-2 font-[jost600] text-base">Solo Game</Text>
          </TouchableOpacity>
        </View>
      </View>
      <TouchableOpacity
        onPress={() => {
          trackEvent(events.START_RANKED_GAME_CLICK);
          playTournament();
        }}
        disabled={joiningTournament}
        className="mt-3 bg-crossed-yellow-300 h-[90px] rounded-2xl shadow-md flex-row items-center px-6"
      >
        <Text style={{ fontSize: 38 }}>🏆</Text>
        <View className="ml-4 flex-1">
          <Text className="font-[jost600] text-[22px]">Tournament</Text>
          <Text className="font-[jost400] text-[13px] text-crossed-gray-900/70">
            {joiningTournament
              ? "Finding a bracket…"
              : "8-player bracket · winner takes the crown"}
          </Text>
        </View>
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
