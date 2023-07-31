import { Image } from "expo-image";
import { Text, TextInput, View } from "react-native";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useRouter } from "expo-router";
import { images } from "../../lib/images";
import { useAuth } from "../../hooks/use-auth";
import { Button } from "../../components/Button";
import { Ionicons } from "@expo/vector-icons";

export default function ChooseUsername() {
  const router = useRouter();
  return (
    <View className="flex-1 bg-crossed-gray-50">
      <View className="absolute top-6 left-1">
        <Ionicons
          size={32}
          name="ios-chevron-back-sharp"
          onPress={router.back}
        />
      </View>
      <View className="mt-20 flex-row items-center">
        <View className="h-[52px] aspect-square bg-crossed-yellow-300" />
        <Text className="ml-4 pt-4 text-crossed-gray-900 text-3xl font-[besleyMedium] leading-none ">
          Pick a Username
        </Text>
      </View>
      <View className="mt-10 px-10">
        <UsernameForm onDone={router.back} />
      </View>
    </View>
  );
}

const usernameFormSchema = z.object({
  username: z
    .string({ required_error: "Please pick a Username" })
    .nonempty({ message: "Please pick a Username" })
    .min(6, { message: "Username must be at least 6 characters" })
    .regex(
      new RegExp(/^([a-z]+\.)*[a-z]+$/),
      "Username may contain only a-z separated by dots(.)"
    ),
});

const UsernameForm = ({ onDone }: { onDone: () => void }) => {
  const {
    control,
    handleSubmit,
    watch,
    setError,
    formState: { errors },
  } = useForm({
    defaultValues: {
      username: "",
    },
    resolver: zodResolver(usernameFormSchema),
    mode: "onChange",
  });
  const { setDisplayName, isSettingDisplayName } = useAuth();

  const usernameValue = watch("username");

  const onSubmit = async (data: z.infer<typeof usernameFormSchema>) => {
    try {
      await setDisplayName({ username: data.username });
      onDone();
    } catch (error: any) {
      if (error.code === "23505") {
        setError("root", {
          message: "The username is already taken.",
        });
      } else {
        setError("root", {
          message: "Oops! Something went wrong. Please try again",
        });
      }
    }
  };

  return (
    <View>
      <Text className="text-black text-sm font-[promptRegular] tracking-widest">
        USERNAME
      </Text>
      <Controller
        control={control}
        rules={{
          required: true,
        }}
        render={({ field: { onChange, onBlur, value } }) => (
          <View className="bg-white flex-row items-center border h-[54px] mt-1 border-gray-200 px-4 rounded-sm">
            <Text
              className={
                usernameValue.length
                  ? "font-[promptLight]"
                  : "font-[promptLight] text-gray-400"
              }
            >
              @
            </Text>
            <TextInput
              className="flex-1 h-full px-1 font-[promptLight]"
              placeholder="josh.cross"
              onBlur={onBlur}
              onChangeText={onChange}
              value={value}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <View className="h-5 w-5">
              {usernameValue.length && !errors.username ? (
                <Image source={images.input_check} className="h-5 w-5" />
              ) : null}
            </View>
          </View>
        )}
        name="username"
      />
      <View className="h-4">
        {errors.username && (
          <Text className="font-[promptLight] text-xs text-red-500 tracking-widest">
            {errors.username.message}
          </Text>
        )}
      </View>
      {errors.root?.message && (
        <Text className="text-xs text-red-500 text-center my-1">
          {errors.root.message}
        </Text>
      )}
      <View className="mt-4">
        <Button
          onPress={handleSubmit(onSubmit)}
          isLoading={isSettingDisplayName}
          label={"Let's go"}
          intent="primary"
          size="large"
        />
      </View>
    </View>
  );
};
