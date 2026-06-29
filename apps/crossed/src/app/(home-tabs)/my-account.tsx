import { Alert, Text, View } from "react-native";
import { useAuth } from "../../hooks/use-auth";
import { Button } from "../../components/Button";
import { useMyProfile } from "../../hooks/use-my-profile";
import { RankBadge } from "../../components/RankBadge";
import { avatars, images } from "../../lib/images";
import { Avatar } from "react-native-ui-lib";
import { useFocusEffect, useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { AvoidSoftInput } from "react-native-avoid-softinput";
import colors from "../../lib/colors";
import { useCallback } from "react";
import { ScrollView, TouchableOpacity } from "react-native-gesture-handler";
import type { ComponentPropsWithoutRef } from "react";
import { Image, ImageSource } from "expo-image";

export default function MyAccount() {
  const { user, logout } = useAuth();
  const { myProfile } = useMyProfile();
  const router = useRouter();

  // Preview the full new-user sequence (logo loading -> welcome -> race -> win),
  // non-destructively, from an existing account.
  const playIntroRace = () => router.push("/intro-preview");
  const handleSoftInput = useCallback(() => {
    AvoidSoftInput.setShouldMimicIOSBehavior(true);
    AvoidSoftInput.setEnabled(true);
    return () => {
      AvoidSoftInput.setEnabled(false);
      AvoidSoftInput.setShouldMimicIOSBehavior(false);
    };
  }, []);
  useFocusEffect(handleSoftInput);

  const confirmDelete = () => {
    Alert.alert(
      "Delete Account",
      "Are you sure you want to delete your account? This action is irreversible.",
      [
        {
          text: "Delete",
          style: "destructive",
          onPress: () => router.push("delete-account"),
        },
        { text: "Cancel", style: "default" },
      ]
    );
  };

  if (!user || !myProfile) {
    return null;
  }

  return (
    <ScrollView
      className="flex-1 bg-white px-4"
      contentContainerStyle={{ paddingBottom: 20 }}
    >
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
        <Text className="mt-4 font-[jost500] text-cr-gray-800 text-2xl">
          @{myProfile?.username}
        </Text>
        <View className="mt-4">
          <RankBadge rating={myProfile?.eloRating} size="lg" />
        </View>
        <View className="mt-5 w-full px-1">
          <Button
            intent={"primary"}
            size={"lg"}
            rounded={"full"}
            label="▶  Preview new-user experience"
            onPress={playIntroRace}
          />
        </View>
      </View>
      {user.isAnonymous ? (
        <AccountPageButton
          icon={images.account_myprofile}
          label="Create Account"
          onPress={() => router.push("/create-account")}
        />
      ) : (
        <AccountPageButton
          label="My Profile"
          icon={images.account_myprofile}
          onPress={() => router.push("/update-profile")}
        />
      )}
      <AccountPageButton
        label="Terms of Use"
        icon={images.account_terms}
        onPress={() =>
          router.push(
            "/web-view?uri=https://www.apple.com/legal/internet-services/itunes/dev/stdeula/&title=Terms of Use"
          )
        }
      />
      <AccountPageButton
        label="Privacy Policy"
        icon={images.account_privacy}
        onPress={() => router.push(`/privacy-policy`)}
      />
      {!user.isAnonymous && (
        <AccountPageButton
          icon={images.account_delete}
          label="Delete Account"
          onPress={() => confirmDelete()}
        />
      )}
      {!user.isAnonymous && (
        <View className="mt-4 items-center">
          <Button
            intent={"danger"}
            mode={"text"}
            label="Logout"
            onPress={() => logout()}
          />
        </View>
      )}
    </ScrollView>
  );
}

const AccountPageButton = ({
  label,
  onPress,
  icon,
}: {
  label: string;
  onPress: ComponentPropsWithoutRef<typeof TouchableOpacity>["onPress"];
  icon: ImageSource;
}) => (
  <TouchableOpacity
    className="mt-4 rounded-2xl bg-cr-gray-300 h-[76px] w-full py-[18px] pl-[25px] pr-7 flex-row items-center justify-between"
    onPress={onPress}
  >
    <View className="flex-row items-center">
      <Image source={icon} className="h-[44] w-[44]" contentFit="contain" />
      <Text className="ml-[18px] font-[jost600] text-base">{label}</Text>
    </View>
    <Feather name="chevron-right" size={20} />
  </TouchableOpacity>
);
