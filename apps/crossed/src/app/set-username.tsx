import { Text, View } from "react-native";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button } from "../components/Button";
import { FormTextInput } from "../components/FormTextInput";
import { images } from "../lib/images";
import { useAuth } from "../hooks/use-auth";
import { events, trackEvent } from "../lib/track-event";

// Shown right after a new player's intro race, while their account still has the
// auto-assigned placeholder username. Converts them by saving a real username
// (and rides the win celebration). They can skip and keep the placeholder.
const schema = z.object({
  username: z
    .string({ required_error: "Please pick a username" })
    .nonempty({ message: "Please pick a username" })
    .min(6, { message: "Username must be at least 6 characters" })
    .regex(
      new RegExp(/^([a-z]+\.)*[a-z]+$/),
      "Lowercase a-z separated by dots(.) only"
    ),
});

export default function SetUsername() {
  const router = useRouter();
  const { top } = useSafeAreaInsets();
  const { won, preview } = useLocalSearchParams<{
    won?: string;
    preview?: string;
  }>();
  const { setUsername, isSettingUsername } = useAuth();
  const {
    control,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm({
    defaultValues: { username: "" },
    resolver: zodResolver(schema),
    mode: "onChange",
  });

  const onSubmit = async (data: z.infer<typeof schema>) => {
    // Preview mode (existing account walking the flow): don't actually rename.
    if (preview === "1") {
      router.replace("/home");
      return;
    }
    try {
      await setUsername({ username: data.username });
      trackEvent(events.INTRO_USERNAME_SAVED);
      router.replace("/home");
    } catch (error) {
      const code = (error as { code?: string })?.code;
      setError("root", {
        message:
          code === "23505"
            ? "That username is already taken."
            : "Something went wrong. Please try again.",
      });
    }
  };

  return (
    <View className="flex-1 bg-white px-6" style={{ paddingTop: top + 48 }}>
      <Text className="text-center font-[jost700] text-[30px] text-crossed-gray-900">
        {won === "0" ? "Nice first race!" : "🎉 You won your first race!"}
      </Text>
      <Text className="mt-3 text-center font-[jost400] text-[15px] text-crossed-gray-500">
        Pick a username to save your rating and climb the leaderboard.
      </Text>
      {preview === "1" && (
        <Text className="mt-2 text-center font-[jost600] text-xs text-crossed-blue-450">
          Preview — your account won’t be changed.
        </Text>
      )}
      <View className="mt-8">
        <Controller
          control={control}
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
          <Text className="my-1 text-center text-xs text-red-500">
            {errors.root.message}
          </Text>
        )}
        <View className="mt-6">
          <Button
            intent="primary"
            size="xl"
            rounded="full"
            label="Save & continue"
            isLoading={isSettingUsername}
            onPress={handleSubmit(onSubmit)}
          />
        </View>
        <View className="mt-3 items-center">
          <Button
            intent="primary"
            mode="text"
            label="Maybe later"
            onPress={() => router.replace("/home")}
          />
        </View>
      </View>
    </View>
  );
}
