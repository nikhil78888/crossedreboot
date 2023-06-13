import { Image } from "expo-image";
import { Text, View } from "react-native";
import { images } from "../../lib/images";
import { TouchableOpacity } from "react-native-gesture-handler";
import { useRouter } from "expo-router";
import { Button } from "../../components/Button";

export default function Welcome() {
  const router = useRouter();
  return (
    <Image source={images.splash_bg} className="flex-1 justify-between">
      <View className="mt-24 items-center">
        <Image source={images.logo} className="h-[173] aspect-square" />
        <Text
          className="mt-4 text-crossed-green-900 text-5xl"
          style={{ fontFamily: "Lato_900Black" }}
        >
          Crossed
        </Text>
      </View>
      <View className="mb-28 px-5">
        <Button
          intent="primary"
          size="large"
          onPress={() => {
            router.push("/choose-username");
          }}
          label="Get Started"
        />
        <View className="flex-row mt-4">
          <Text className="font-[latoRegular] text-crossed-gray-400">
            Already have an account?
          </Text>
          <TouchableOpacity
            className="ml-1"
            onPress={() => router.push("/sign-in")}
          >
            <Text className="font-[latoBlack] text-crossed-gray-400">
              Sign In
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Image>
  );
}
