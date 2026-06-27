import { Alert, Dimensions, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Button } from "../../components/Button";
import { mobileConfig } from "../../mobile-config";
import { Logo } from "../../components/Logo";

export default function Welcome() {
  const router = useRouter();
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
          onPress={() => {
            router.push("/choose-username");
          }}
          onLongPress={() => {
            Alert.alert(JSON.stringify(mobileConfig));
          }}
          label="GET STARTED"
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
