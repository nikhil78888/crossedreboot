import { FlatList } from "react-native-gesture-handler";
import { avatars } from "../lib/images";
import { Avatar } from "react-native-ui-lib";
import { View } from "react-native";
import { useMyProfile } from "../hooks/use-my-profile";
import { useRouter } from "expo-router";

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
      numColumns={2}
      data={Object.keys(avatars) as Array<keyof typeof avatars>}
      renderItem={({ item }: { item: keyof typeof avatars }) => {
        return (
          <View
            className="p-4 flex-1 aspect-square items-center justify-center"
            key={item}
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
        );
      }}
    />
  );
}
