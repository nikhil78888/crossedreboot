import { Image } from "expo-image";
import { Text, TextInput, View } from "react-native";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useRouter } from "expo-router";
import { images } from "../../lib/images";
import { useAuth } from "../../hooks/use-auth";
import { Button } from "../../components/Button";

export default function ChooseUsername() {
  const router = useRouter();
  return (
    <Image source={images.splash_bg} className="flex-1">
      <View className="mt-24 items-center">
        <Image source={images.logo} className="h-20 aspect-square" />
        <Text className="mt-1 text-crossed-green-900 text-xl font-[latoBold]">
          Crossed
        </Text>
        <Text className="mt-6 text-crossed-blue-700 text-[40px] font-[bitterBold]">
          Pick a Username
        </Text>
      </View>
      <View className="mt-24 px-4">
        <UsernameForm onDone={router.back} />
      </View>
    </Image>
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
      <Text className="text-crossed-green-900 font-[latoRegular]">
        Username
      </Text>
      <Controller
        control={control}
        rules={{
          required: true,
        }}
        render={({ field: { onChange, onBlur, value } }) => (
          <View className="flex-row items-center border h-[60] mt-1 border-gray-200 px-3 rounded-sm">
            <Text className={usernameValue.length ? "" : "text-gray-400"}>
              @
            </Text>
            <TextInput
              className="flex-1 h-full px-1"
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
          <Text className="text-xs text-red-500">
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
          label={isSettingDisplayName ? "Please wait..." : "Let's go"}
          intent="primary"
          size="large"
        />
      </View>
    </View>
  );
};
