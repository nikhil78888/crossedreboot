import { Image } from "expo-image";
import { Text, View } from "react-native";
import { avatars, images } from "../lib/images";
import { Avatar, ProgressBar } from "react-native-ui-lib";
import { useGame } from "../hooks/use-game";
import { useEffect, useState } from "react";
import { addSeconds, differenceInSeconds, intervalToDuration } from "date-fns";
import colors from "../lib/colors";
import { Button } from "./Button";
import { useMyProfile } from "../hooks/use-my-profile";

export const FriendlyCrosswordHeader = ({ gameId }: { gameId: string }) => {
  const { myProfile } = useMyProfile();
  const { opponentProgress, game, opponentUsername, finishGame, forfeitGame } =
    useGame({
      gameId,
    });
  const opponent = game?.players.find((p) => p.id !== myProfile?.id);
  const [timeInGame, setTimeInGame] = useState("");

  useEffect(() => {
    // if game duration is over, end the game, else update time in game
    if (
      (game?.gameType === "FRIENDLY" || game?.gameType === "RANKED") &&
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
        <Text className="ml-1 font-[latoBold] text-sm text-crossed-green-700">
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
        <View className="flex-row items-center justify-between">
          <Avatar
            size={20}
            name={opponentUsername || ""}
            imageStyle={{ backgroundColor: "white" }}
            source={avatars[opponent?.avatar as keyof typeof avatars]}
          />
          <Text className="font-[latoLight] tracking-wider text-xs mb-1">
            @{opponentUsername}
          </Text>
          <Text className="font-[latoBold] tracking-wider text-xs mb-1">
            {opponent?.eloRating}
          </Text>
        </View>
        <View className="mt-1">
          <ProgressBar
            progress={opponentProgress}
            progressColor={colors["crossed-red"]["400"]}
            style={{ height: 12 }}
          />
        </View>
      </View>
      <Button
        intent={"text"}
        size="small"
        label="Leave Game"
        onPress={() => {
          forfeitGame();
        }}
      />
    </View>
  );
};
