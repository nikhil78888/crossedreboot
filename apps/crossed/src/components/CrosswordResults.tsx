import { Image } from "expo-image";
import { ScrollView, Text, View } from "react-native";
import { avatars, images } from "../lib/images";
import { useRouter } from "expo-router";
import { calculateScore, solutionOf, puzzleOf, useGame } from "../hooks/use-game";
import { classNames } from "../lib/utils";
import { ShareAppButton } from "./ShareAppButton";
import { useMyProfile } from "../hooks/use-my-profile";
import { NewGameButtons } from "./NewGameButtons";
import { Button } from "./Button";
import { Avatar } from "react-native-ui-lib";
import { Database, Game } from "types-and-validators";
import { TouchableOpacity } from "react-native-gesture-handler";

export const FriendlyGameResult = ({
  gameId,
  myRating,
  opponentRating,
}: {
  gameId: string;
  myRating: string;
  opponentRating: string;
}) => {
  const router = useRouter();
  const { myProfile } = useMyProfile();
  const { game, playAgainFriendly, playingAgain } = useGame({ gameId });
  if (!myProfile || !game) {
    return null;
  }
  const myPoints =
    game.scores.find((s) => s.profilesId === myProfile.id)?.score || 0;
  const opponent = game.players.find((p) => p.id !== myProfile.id);
  const opponentPoints =
    game.scores.find((s) => s.profilesId === opponent?.id)?.score || 0;

  const result = myPoints > opponentPoints ? "WON" : "LOST";

  return (
    <View className="h-full w-full bg-white">
      <ScrollView
        className="flex-1 px-5"
        contentContainerStyle={{ paddingBottom: 40, paddingTop: 12 }}
      >
        <Text className="text-center font-[jost700] text-[28px]">
          {result === "WON" ? "You aced it!" : "Better Luck Next Time"}
        </Text>
        <View className="mt-3 items-center">
          <Image
            source={result === "WON" ? images.results_win : images.results_lost}
            className="w-[259px] h-[166px]"
          />
          <Text
            className={classNames("text-center text-3xl mt-3.5 font-[jost600]")}
            style={{ fontFamily: "bitterBold" }}
          >
            You get {myPoints} Points
          </Text>
        </View>
        <View className="mt-4">
          <PlayerResultCard
            player={myProfile}
            game={game}
            previousRating={myRating}
          />
          {opponent && (
            <View className="mt-2.5">
              <PlayerResultCard
                player={opponent}
                game={game}
                previousRating={opponentRating}
              />
            </View>
          )}
        </View>
        <Text className="mt-4 text-center text-[28px] font-[jost800] text-crossed-yellow-300">
          Checkout the Answers
        </Text>
        {/* <View className="mt-5 flex-row space-x-4">
          <View className="flex-1">
            <PlayerAnswerButton player={myProfile} game={game} />
          </View>
          <View className="flex-1">
            {opponent && <PlayerAnswerButton player={opponent} game={game} />}
          </View>
        </View> */}
        <View className="mt-5">
          <Button
            intent={"primary"}
            size={"xl"}
            label="Play Again"
            rounded={"full"}
            isLoading={playingAgain}
            onPress={async () => {
              const targetId = await playAgainFriendly();
              if (targetId) {
                router.replace(`/game?gameId=${targetId}`);
              }
            }}
          />
        </View>
        <View className="mt-5">
          <Button
            intent={"primary"}
            size={"xl"}
            label="View Crossword Answers"
            rounded={"full"}
            mode={"outline"}
            onPress={() => {
              router.push(`/view-answers?gameId=${gameId}`);
            }}
          />
        </View>
        <View className="mt-5">
          <Button
            intent={"primary"}
            size={"xl"}
            label="Leave us feedback"
            rounded={"full"}
            mode={"outline"}
            onPress={() => {
              router.push(`/feedback`);
            }}
          />
        </View>
        <View className="mt-5 flex-row">
          <View>
            <View className="absolute bottom-0 inset-x-0 h-3.5 bg-crossed-yellow-200" />
            <Text className="font-[jost600] text-xl text-cr-gray-800">
              Start a New Match!
            </Text>
          </View>
        </View>
        <View className="mt-2">
          <NewGameButtons />
        </View>
        <View className="mt-8">
          <Button
            intent={"primary"}
            size={"xl"}
            label="Go Home"
            rounded={"full"}
            mode={"outline"}
            onPress={() => {
              router.push(`/home`);
            }}
          />
        </View>
        <View className="mt-8">
          <ShareAppButton />
        </View>
      </ScrollView>
    </View>
  );
};

export const SoloGameResult = ({ gameId }: { gameId: string }) => {
  const router = useRouter();
  const { myProfile } = useMyProfile();
  const { game } = useGame({ gameId });
  if (!myProfile || !game) {
    return null;
  }
  const solution = game.gameState?.[myProfile.id]?.solution;
  const correctSolution = solutionOf(game);
  const points = calculateScore({
    solution,
    correctSolution,
    puzzle: puzzleOf(game),
  });
  const result = points === 100 ? "PERFECT_SCORE" : points > 0 ? "WON" : "LOST";
  return (
    <View className="h-full w-full bg-white">
      <ScrollView
        className="flex-1 px-5"
        contentContainerStyle={{ paddingBottom: 40, paddingTop: 12 }}
      >
        <Text className="text-center font-[jost700] text-[28px]">
          {result === "PERFECT_SCORE"
            ? "You aced it!"
            : "Better Luck Next Time"}
        </Text>
        <View className="mt-3 items-center">
          <Image
            source={
              result === "WON" || result === "PERFECT_SCORE"
                ? images.results_win
                : images.results_lost
            }
            className="w-[259px] h-[166px]"
          />
          <Text
            className={classNames("text-center text-3xl mt-3.5 font-[jost600]")}
            style={{ fontFamily: "bitterBold" }}
          >
            You get {points} Points
          </Text>
        </View>
        <Text className="mt-4 text-center text-[28px] font-[jost800] text-crossed-yellow-300">
          Checkout the Answers
        </Text>
        <View className="mt-5">
          <Button
            intent={"primary"}
            size={"xl"}
            label="View Crossword Answers"
            rounded={"full"}
            onPress={() => {
              router.push(`/view-answers?gameId=${gameId}`);
            }}
          />
        </View>
        <View className="mt-5">
          <Button
            intent={"primary"}
            size={"xl"}
            label="Leave us feedback"
            rounded={"full"}
            mode={"outline"}
            onPress={() => {
              router.push(`/feedback`);
            }}
          />
        </View>
        <View className="mt-5 flex-row">
          <View>
            <View className="absolute bottom-0 inset-x-0 h-3.5 bg-crossed-yellow-200" />
            <Text className="font-[jost600] text-xl text-cr-gray-800">
              Start a New Match!
            </Text>
          </View>
        </View>
        <View className="mt-2">
          <NewGameButtons />
        </View>
        <View className="mt-8">
          <Button
            intent={"primary"}
            size={"xl"}
            label="Go Home"
            rounded={"full"}
            mode={"outline"}
            onPress={() => {
              router.push(`/home`);
            }}
          />
        </View>
        <View className="mt-8">
          <ShareAppButton />
        </View>
      </ScrollView>
    </View>
  );
};

type Profile = Database["public"]["Tables"]["profiles"]["Row"];

const PlayerResultCard = ({
  player,
  game,
  previousRating,
}: {
  player: Profile;
  game: Game;
  previousRating: string;
}) => {
  const router = useRouter();
  const isWinner = player.id === game.winnerId;
  return (
    <TouchableOpacity
      onPress={() => {
        router.push(`/view-answers?gameId=${game.id}&playerId=${player.id}`);
      }}
      className="w-full flex-row h-[85px] bg-cr-gray-200 rounded-[20px] px-5 py-3"
    >
      <Avatar
        size={60}
        name={player.username || ""}
        imageStyle={{ backgroundColor: "white" }}
        source={avatars[player.avatar as keyof typeof avatars]}
      />
      <View className="flex-1 ml-3">
        <View className="flex-row items-center justify-between">
          <View className="flex-1">
            <Text className="font-[jost600] text-[18px]">
              {player.username}
            </Text>
            <Text className="font-[jost600] text-sm">
              {previousRating} →
              <Text className="font-[jost600] text-sm text-cr-gray-500">
                {" "}
                {player.eloRating} rating
              </Text>
            </Text>
          </View>
          <Image
            source={isWinner ? images.medal_winner : images.medal}
            className="h-10 w-10"
            contentFit="contain"
          />
        </View>
      </View>
    </TouchableOpacity>
  );
};

export const PlayerAnswerButton = ({
  player,
  game,
  onPress,
}: {
  player: Profile;
  game: Game;
  onPress?: () => void;
}) => {
  const router = useRouter();
  return (
    <TouchableOpacity
      onPress={() => {
        if (onPress) {
          onPress();
        } else {
          router.push(`/view-answers?gameId=${game.id}&playerId=${player.id}`);
        }
      }}
      className="flex-1 flex-row items-center justify-center h-[72px] border border-crossed-yellow-300 rounded-xl"
    >
      <Avatar
        size={40}
        name={player.username || ""}
        imageStyle={{ backgroundColor: "white" }}
        source={avatars[player.avatar as keyof typeof avatars]}
      />
      <Text className="font-[jost600] text-base ml-2">{player.username}</Text>
    </TouchableOpacity>
  );
};
