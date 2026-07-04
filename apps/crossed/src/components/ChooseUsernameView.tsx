import { Image } from "expo-image";
import { Text, View } from "react-native";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useRouter } from "expo-router";
import { images } from "../lib/images";
import { useAuth } from "../hooks/use-auth";
import { Button } from "./Button";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FormTextInput } from "./FormTextInput";
import { TouchableOpacity } from "react-native-gesture-handler";
import { Logo } from "./Logo";
import { setPendingIntro, consumePendingIntro } from "../lib/intro-flag";

// The "Get Started — choose a username" screen. Shared by the real (public)
// route and the in-app new-user PREVIEW so the screen + copy can't drift.
// In preview mode the submit is non-destructive (no account is created/renamed)
// and just advances the walkthrough via onPreviewNext.
export const ChooseUsernameView = ({
  preview,
  onBack,
  onPreviewNext,
}: {
  preview?: boolean;
  onBack: () => void;
  onPreviewNext?: () => void;
}) => {
  const { top } = useSafeAreaInsets();
  return (
    <View className="flex-1 bg-white" style={{ paddingTop: top }}>
      <View className="mt-1.5 flex items-center justify-center">
        <View className="absolute left-5 inset-y-0 items-center justify-center">
          <TouchableOpacity onPress={onBack} className="py-2 px-1.5">
            <Image
              source={images.back_arrow_left}
              className="h-6 w-4"
              contentFit="contain"
            />
          </TouchableOpacity>
        </View>
        <Text className="text-cr-gray-800 text-[28px] leading-normal font-[jost600]">
          Get Started
        </Text>
      </View>
      <Text className="text-cr-gray-600 mt-3 font-[jost400] text-sm text-center">
        Hi There! Choose a username.
      </Text>
      <View className="mt-[30px] items-center">
        <Logo />
      </View>
      <View className="mt-10 px-5">
        <UsernameForm preview={preview} onPreviewNext={onPreviewNext} />
      </View>
    </View>
  );
};

const usernameFormSchema = z.object({
  username: z
    .string({ required_error: "Please pick a Username" })
    .nonempty({ message: "Please pick a Username" })
    .min(6, { message: "Username must be at least 6 characters" })
    .regex(
      new RegExp(/^([a-zA-Z0-9]+\.)*[a-zA-Z0-9]+$/),
      "Username may contain letters, numbers, and dots(.)"
    ),
});

const UsernameForm = ({
  preview,
  onPreviewNext,
}: {
  preview?: boolean;
  onPreviewNext?: () => void;
}) => {
  const router = useRouter();
  const {
    control,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm({
    defaultValues: { username: "" },
    resolver: zodResolver(usernameFormSchema),
    mode: "onChange",
  });
  const { setDisplayName, isSettingDisplayName } = useAuth();

  const onSubmit = async (data: z.infer<typeof usernameFormSchema>) => {
    if (preview) {
      onPreviewNext?.();
      return;
    }
    // Flag the intro BEFORE signing in: creating the account flips `user`, which
    // makes the root auth guard redirect this screen to /home — and that can
    // happen before this function's next line runs. Setting it first guarantees
    // /home sees the flag on its first render (fixes "landed on home, then got
    // yanked into onboarding 30s later"). Cleared if sign-in fails.
    setPendingIntro(true);
    try {
      await setDisplayName({ username: data.username });
    } catch (error: unknown) {
      consumePendingIntro();
      const code = (error as { code?: string })?.code;
      setError("root", {
        message:
          code === "23505"
            ? "The username is already taken."
            : "Oops! Something went wrong. Please try again",
      });
    }
  };

  return (
    <View>
      <Controller
        control={control}
        rules={{ required: true }}
        render={({
          field: { onChange, onBlur, value },
          fieldState: { error },
        }) => (
          <FormTextInput
            icon={images.form_username}
            error={error?.message}
            placeholder="User Name"
            onBlur={onBlur}
            onChangeText={onChange}
            value={value}
            autoCapitalize="none"
          />
        )}
        name="username"
      />
      {errors.root?.message && (
        <Text className="text-xs text-red-500 text-center my-1">
          {errors.root.message}
        </Text>
      )}
      <Text className="mt-2.5 text-center text-sm font-[rubik400] leading-[1.4] text-cr-gray-500">
        By continuing, you agree to the{" "}
        <Text
          className="font-[rubik500] text-cr-gray-700"
          onPress={() =>
            router.push(
              "/public-web-view?uri=https://www.apple.com/legal/internet-services/itunes/dev/stdeula/&title=Terms of Use"
            )
          }
        >
          Terms of Services
        </Text>{" "}
        &{" "}
        <Text
          className="font-[rubik500] text-cr-gray-700"
          onPress={() =>
            router.push(
              "/public-web-view?uri=https://www.apple.com/legal/internet-services/itunes/dev/stdeula/&title=Privacy Policy"
            )
          }
        >
          Privacy Policy.
        </Text>
      </Text>
      <View className="mt-16">
        <Button
          onPress={handleSubmit(onSubmit)}
          isLoading={isSettingDisplayName}
          label={"Let's go"}
          intent="primary"
          size="lg"
          rounded={"full"}
        />
      </View>
      <View className="mt-6 flex-row items-center justify-between">
        <Text className="font-[jost400] text-cr-gray-600 text-base">
          Already have an account
        </Text>
        <Button
          onPress={() => router.push("/sign-in")}
          label={"Sign In"}
          intent="secondary"
          size="sm"
          rounded={"full"}
        />
      </View>
    </View>
  );
};
