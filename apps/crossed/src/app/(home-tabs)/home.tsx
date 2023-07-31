import { ActivityIndicator, Text, View } from "react-native";
import { Image } from "expo-image";
import { useNavigation, useRouter } from "expo-router";
import { useEffect } from "react";
import { ShareAppButton } from "../../components/ShareAppButton";
import { useCurrentGame } from "../../hooks/use-current-game";
import { useGame } from "../../hooks/use-game";
import { useStats } from "../../hooks/use-stats";
import { images } from "../../lib/images";
import { Button } from "../../components/Button";
import { NewGameButtons } from "../../components/NewGameButtons";
import { useMyProfile } from "../../hooks/use-my-profile";
import { BannerAd, BannerAdSize } from "react-native-google-mobile-ads";
import { mobileConfig } from "../../mobile-config";
import { ScrollView } from "react-native-gesture-handler";
import { useSubscriptionInfo } from "../../hooks/use-subscription-info";

export default function Home() {
  const { stats } = useStats();
  const { currentGameId, loadingCurrentGameId } = useCurrentGame();
  const { game } = useGame({
    gameId: currentGameId,
  });
  const router = useRouter();
  const navigation = useNavigation();
  const { myProfile } = useMyProfile();
  const { currentSubscription } = useSubscriptionInfo();

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
      <Text className="mt-2.5 font-[bitterBold] text-xl text-crossed-black-700">
        Start a New Match!
      </Text>
      <View className="mt-2">
        <NewGameButtons />
      </View>
      <View className="mt-5 w-full">
        <ShareAppButton />
      </View>
      {stats && (
        <View>
          <Text className="mt-4 text-xl" style={{ fontFamily: "bitterBold" }}>
            My Stats
          </Text>
          <View className="mt-2 w-full flex-row space-x-2">
            <View className="flex-1 bg-crossed-green-50">
              <Image
                source={images.card_ellipsis}
                className="absolute bottom-0 right-0 h-full w-3/5"
              />
              <Text className="mt-2.5 text-center font-[latoLight] text-xl text-crossed-black-700">
                Games Played
              </Text>
              <Text className="ml-2.5 mt-2.5 text-center font-[latoLight] text-6xl text-crossed-blue-700">
                {stats.gamesPlayed}
              </Text>
            </View>
            <View className="flex-1 bg-crossed-green-50">
              <Image
                source={images.card_ellipsis}
                className="absolute bottom-0 right-0 h-full w-3/5"
              />
              <Text className="mt-2.5 text-center font-[latoLight] text-xl text-crossed-black-700">
                Games Won
              </Text>
              <Text className="ml-2.5 mt-2.5 text-center font-[latoLight] text-6xl text-crossed-green-700">
                {stats.gamesWon}
              </Text>
            </View>
          </View>
        </View>
      )}
      <View className="mt-2 h-32 bg-crossed-green-50">
        <Image
          source={images.card_ellipsis}
          className="absolute bottom-0 right-0 h-full w-3/5"
        />
        <Text className="mt-2.5 text-center font-[latoLight] text-xl text-crossed-black-700">
          Points
        </Text>
        <Text className="ml-2.5 mt-2.5 text-center font-[latoLight] text-6xl text-crossed-blue-700">
          {myProfile?.eloRating}
        </Text>
      </View>
      <View className="mt-5">
        <Button
          intent={"secondary"}
          label="Feedback"
          size={"medium"}
          onPress={() => router.push("/feedback")}
        />
      </View>
      {!currentSubscription && (
        <View className="mt-6 -mx-4">
          <BannerAd
            unitId={mobileConfig.homeScreenAdId}
            size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
          />
        </View>
      )}
      {!currentSubscription && (
        <View className="mt-5">
          <Button
            intent={"secondary"}
            label="Remove Ads"
            size={"medium"}
            onPress={() => router.push("/upgrade-to-pro")}
          />
        </View>
      )}
    </ScrollView>
  );
}
