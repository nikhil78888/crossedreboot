import { Text, View } from "react-native";
import { Image } from "expo-image";
import { useStats } from "../../hooks/use-stats";
import { images } from "../../lib/images";
import { useMyProfile } from "../../hooks/use-my-profile";
import { ScrollView } from "react-native-gesture-handler";

export default function Stats() {
  const { stats } = useStats();
  const { myProfile } = useMyProfile();

  return (
    <ScrollView
      contentContainerStyle={{ paddingBottom: 40 }}
      className="flex-1 bg-white px-4"
    >
      {stats && (
        <View>
          <View className="mt-2.5 h-[136px] rounded-[15px] border">
            <View className="flex-row items-center justify-between mt-[18px] ml-5 mr-7">
              <View>
                <Text className="font-[rubik600] text-[42px] leading-none">
                  {myProfile?.eloRating}
                </Text>
                <Text className="font-[jost600] text-[25px] ml-2">
                  Rating
                </Text>
              </View>
              <Image source={images.rating} className="h-[71px] w-[66.7px]" />
            </View>
          </View>
          <View className="mt-4 w-full flex-row space-x-2">
            <View className="flex-1 h-24 rounded-[15px] border">
              <Text className="ml-4 mt-4 font-[rubik700] text-[32px]">
                {stats.gamesPlayed}
              </Text>
              <Text className="ml-5 font-[jost600] text-base">
                Games Played
              </Text>
            </View>
            <View className="flex-1 h-24 rounded-[15px] border">
              <Text className="ml-4 mt-4 font-[rubik700] text-[32px]">
                {stats.gamesWon}
              </Text>
              <Text className="ml-5 font-[jost600] text-base">Games Won</Text>
            </View>
          </View>
        </View>
      )}
    </ScrollView>
  );
}
