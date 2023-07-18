import { Text, View } from "react-native";
import { useAuth } from "../../hooks/use-auth";
import { Button } from "../../components/Button";
import { useMyProfile } from "../../hooks/use-my-profile";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { FormTextInput } from "../../components/FormTextInput";
import { avatars, images } from "../../lib/images";
import { Image } from "expo-image";
import { Avatar } from "react-native-ui-lib";
import { useFocusEffect, useRouter } from "expo-router";
import { Feather, Ionicons } from "@expo/vector-icons";
import { AvoidSoftInput } from "react-native-avoid-softinput";
import colors from "../../lib/colors";
import { useCallback } from "react";
import { ScrollView } from "react-native-gesture-handler";

export default function MyAccount() {
  const { user, logout } = useAuth();
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

  if (user.isAnonymous) {
    return (
      <Image source={images.splash_bg} className="flex-1">
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingHorizontal: 16 }}
        >
          <View className="mt-16 items-center">
            <Image source={images.logo} className="aspect-square h-20" />
            <Text className="mt-1 font-[latoBold] text-xl text-crossed-green-900">
              {myProfile?.username}
            </Text>
            <Text className="mt-6 font-[bitterBold] text-[36px] text-crossed-blue-700">
              Create your account
            </Text>
          </View>
          <View className="mt-6">
            <CreateAccountForm />
          </View>
        </ScrollView>
      </Image>
    );
  }

  return (
    <View className="flex-1 bg-white px-4">
      <View className="mt-8 items-center">
        <Avatar
          size={96}
          name={myProfile.name || ""}
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
            <Text className="font-[latoLight] text-xs text-gray-600">Name</Text>
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
          onPress={() => {
            logout();
          }}
        />
      </View>
    </View>
  );
}

const createAccountFormSchema = z.object({
  name: z
    .string({ required_error: "Please provide your name" })
    .nonempty({ message: "Please provide your name" }),
  email: z
    .string({ required_error: "Please provide your email" })
    .nonempty({ message: "Please provide your email" })
    .email({ message: "Please provide a valid email" }),
  password: z
    .string({ required_error: "Please choose a password" })
    .min(8, { message: "Password should be at least 8 characters" }),
});

const CreateAccountForm = () => {
  const {
    control,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm({
    defaultValues: {
      name: "",
      email: "",
      password: "",
    },
    resolver: zodResolver(createAccountFormSchema),
  });
  const { user, linkAccount, isLinkingAccount } = useAuth();
  const { updateProfile } = useMyProfile();

  const onSubmit = async (
    formValues: z.infer<typeof createAccountFormSchema>
  ) => {
    if (user) {
      try {
        await linkAccount(formValues);
      } catch (error: any) {
        if (error.code === "auth/email-already-in-use") {
          setError("root", { message: "An account exists with this email." });
        } else {
          setError("root", { message: "Oops! Something went wrong." });
        }
      }
      await updateProfile({
        userId: user.uid,
        name: formValues.name,
        email: formValues.email,
      });
    }
  };

  return (
    <View>
      <Controller
        control={control}
        render={({
          field: { onChange, onBlur, value },
          fieldState: { error },
        }) => (
          <FormTextInput
            label="Your Name"
            error={error?.message}
            placeholder="Josh Cross"
            onBlur={onBlur}
            onChangeText={onChange}
            value={value}
            autoComplete="name"
          />
        )}
        name="name"
      />
      <Controller
        control={control}
        render={({
          field: { onChange, onBlur, value },
          fieldState: { error },
        }) => (
          <FormTextInput
            label="Email"
            error={error?.message}
            placeholder="example@gmail.com"
            onBlur={onBlur}
            onChangeText={onChange}
            value={value}
            autoComplete="email"
            autoCapitalize="none"
          />
        )}
        name="email"
      />
      <Controller
        control={control}
        render={({
          field: { onChange, onBlur, value },
          fieldState: { error },
        }) => (
          <FormTextInput
            label="Password"
            error={error?.message}
            placeholder="xxxxxxxx"
            onBlur={onBlur}
            onChangeText={onChange}
            value={value}
            autoComplete="password"
            autoCapitalize="none"
            secureTextEntry
          />
        )}
        name="password"
      />
      {errors.root?.message && (
        <Text className="my-1 text-center text-xs text-red-500">
          {errors.root.message}
        </Text>
      )}
      <View className="mt-4">
        <Button
          onPress={handleSubmit(onSubmit)}
          label={isLinkingAccount ? "Please wait..." : "Create Account"}
          intent="primary"
          size="large"
        />
      </View>
    </View>
  );
};
