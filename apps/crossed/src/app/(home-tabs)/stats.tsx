import { Text, View } from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useStats } from "../../hooks/use-stats";
import { images } from "../../lib/images";
import { Button } from "../../components/Button";
import { useMyProfile } from "../../hooks/use-my-profile";
import { BannerAd, BannerAdSize } from "react-native-google-mobile-ads";
import { mobileConfig } from "../../mobile-config";
import { ScrollView } from "react-native-gesture-handler";
import { useSubscriptionInfo } from "../../hooks/use-subscription-info";
import { events, trackEvent } from "../../lib/track-event";

export default function Stats() {
  const { stats } = useStats();
  const router = useRouter();
  const { myProfile } = useMyProfile();
  const { showAds } = useSubscriptionInfo();

  return (
    <View className="flex-1 bg-white">
      {showAds && (
        <View className="mt-6">
          <BannerAd
            unitId={mobileConfig.homeScreenAdId}
            size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
          />
        </View>
      )}
      <ScrollView
        contentContainerStyle={{ paddingBottom: 40 }}
        className="flex-1 bg-white px-4"
      >
        {stats && (
          <View>
            {/* <View className="mt-4 flex-row">
              <View>
                <View className="absolute bottom-0 inset-x-0 h-3.5 bg-crossed-yellow-200" />
                <Text className="font-[jost600] text-xl text-cr-gray-800">
                  Statistics
                </Text>
              </View>
            </View> */}
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
        {showAds && (
          <View className="mt-5">
            <Button
              intent={"secondary"}
              label="Remove Ads"
              size={"base"}
              onPress={() => {
                trackEvent(events.FEEDBACK_CLICK);
                router.push("/upgrade-to-pro");
              }}
            />
          </View>
        )}
      </ScrollView>
    </View>
  );
}
