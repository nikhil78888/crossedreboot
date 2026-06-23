import { Image } from "expo-image";
import { Text, View } from "react-native";
import { avatars, images } from "../lib/images";
import { Avatar } from "react-native-ui-lib";
import { useGame } from "../hooks/use-game";
import { useEffect, useState } from "react";
import { addSeconds, differenceInSeconds, intervalToDuration } from "date-fns";
import { useMyProfile } from "../hooks/use-my-profile";
import colors from "../lib/colors";

export const FriendlyCrosswordHeader = ({ gameId }: { gameId: string }) => {
  const { myProfile } = useMyProfile();
  const { opponentProgress, game, opponentUsername, finishGame } = useGame({
    gameId,
  });
  const opponent = game?.players.find((p) => p.id !== myProfile?.id);
  const [timeInGame, setTimeInGame] = useState("");

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
      <View className="w-full flex-row items-center">
        <Avatar
          size={40}
          name={opponentUsername || ""}
          imageStyle={{ backgroundColor: "white" }}
          source={avatars[opponent?.avatar as keyof typeof avatars]}
        />
        <View className="flex-1 mx-2">
          <Text className="font-[jost600] text-[15px]">{opponentUsername}</Text>
          <View
            style={{ height: 10 }}
            className="rounded-full bg-crossed-gray-100 overflow-hidden"
          >
            <View
              style={{
                width: `${Math.max(0, Math.min(100, opponentProgress || 0))}%`,
                height: "100%",
                backgroundColor: colors["crossed-red"]["400"],
              }}
            />
          </View>
        </View>
      </View>
      <View className="flex-row items-center justify-center">
        <Image
          source={images.clock}
          className="h-[17.7px] w-[20.1px]"
          contentFit="contain"
        />
        <Text className="font-[jost600] text-[18px] text-crossed-blue-450">
          {timeInGame || "00:00"}
        </Text>
      </View>
    </View>
  );
};
