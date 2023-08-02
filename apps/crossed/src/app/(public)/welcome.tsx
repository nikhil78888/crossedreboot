import { Image } from "expo-image";
import { Alert, StyleSheet, Text, View } from "react-native";
import { images } from "../../lib/images";
import { useRouter } from "expo-router";
import { Button } from "../../components/Button";
import { mobileConfig } from "../../mobile-config";

export default function Welcome() {
  const router = useRouter();
  return (
    <View className="flex-1 items-center bg-crossed-gray-50">
      <View className="mt-24">
        <Image source={images.logo} className="h-[100] aspect-square" />
        <Text className="mt-2 text-crossed-green-900 text-3xl font-[latoBlack]">
          Crossed
        </Text>
      </View>
      <View className="mt-12 bg-crossed-yellow-300 h-[52px] w-[267px] relative">
        <Text className="absolute font-[besleyMedium] text-[52px] -top-[32px] left-[14px]">
          {"Let’s play."}
        </Text>
      </View>
      <View className="mt-[92px] w-full px-5">
        <Button
          intent="primary"
          size="large"
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
          intent="secondary"
          size="large"
          onPress={() => router.push("/sign-in")}
          label="SIGN IN"
        />
      </View>
    </View>
  );
}
