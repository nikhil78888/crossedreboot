import { Image } from "expo-image";
import { Text, View } from "react-native";
import { avatars, images } from "../lib/images";
import { Avatar } from "react-native-ui-lib";
import {
  calculateScore,
  puzzleOf,
  solutionOf,
  useGame,
} from "../hooks/use-game";
import { useEffect, useState } from "react";
import { addSeconds, differenceInSeconds, intervalToDuration } from "date-fns";
import { useMyProfile } from "../hooks/use-my-profile";
import { RaceBar } from "./RaceBar";

export const FriendlyCrosswordHeader = ({ gameId }: { gameId: string }) => {
  const { myProfile } = useMyProfile();
  const { opponentProgress, game, opponentUsername, finishGame } = useGame({
    gameId,
  });
  const opponent = game?.players.find((p) => p.id !== myProfile?.id);
  const [timeInGame, setTimeInGame] = useState("");

  // The player's own live progress, so the header shows the actual head-to-head
  // race (was previously only the opponent's bar).
  const myProgress =
    myProfile && game
      ? calculateScore({
          correctSolution: solutionOf(game),
          solution: game.gameState?.[myProfile.id]?.solution,
          puzzle: puzzleOf(game),
        })
      : 0;

  useEffect(() => {
    // if game duration is over, end the game, else update time in game
    if (
      (game?.gameType === "FRIENDLY" ||
        game?.gameType === "RANKED" ||
        game?.gameType === "TOURNAMENT") &&
      game.playState === "PLAYING" &&
      game.startedAt
    ) {
      const interval = setInterval(() => {
        const gameStartedAt = game.startedAt as string;
        const secondsLeft = differenceInSeconds(
          addSeconds(new Date(`${gameStartedAt}Z`), game.gameDurationInSeconds),
          new Date(new Date().toUTCString())
        );
        if (secondsLeft < 0) {
          finishGame();
          return;
        }
        const duration = intervalToDuration({
          start: 0,
          end: secondsLeft * 1000,
        });
        setTimeInGame(
          `${duration.minutes?.toString().padStart(2, "0")}:${duration.seconds
            ?.toString()
            .padStart(2, "0")}`
        );
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [
    game?.gameDurationInSeconds,
    game?.gameType,
    game?.playState,
    game?.startedAt,
    finishGame,
  ]);

  if (!game) {
    return null;
  }

  return (
    <View>
      {/* Timer */}
      <View className="mb-3 flex-row items-center justify-center">
        <Image
          source={images.clock}
          className="h-[17.7px] w-[20.1px]"
          contentFit="contain"
        />
        <Text className="ml-1.5 font-[jost700] text-[19px] text-crossed-blue-450">
          {timeInGame || "00:00"}
        </Text>
      </View>

      {/* Opponent — the threat */}
      <View className="w-full flex-row items-center">
        <Avatar
          size={34}
          name={opponentUsername || ""}
          imageStyle={{ backgroundColor: "white" }}
          source={avatars[opponent?.avatar as keyof typeof avatars]}
        />
        <View className="ml-2.5 flex-1">
          <Text
            className="mb-1 font-[jost600] text-[12px] text-crossed-gray-500"
            numberOfLines={1}
          >
            {opponentUsername || "Opponent"}
          </Text>
          <RaceBar progress={opponentProgress} />
        </View>
      </View>

      {/* You */}
      <View className="mt-2.5 w-full flex-row items-center">
        <View style={{ width: 34 }} className="items-center">
          <Text className="font-[jost700] text-[12px] text-crossed-blue-450">
            YOU
          </Text>
        </View>
        <View className="ml-2.5 flex-1">
          <RaceBar progress={myProgress} hot />
        </View>
      </View>
    </View>
  );
};
