import { Alert, Text, View } from "react-native";
import { useAuth } from "../../hooks/use-auth";
import { Button } from "../../components/Button";
import { useMyProfile } from "../../hooks/use-my-profile";
import { avatars } from "../../lib/images";
import { Avatar } from "react-native-ui-lib";
import { useFocusEffect, useRouter } from "expo-router";
import { Feather, Ionicons } from "@expo/vector-icons";
import { AvoidSoftInput } from "react-native-avoid-softinput";
import colors from "../../lib/colors";
import { useCallback } from "react";
import { TouchableOpacity } from "react-native-gesture-handler";
import { GenericTouchableProps } from "react-native-gesture-handler/lib/typescript/components/touchables/GenericTouchable";

export default function MyAccount() {
  const { user, logout, isLoggingOut } = useAuth();
  const { myProfile } = useMyProfile();
  const router = useRouter();
  const handleSoftInput = useCallback(() => {
    AvoidSoftInput.setShouldMimicIOSBehavior(true);
    AvoidSoftInput.setEnabled(true);
    return () => {
      AvoidSoftInput.setEnabled(false);
      AvoidSoftInput.setShouldMimicIOSBehavior(false);
    };
  }, []);
  useFocusEffect(handleSoftInput);

  if (!user || !myProfile) {
    return null;
  }

  return (
    <View className="flex-1 bg-white px-4">
      <View className="mt-8 items-center">
        <Avatar
          size={96}
          name={myProfile.name || myProfile.username.charAt(0)}
          onPress={() => {
            router.push("/choose-avatar");
          }}
          imageStyle={{ backgroundColor: "white" }}
          source={avatars[myProfile.avatar as keyof typeof avatars]}
          ribbonLabel="Change"
          ribbonStyle={{ backgroundColor: colors["crossed-gray"]["400"] }}
        />
        <Text className="mt-2 font-[latoLight] text-gray-700">
          @{myProfile?.username}
        </Text>
      </View>
      {user.isAnonymous ? (
        <AccountPageButton
          label="Create Account"
          onPress={() => router.push("/create-account")}
        />
      ) : (
        <>
          <View className="border-b-0.5 mt-8 flex-row items-center justify-between border-crossed-blue-300 pb-2">
            <Text className="font-[bitterBold] text-lg tracking-widest">
              My Profile
            </Text>
            <Feather
              name="edit"
              size={20}
              onPress={() => router.push("/update-profile")}
            />
          </View>
          <View className="px-2">
            <View className="flex-row items-center space-x-4 py-4">
              <Ionicons
                name="ios-person-circle-outline"
                size={32}
                color={colors["crossed-blue"]["300"]}
              />
              <View className="border-b-0.5 flex-1 border-crossed-blue-300 pb-2">
                <Text className="font-[latoLight] text-xs text-gray-600">
                  Name
                </Text>
                <Text className="font-[latoRegular] text-lg text-crossed-green-900">
                  {myProfile.name}
                </Text>
              </View>
            </View>
            <View className="flex-row items-center space-x-4 py-4">
              <Ionicons
                name="ios-mail-outline"
                size={32}
                color={colors["crossed-blue"]["300"]}
              />
              <View className="border-b-0.5 flex-1 border-crossed-blue-300 pb-2">
                <Text className="font-[latoLight] text-xs text-gray-600">
                  Email
                </Text>
                <Text className="font-[latoRegular] text-lg text-crossed-green-900">
                  {myProfile.email}
                </Text>
              </View>
            </View>
          </View>
          <View className="mt-8 items-center">
            <Button
              intent="text"
              label="Logout"
              size="medium"
              isLoading={isLoggingOut}
              onPress={() => {
                logout();
              }}
            />
          </View>
        </>
      )}
      <AccountPageButton
        label="Upgrade to Pro"
        onPress={() => {
          if (user.isAnonymous) {
            Alert.alert(
              "Create Account",
              "You must create an account to upgrade",
              [
                {
                  text: "Create Account",
                  onPress: () => router.push("/create-account"),
                },
              ]
            );
          } else {
            router.push("/upgrade-to-pro");
          }
        }}
      />
      <AccountPageButton
        label="Terms of Use"
        onPress={() =>
          router.push(
            "/web-view?uri=https://www.apple.com/legal/internet-services/itunes/dev/stdeula/&title=Terms of Use"
          )
        }
      />
      <AccountPageButton
        label="Privacy Policy"
        onPress={() =>
          router.push(
            "/web-view?uri=https://app.termly.io/dashboard/website/6c515075-4531-4fc3-bbcc-5605491e88cc/privacy-policy/&title=Privacy Policy"
          )
        }
      />
    </View>
  );
}

const AccountPageButton = ({
  label,
  onPress,
}: {
  label: string;
  onPress: GenericTouchableProps["onPress"];
}) => (
  <TouchableOpacity
    className="border-b-0.5 mt-8 flex-row items-center justify-between border-crossed-blue-300 pb-2"
    onPress={onPress}
  >
    <Text className="font-[bitterBold] text-lg tracking-widest">{label}</Text>
    <Feather name="chevron-right" size={20} />
  </TouchableOpacity>
);
