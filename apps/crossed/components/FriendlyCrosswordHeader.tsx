import { Image } from "expo-image";
import { Text, View } from "react-native";
import { images } from "../lib/images";
import { ProgressBar } from "react-native-ui-lib";
import { useGame } from "../hooks/use-game";
import { useEffect, useState } from "react";
import { addSeconds, differenceInSeconds, intervalToDuration } from "date-fns";

export const FriendlyCrosswordHeader = ({ gameId }: { gameId: string }) => {
  const { opponentProgress, game, opponentUsername, finishGame } = useGame({
    gameId,
  });
  const [timeInGame, setTimeInGame] = useState("");

  useEffect(() => {
    // if game duration is over, end the game, else update time in game
    if (
      game?.game_type === "FRIENDLY" &&
      game.play_state === "PLAYING" &&
      game.startedAt
    ) {
      const interval = setInterval(() => {
        const gameStartedAt = game.startedAt as string;
        const secondsLeft = differenceInSeconds(
          addSeconds(new Date(gameStartedAt), game.gameDurationInSeconds),
          new Date()
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
    game?.game_type,
    game?.play_state,
    game?.startedAt,
    finishGame,
  ]);

  if (!game) {
    return null;
  }

  // const getFormattedGameDuration = (seconds: number) => {
  //   const duration = intervalToDuration({
  //     start: 0,
  //     end: seconds * 1000,
  //   });
  //   return `${duration.minutes?.toString().padStart(2, "0")}:${duration.seconds
  //     ?.toString()
  //     .padStart(2, "0")}`;
  // };

  return (
    <View className="flex-row items-center justify-between">
      <View className="flex-row items-center">
        <Image source={images.stop_watch} className="h-5 w-[17.42]" />
        <Text
          className="ml-1 text-crossed-green-700 text-sm"
          style={{ fontFamily: "Lato_700Bold" }}
        >
          {timeInGame}
        </Text>
        {/* <Text
          className=" text-crossed-gray-200 text-sm"
          style={{ fontFamily: "Lato_400Regular" }}
        >
          {" "}
          / {getFormattedGameDuration(game.gameDurationInSeconds)}
        </Text> */}
      </View>
      <View className="w-1/2">
        <Text className="text-sm" style={{ fontFamily: "Lato_300Light" }}>
          @{opponentUsername}
        </Text>
        <ProgressBar
          progress={opponentProgress}
          progressColor="#AFD8CA"
          style={{ height: 5 }}
        />
      </View>
    </View>
  );
};
