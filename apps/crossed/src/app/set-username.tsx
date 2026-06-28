import { Text, View } from "react-native";
import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button } from "../components/Button";
import { FormTextInput } from "../components/FormTextInput";
import { images } from "../lib/images";
import { useAuth } from "../hooks/use-auth";
import { useGame } from "../hooks/use-game";
import { useMyProfile } from "../hooks/use-my-profile";
import { events, trackEvent } from "../lib/track-event";

// Post-intro win screen. Leads with "Play again" (works before naming, to keep
// the loop going) and the win margin for excitement; saving a username is the
// secondary action. Shown while the account still has a placeholder username, or
// in preview mode (existing account, non-destructive).
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
  const { won, margin, preview, before } = useLocalSearchParams<{
    won?: string;
    margin?: string;
    preview?: string;
    before?: string;
  }>();
  const { setUsername, isSettingUsername } = useAuth();
  const { createGuidedMatch, creatingGuidedMatch } = useGame({
    gameId: undefined,
  });
  const { myProfile, refreshMyProfile } = useMyProfile();
  // Pull the post-game rating so we can show the movement (before -> after).
  useEffect(() => {
    refreshMyProfile();
  }, [refreshMyProfile]);
  const beforeRating = parseInt(before ?? "", 10);
  const afterRating = myProfile?.eloRating;
  const showRating =
    Number.isFinite(beforeRating) &&
    typeof afterRating === "number" &&
    afterRating > 0;
  const delta = showRating ? Math.round((afterRating as number) - beforeRating) : 0;
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

  const didWin = won !== "0";
  const marginN = parseInt(margin ?? "0", 10) || 0;
  const headline = didWin ? "🎉 You won!" : "Good race!";
  const subline = didWin
    ? marginN > 0
      ? marginN <= 6
        ? `Photo finish — you edged it by ${marginN} square${
            marginN === 1 ? "" : "s"
          }! 🔥`
        : `You beat your rival by ${marginN} squares!`
      : "You took it right at the buzzer!"
    : "So close — go again and take this one.";

  const playAgain = async () => {
    try {
      const id = await createGuidedMatch({
        source: preview === "1" ? "preview" : "onboarding",
      });
      if (id)
        router.replace(
          `/game?gameId=${id}&guided=1${preview === "1" ? "&preview=1" : ""}`
        );
    } catch {
      // stay on the screen if it fails
    }
  };

  const onSubmit = async (data: z.infer<typeof schema>) => {
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
    <View className="flex-1 bg-white px-6" style={{ paddingTop: top + 44 }}>
      <Text
        className="text-center font-[jost700] text-crossed-gray-900"
        style={{ fontSize: 40 }}
      >
        {headline}
      </Text>
      <Text
        className="mt-3 text-center font-[jost600] text-crossed-gray-700"
        style={{ fontSize: 19, lineHeight: 26 }}
      >
        {subline}
      </Text>

      {showRating && (
        <View className="mt-5 items-center">
          <Text className="font-[jost600] text-[12px] tracking-widest text-crossed-gray-400">
            RATING
          </Text>
          <Text
            className="mt-1 font-[jost700] text-crossed-gray-900"
            style={{ fontSize: 24 }}
          >
            {beforeRating} → {Math.round(afterRating as number)}
            {delta > 0 ? (
              <Text style={{ color: "#16a34a", fontSize: 24 }}>
                {"  "}+{delta}
              </Text>
            ) : null}
          </Text>
        </View>
      )}

      <View className="mt-8">
        <Button
          intent="primary"
          size="xl"
          rounded="full"
          label="Play again"
          isLoading={creatingGuidedMatch}
          onPress={playAgain}
        />
      </View>

      <Text
        className="mt-9 text-center font-[jost600] text-crossed-gray-500"
        style={{ fontSize: 16 }}
      >
        Pick a username to save your rating
      </Text>
      {preview === "1" && (
        <Text
          className="mt-1 text-center font-[jost600] text-crossed-blue-450"
          style={{ fontSize: 13 }}
        >
          Preview — your account won’t be changed.
        </Text>
      )}
      <View className="mt-3">
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
        <View className="mt-4">
          <Button
            intent="primary"
            size="lg"
            rounded="full"
            mode="outline"
            label="Save & continue"
            isLoading={isSettingUsername}
            onPress={handleSubmit(onSubmit)}
          />
        </View>
        <View className="mt-2 items-center">
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
