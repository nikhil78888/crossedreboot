import { Alert, Share, Text, View } from "react-native";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import { Image } from "expo-image";
import { images } from "../lib/images";
import { useGame } from "../hooks/use-game";
import { useEffect } from "react";
import { Button } from "../components/Button";
import { BannerAd, BannerAdSize } from "react-native-google-mobile-ads";
import { mobileConfig } from "../mobile-config";

export default function InviteFriend() {
  const { gameId } = useLocalSearchParams();
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
    <Image source={images.splash_bg} className="flex-1 items-center px-4 pt-60">
      <Text className="text-2xl" style={{ fontFamily: "bitterBold" }}>
        Friendly Match
      </Text>
      <Text className="mb-8 mt-2 font-[latoRegular]">Waiting for opponent</Text>
      <Button
        intent="primary"
        size="medium"
        label="Invite a friend"
        onPress={inviteFriend}
      />
      <Button
        intent="text"
        size="medium"
        label="Exit Game"
        onPress={exitGame}
      />
      <View className="mt-12">
        <BannerAd
          unitId={mobileConfig.inviteFriendScreenAdId}
          size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        />
      </View>
    </Image>
  );
}
