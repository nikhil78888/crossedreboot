import { ActivityIndicator, Alert, Text, View } from "react-native";
import { Image } from "expo-image";
import { useNavigation, useRouter } from "expo-router";
import { useEffect } from "react";
import { PlayFriendlyButton } from "../../components/PlayFriendlyButton";
import { PlaySoloButton } from "../../components/PlaySoloButton";
import { ShareAppButton } from "../../components/ShareAppButton";
import { useCurrentGame } from "../../hooks/use-current-game";
import { useGame } from "../../hooks/use-game";
import { useStats } from "../../hooks/use-stats";
import { images } from "../../lib/images";
import { useMyProfile } from "../../hooks/use-my-profile";
import { PlayRankedButton } from "../../components/PlayRankedButton";

export default function Home() {
  const { stats } = useStats();
  const { myProfile } = useMyProfile();
  const { currentGameId, loadingCurrentGameId } = useCurrentGame();
  const { createSoloGame, createFriendlyGame, game } = useGame({
    gameId: currentGameId,
  });
  const router = useRouter();
  const navigation = useNavigation();

  const gamePlayState = game?.playState;

  useEffect(() => {
    if (navigation.isFocused()) {
      // if game exists, redirect to correct game screen
      switch (gamePlayState) {
        case "PLAYING":
          router.push(`/game?gameId=${currentGameId}`);
          break;
        // case "COMPLETED":
        //   router.push(`/game-results?gameId=${currentGameId}`);
        //   break;
        case "WAITING_FOR_OPPONENT":
          router.push(`/invite-friend?gameId=${currentGameId}`);
          break;
        default:
          break;
      }
    }
  }, [currentGameId, gamePlayState, router, navigation]);

  if (loadingCurrentGameId) {
    return (
      <Image
        source={images.splash_bg}
        className="flex-1 px-4 items-center justify-center"
      >
        <ActivityIndicator />
      </Image>
    );
  }

  return (
    <Image source={images.splash_bg} className="flex-1 px-4 items-center">
      <View className="mt-32 items-center">
        <Image source={images.logo} className="h-20 aspect-square" />
        <Text className="mt-1 text-crossed-green-900 text-xl font-[latoBold]">
          Crossed
        </Text>
      </View>
      <View className="w-full">
        <Text
          className="text-crossed-green-900 text-xl"
          style={{ fontFamily: "bitterBold" }}
        >
          Welcome
        </Text>
        <Text
          className="text-crossed-green-900 text-4xl"
          style={{ fontFamily: "bitterBold" }}
        >
          @{myProfile?.username}
        </Text>
        <Text className="mt-16 text-xl" style={{ fontFamily: "bitterBold" }}>
          Start a New Match
        </Text>
        <View className="mt-2 flex-row items-center space-x-2">
          <View>
            <PlaySoloButton
              onPress={async () => {
                try {
                  const newGameId = await createSoloGame();
                  router.push(`/game?gameId=${newGameId}`);
                } catch (createSoloGameError) {
                  Alert.alert(
                    "Error",
                    "Could not start game. Please try again"
                  );
                }
              }}
            />
          </View>
          <View>
            <PlayFriendlyButton
              onPress={async () => {
                try {
                  const newGameId = await createFriendlyGame();
                  router.push(`/invite-friend?gameId=${newGameId}`);
                } catch (createFriendlyGameError) {
                  console.error(createFriendlyGameError);
                  Alert.alert(
                    "Error",
                    "Could not start game. Please try again"
                  );
                }
              }}
            />
          </View>
          <View>
            <PlayRankedButton
              onPress={async () => {
                router.push(`ranked-lobby`);
              }}
            />
          </View>
        </View>
      </View>
      <View className="mt-5 w-full">
        <ShareAppButton />
      </View>
      {stats && (
        <View>
          <Text className="mt-4 text-xl" style={{ fontFamily: "bitterBold" }}>
            My Stats
          </Text>
          <View className="w-full mt-2 flex-row space-x-2">
            <View className="flex-1 bg-crossed-green-50">
              <Image
                source={images.card_ellipsis}
                className="absolute right-0 bottom-0 w-3/5 h-full"
              />
              <Text className="text-crossed-black-700 text-xl mt-2.5 text-center font-[latoLight]">
                Games Played
              </Text>
              <Text className="text-crossed-blue-700 text-6xl ml-2.5 mt-2.5 text-center font-[latoLight]">
                {stats.gamesPlayed}
              </Text>
            </View>
            <View className="flex-1 bg-crossed-green-50">
              <Image
                source={images.card_ellipsis}
                className="absolute right-0 bottom-0 w-3/5 h-full"
              />
              <Text className="text-crossed-black-700 text-xl mt-2.5 text-center font-[latoLight]">
                Games Won
              </Text>
              <Text className="text-crossed-green-700 text-6xl ml-2.5 mt-2.5 text-center font-[latoLight]">
                {stats.gamesWon}
              </Text>
            </View>
          </View>
        </View>
      )}
    </Image>
  );
}
