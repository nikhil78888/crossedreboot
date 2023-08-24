import { Alert, Share, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import { useGame } from "../hooks/use-game";
import { useEffect } from "react";
import { Button } from "../components/Button";
import { BannerAd, BannerAdSize } from "react-native-google-mobile-ads";
import { mobileConfig } from "../mobile-config";
import { useSubscriptionInfo } from "../hooks/use-subscription-info";
import { Image } from "expo-image";
import { images } from "../lib/images";

export default function InviteFriend() {
  const { gameId } = useLocalSearchParams();
  const { currentSubscription } = useSubscriptionInfo();
  const router = useRouter();
  const { game, abortGame } = useGame({
    gameId: gameId as string | undefined,
  });
  const navigation = useNavigation();
  const gamePlayState = game?.playState;

  useEffect(() => {
    // if game has ended go back home
    // if game is playing, go to game screen
    if (navigation.isFocused()) {
      switch (gamePlayState) {
        case "COMPLETED":
          Alert.alert("The game has ended");
          router.push("/home");
          break;
        case "ABORTED":
          Alert.alert("The game was aborted");
          router.push("/home");
          break;
        case "PLAYING":
          router.replace(`/game?gameId=${gameId}`);
          break;
        default:
          break;
      }
    }
  }, [gameId, gamePlayState, router, navigation]);

  const inviteFriend = async () => {
    const shared = await Share.share({
      title: "Let's play",
      message: `crossed://join-game?gameId=${gameId}`,
    });
    if (shared.action === Share.dismissedAction) {
      Alert.alert("Please invite a friend to play");
      return;
    }
  };

  const exitGame = () => {
    Alert.alert("Exit Game?", "Are you sure?", [
      { text: "Keep waiting", style: "cancel" },
      { text: "Exit", style: "destructive", onPress: () => abortGame() },
    ]);
  };

  return (
    <View className="flex-1 items-center px-4 bg-white">
      <Text className="mt-4 text-base font-[jost600]">
        Waiting for opponent
      </Text>
      <View className="mt-6">
        <View
          className="h-[180px] w-[180px] border-black/20 rounded-full items-center justify-center"
          style={{ borderWidth: StyleSheet.hairlineWidth }}
        >
          <View className="p-5 bg-gray-100 rounded-full">
            <Image source={images.avatar_dude} className="h-[60px] w-[60px]" />
          </View>
        </View>
      </View>
      <View className="mt-6">
        <Button
          intent="primary"
          size="medium"
          label="Invite a friend"
          onPress={inviteFriend}
        />
      </View>
      {!currentSubscription && (
        <View className="mt-24">
          <BannerAd
            unitId={mobileConfig.inviteFriendScreenAdId}
            size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
          />
        </View>
      )}
      <View className="absolute bottom-8 inset-x-4">
        <Button
          intent="secondary"
          size="large"
          label="Go back home"
          onPress={exitGame}
        />
      </View>
    </View>
  );
}
