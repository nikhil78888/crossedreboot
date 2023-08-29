import { FlatList } from "react-native-gesture-handler";
import { avatars, images } from "../lib/images";
import { Avatar } from "react-native-ui-lib";
import { View } from "react-native";
import { useMyProfile } from "../hooks/use-my-profile";
import { useRouter } from "expo-router";
import { ImageBackground, Image } from "expo-image";

export default function ChooseAvatar() {
  const { myProfile, updateProfile } = useMyProfile();
  const router = useRouter();
  const setAvatar = async (newAvatar: keyof typeof avatars) => {
    if (myProfile) {
      await updateProfile({ userId: myProfile.userId, avatar: newAvatar });
      router.back();
    }
  };
  return (
    <FlatList
      className="bg-white"
      contentContainerStyle={{ paddingBottom: 40 }}
      numColumns={2}
      data={Object.keys(avatars) as Array<keyof typeof avatars>}
      renderItem={({ item }: { item: keyof typeof avatars }) => {
        const selected = item === myProfile?.avatar;
        return (
          <View
            className="p-8 flex-1 aspect-square items-center justify-center"
            key={item}
          >
            <View
              className={
                selected
                  ? "p-1 border-2 border-crossed-yellow-300 rounded-full"
                  : ""
              }
            >
              <Avatar
                containerStyle={{
                  height: "100%",
                  width: "100%",
                  aspectRatio: 1,
                  alignItems: "center",
                  justifyContent: "center",
                }}
                imageStyle={{ height: "100%", width: "100%" }}
                source={avatars[item]}
                onPress={() => setAvatar(item)}
              />
            </View>
          </View>
        );
      }}
    />
  );
}
