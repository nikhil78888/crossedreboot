import { Image } from "expo-image";
import { Text, View } from "react-native";
import { images } from "../images";
import { ProgressBar } from "react-native-ui-lib";
import { TouchableOpacity } from "react-native-gesture-handler";
import { useGame } from "../hooks/use-game";
import { useEffect, useState } from "react";
import { differenceInSeconds, intervalToDuration } from "date-fns";

export const CrosswordHeader = ({ gameId }: { gameId: string }) => {
  const { opponentProgress, game, opponentUsername, finishGame } = useGame({
    gameId,
  });
  const [timeInGame, setTimeInGame] = useState(() => {
    if (game?.game_type === "FRIENDLY" && game.play_state === "PLAYING") {
      const gameStartedAt = game.startedAt as string;
      const secondsSinceStart = differenceInSeconds(
        new Date(),
        new Date(gameStartedAt)
      );
      const duration = intervalToDuration({
        start: 0,
        end: secondsSinceStart * 1000,
      });
      return `${duration.minutes
        ?.toString()
        .padStart(2, "0")}:${duration.seconds?.toString().padStart(2, "0")}`;
    }
  });

  useEffect(() => {
    if (game?.game_type === "FRIENDLY" && game.play_state === "PLAYING") {
      const interval = setInterval(() => {
        const gameStartedAt = game.startedAt as string;
        const secondsSinceStart = differenceInSeconds(
          new Date(),
          new Date(gameStartedAt)
        );
        if (secondsSinceStart > game.gameDurationInSeconds) {
          finishGame();
          return;
        }
        const duration = intervalToDuration({
          start: 0,
          end: secondsSinceStart * 1000,
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
    game?.game_type,
    game?.play_state,
    game?.startedAt,
    finishGame,
  ]);

  if (!game) {
    return null;
  }

  const getFormattedGameDuration = (seconds: number) => {
    const duration = intervalToDuration({
      start: 0,
      end: seconds * 1000,
    });
    return `${duration.minutes?.toString().padStart(2, "0")}:${duration.seconds
      ?.toString()
      .padStart(2, "0")}`;
  };

  return (
    <View className="flex-row items-center justify-between p-5">
      <View className="flex-row items-center">
        <Image source={images.stop_watch} className="h-5 w-[17.42]" />
        <Text
          className="ml-1 text-crossed-green-700 text-sm"
          style={{ fontFamily: "Lato_700Bold" }}
        >
          {timeInGame}
        </Text>
        <Text
          className=" text-crossed-gray-200 text-sm"
          style={{ fontFamily: "Lato_400Regular" }}
        >
          {" "}
          / {getFormattedGameDuration(game.gameDurationInSeconds)}
        </Text>
      </View>
      <View className="flex-row items-center">
        <View>
          <Text className="text-sm" style={{ fontFamily: "Lato_300Light" }}>
            @{opponentUsername}
          </Text>
          <ProgressBar
            progress={opponentProgress}
            progressColor="#AFD8CA"
            style={{ height: 3 }}
          />
        </View>
        <TouchableOpacity className="bg-crossed-blue-400 h-[30] w-[110] rounded-sm items-center justify-center ml-3">
          <Text
            className="text-white text-sm"
            style={{ fontFamily: "Bitter_700Bold" }}
          >
            Submit Match
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};
