import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, Controller } from "react-hook-form";
import { ScrollView, View, Text } from "react-native";
import * as z from "zod";
import { FormTextInput } from "../components/FormTextInput";
import { useAuth } from "../hooks/use-auth";
import { useMyProfile } from "../hooks/use-my-profile";
import { Button } from "../components/Button";
import { useRouter } from "expo-router";
import { Logo } from "../components/Logo";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { TouchableOpacity } from "react-native-gesture-handler";
import { Image } from "expo-image";
import { images } from "../lib/images";

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

export default function CreateAccountForm() {
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
  const router = useRouter();
  const { top, bottom } = useSafeAreaInsets();

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
      router.back();
    }
  };

  return (
    <ScrollView
      className="flex-1 bg-crossed-gray-50"
      contentContainerStyle={{ paddingBottom: 20 + bottom, paddingTop: top }}
    >
      <View className="mt-1.5 flex items-center justify-center">
        <View className="absolute left-5 inset-y-0 items-center justify-center">
          <TouchableOpacity onPress={router.back} className="py-2 px-1.5">
            <Image
              source={images.back_arrow_left}
              className="h-6 w-4"
              contentFit="contain"
            />
          </TouchableOpacity>
        </View>
        <Text className="text-cr-gray-800 text-[28px] leading-normal font-[jost600]">
          Create your account
        </Text>
      </View>
      <Text className="text-cr-gray-600 mt-3 font-[jost400] text-sm text-center">
        Sync your stats and progress across devices.
      </Text>
      <View className="mt-[30px] items-center">
        <Logo />
      </View>

      <View className="px-10 mt-10">
        <Controller
          control={control}
          render={({
            field: { onChange, onBlur, value },
            fieldState: { error },
          }) => (
            <FormTextInput
              icon={images.form_username}
              error={error?.message}
              placeholder="Your Name"
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
              icon={images.form_email}
              error={error?.message}
              placeholder="Your Email"
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
              icon={images.form_password}
              error={error?.message}
              placeholder="Password"
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
            isLoading={isLinkingAccount}
            label={"Create Account"}
            intent="primary"
            size="xl"
            rounded={"full"}
          />
        </View>
      </View>
    </ScrollView>
  );
}
