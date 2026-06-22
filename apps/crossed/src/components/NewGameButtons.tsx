import { Alert, Text, View } from "react-native";
import { TouchableOpacity } from "react-native-gesture-handler";
import { Image } from "expo-image";
import { images } from "../lib/images";
import { useRouter } from "expo-router";
import { GameVariant, useGame } from "../hooks/use-game";
import { useCallback, useState } from "react";
import { events, trackEvent } from "../lib/track-event";
import { useOnlineStatus } from "../hooks/use-online-status";
import { useTournament } from "../hooks/use-tournament";
import { useGameGate } from "../hooks/use-subscription";

export const NewGameButtons = () => {
  const router = useRouter();
  const { joinLobby } = useOnlineStatus();
  const { createFriendlyGame, createSoloGame } = useGame({ gameId: undefined });
  const { joinTournament, joiningTournament } = useTournament({
    tournamentId: undefined,
  });
  const { checkCanPlay } = useGameGate();

  // Crossword vs Sudoku: a single toggle that every mode button below respects.
  const [variant, setVariant] = useState<GameVariant>("CROSSWORD");

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

  return (
    <View>
      {/* Crossword / Sudoku toggle — applies to every mode button below. */}
      <View className="mb-4 flex-row rounded-full bg-crossed-gray-100 p-1">
        {(["CROSSWORD", "SUDOKU"] as GameVariant[]).map((v) => {
          const selected = variant === v;
          return (
            <TouchableOpacity
              key={v}
              onPress={() => setVariant(v)}
              className={`flex-1 items-center rounded-full py-2 ${
                selected ? "bg-white shadow" : ""
              }`}
            >
              <Text
                className={`font-[jost600] text-[15px] ${
                  selected ? "text-crossed-blue-450" : "text-crossed-gray-400"
                }`}
              >
                {v === "CROSSWORD" ? "Crossword" : "Sudoku"}
              </Text>
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
    </View>
  );
};
