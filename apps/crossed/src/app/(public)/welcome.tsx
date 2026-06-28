import { Alert, Dimensions, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Button } from "../../components/Button";
import { mobileConfig } from "../../mobile-config";
import { Logo } from "../../components/Logo";
import { useAuth } from "../../hooks/use-auth";
import { setPendingIntro } from "../../lib/intro-flag";
import { events, trackEvent } from "../../lib/track-event";

export default function Welcome() {
  const router = useRouter();
  const { startAnonymously, isStartingAnonymously } = useAuth();

  // Play-first onboarding: create a silent anonymous account, then the root auth
  // guard sends the new player to /home, which launches the guided intro race.
  // They pick a username afterward (on the post-race screen).
  const onPlay = async () => {
    try {
      trackEvent(events.PLAY_TAPPED);
      setPendingIntro(true);
      await startAnonymously();
    } catch {
      setPendingIntro(false);
      Alert.alert("Couldn't start", "Please try again.");
    }
  };

  return (
    <View className="flex-1 items-center bg-crossed-gray-50">
      <View className="mt-24">
        <Logo />
      </View>
      <View className="mt-12 w-full items-center px-6">
        {/* Self-sizing single line: never wraps into the button below, and
            shrinks to fit narrow screens / a wider fallback font. */}
        <View
          className="relative items-center"
          style={{ maxWidth: Dimensions.get("window").width - 48 }}
        >
          <View className="absolute inset-x-0 bottom-[6px] h-[28px] bg-crossed-yellow-300" />
          <Text
            numberOfLines={1}
            adjustsFontSizeToFit
            className="font-[besleyMedium] text-[52px] text-crossed-gray-900"
          >
            {"Let’s play."}
          </Text>
        </View>
      </View>
      <View className="mt-[92px] w-full px-5">
        <Button
          intent="primary"
          size="lg"
          rounded={"full"}
          isLoading={isStartingAnonymously}
          onPress={onPlay}
          onLongPress={() => {
            Alert.alert(JSON.stringify(mobileConfig));
          }}
          label="PLAY"
        />
        <View className="w-full my-9 flex-row space-x-12 px-4">
          <View
            className="flex-1 bg-crossed-gray-200"
            style={{ height: StyleSheet.hairlineWidth }}
          ></View>
          <View
            className="flex-1 bg-crossed-gray-200"
            style={{ height: StyleSheet.hairlineWidth }}
          ></View>
        </View>
        <Button
          intent="primary"
          size="lg"
          rounded={"full"}
          mode={"outline"}
          onPress={() => router.push("/sign-in")}
          label="SIGN IN"
        />
      </View>
    </View>
  );
}
