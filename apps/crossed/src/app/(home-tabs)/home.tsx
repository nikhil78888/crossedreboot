import { ActivityIndicator, View, Text } from "react-native";
import { useNavigation, useRouter } from "expo-router";
import { useEffect } from "react";
import { ShareAppButton } from "../../components/ShareAppButton";
import { useCurrentGame } from "../../hooks/use-current-game";
import { useGame } from "../../hooks/use-game";
import { Button } from "../../components/Button";
import { NewGameButtons } from "../../components/NewGameButtons";
import { ScrollView, TouchableOpacity } from "react-native-gesture-handler";
import { useMyProfile } from "../../hooks/use-my-profile";
import { getRank } from "../../lib/rank";
import { useFriends } from "../../hooks/use-friends";

export default function Home() {
  const { currentGameId, loadingCurrentGameId } = useCurrentGame();
  const { game } = useGame({
    gameId: currentGameId,
  });
  const { myProfile } = useMyProfile();
  const { invites, requests } = useFriends();
  const router = useRouter();
  const navigation = useNavigation();

  const gamePlayState = game?.playState;
  const rank = getRank(myProfile?.eloRating);

  useEffect(() => {
    if (navigation.isFocused()) {
      switch (gamePlayState) {
        case "PLAYING":
          router.push(`/game?gameId=${currentGameId}`);
          break;
        case "WAITING_FOR_OPPONENT":
          router.push(`/invite-friend?gameId=${currentGameId}`);
          break;
        default:
          break;
      }
    }
  }, [currentGameId, gamePlayState, router, navigation]);

  if (loadingCurrentGameId || (currentGameId && !game)) {
    return (
      <View className="flex-1 items-center justify-center px-4 bg-white">
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={{ paddingBottom: 40 }}
      className="flex-1 bg-white px-4"
    >
      {/* Personalized header + rank (taps through to the leaderboard) */}
      <View className="mt-3 mb-1 flex-row items-center justify-between">
        <View className="flex-1 pr-3">
          <Text
            className="font-[jost700] text-[26px] text-crossed-gray-900"
            numberOfLines={1}
          >
            Hi, {myProfile?.username || "there"} 👋
          </Text>
          <Text className="font-[jost400] text-sm text-crossed-gray-400 mt-0.5">
            Ready for a match?
          </Text>
        </View>
        <View className="flex-row items-center">
          <TouchableOpacity
            onPress={() => router.push("/friends")}
            className="items-center rounded-2xl px-3 py-2 bg-crossed-gray-50 mr-2"
          >
            <Text style={{ fontSize: 28 }}>👥</Text>
            <Text className="font-[jost600] text-xs mt-0.5">Friends</Text>
            {!!requests?.length && (
              <View className="absolute -top-1 -right-1 rounded-full bg-crossed-red-500 min-w-[18px] h-[18px] items-center justify-center px-1">
                <Text className="text-white font-[jost700] text-[10px]">
                  {requests.length}
                </Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.push("/leaderboard")}
            className="items-center rounded-2xl px-3 py-2 bg-crossed-gray-50"
          >
            <Text style={{ fontSize: 28 }}>{rank.emoji}</Text>
            <Text
              className="font-[jost600] text-xs mt-0.5"
              style={{ color: rank.color }}
            >
              {rank.label}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Incoming friendly-match invite from a friend */}
      {!!invites?.length && (
        <TouchableOpacity
          onPress={() => router.push(`/join-game?gameId=${invites[0].gameId}`)}
          className="mt-3 rounded-xl bg-crossed-green-100 px-4 py-3 flex-row items-center"
        >
          <Text style={{ fontSize: 22 }}>🎮</Text>
          <Text className="ml-2 flex-1 font-[jost600] text-crossed-gray-900">
            {invites[0].from?.username || "A friend"} invited you to play
          </Text>
          <Text className="font-[jost700] text-crossed-blue-450">Join</Text>
        </TouchableOpacity>
      )}

      <View className="mt-4">
        <NewGameButtons />
      </View>
      <View className="mt-5 w-full">
        <ShareAppButton />
      </View>
      <View className="mt-5">
        <Button
          intent={"secondary"}
          label="Feedback"
          size={"base"}
          onPress={() => router.push("/feedback")}
        />
      </View>
    </ScrollView>
  );
}
