import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, Controller } from "react-hook-form";
import { ScrollView, View, Text } from "react-native";
import * as z from "zod";
import { FormTextInput } from "../components/FormTextInput";
import { useAuth } from "../hooks/use-auth";
import { useMyProfile } from "../hooks/use-my-profile";
import { Button } from "../components/Button";
import { useRouter } from "expo-router";

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
      contentContainerStyle={{ paddingBottom: 20 }}
    >
      <View className="mt-16 flex-row items-center">
        <View className="h-[52px] aspect-square bg-crossed-yellow-300" />
        <Text className="ml-4 pt-4 text-crossed-gray-900 text-3xl font-[besleyMedium] leading-none ">
          Create your {"\n"} account.
        </Text>
      </View>

      <View className="px-10 mt-10">
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
            isLoading={isLinkingAccount}
            label={"Create Account"}
            intent="primary"
            size="large"
          />
        </View>
      </View>
    </ScrollView>
  );
}
