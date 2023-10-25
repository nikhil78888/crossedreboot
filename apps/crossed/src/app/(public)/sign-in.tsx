import { Text, View } from "react-native";
import { Controller, useForm } from "react-hook-form";
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "../../hooks/use-auth";
import { FormTextInput } from "../../components/FormTextInput";
import { Button } from "../../components/Button";
import { useRouter } from "expo-router";
import { Image } from "expo-image";
import { images } from "../../lib/images";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { TouchableOpacity } from "react-native-gesture-handler";
import { Logo } from "../../components/Logo";

export default function SignIn() {
  const router = useRouter();
  const { top } = useSafeAreaInsets();
  return (
    <View className="flex-1 bg-white" style={{ paddingTop: top }}>
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
          Sign In
        </Text>
      </View>
      <Text className="text-cr-gray-600 mt-3 font-[jost400] text-sm text-center">
        Welcome back! Please enter your details
      </Text>
      <View className="mt-[30px] items-center">
        <Logo />
      </View>
      <View className="mt-10 px-5">
        <LoginForm />
      </View>
    </View>
  );
}

const loginFormSchema = z.object({
  email: z
    .string({ required_error: "Please provide your email" })
    .email({ message: "Please provide a valid email" }),
  password: z
    .string({ required_error: "Please choose a password" })
    .min(8, { message: "Password should be at least 8 characters" }),
});

const LoginForm = () => {
  const router = useRouter();
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm({
    defaultValues: {
      email: "",
      password: "",
    },
    resolver: zodResolver(loginFormSchema),
  });
  const { signInWithEmail, isSigningInWithEmail } = useAuth();

  const onSubmit = (formValues: z.infer<typeof loginFormSchema>) => {
    signInWithEmail(formValues);
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
            icon={images.form_email}
            error={error?.message}
            placeholder="Your Email"
            onBlur={onBlur}
            onChangeText={onChange}
            value={value}
            keyboardType="email-address"
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
            secureTextEntry
            autoComplete="password"
            autoCapitalize="none"
          />
        )}
        name="password"
      />
      {errors.root?.message && (
        <Text className="text-xs text-red-500 text-center my-1">
          {errors.root.message}
        </Text>
      )}
      <View className="items-end">
        <Button
          mode="text"
          intent={"secondary"}
          size="sm"
          label="Forgot Password"
          onPress={() => router.push("/forgot-password")}
        />
      </View>
      <View className="mt-3">
        <Button
          intent="primary"
          size="lg"
          rounded={"full"}
          isLoading={isSigningInWithEmail}
          label={"Sign In"}
          onPress={handleSubmit(onSubmit)}
        />
      </View>
      <View className="mt-6 flex-row items-center justify-between">
        <Text className="font-[jost400] text-cr-gray-600 text-base">
          Create an account
        </Text>
        <Button
          onPress={() => router.push("/choose-username")}
          label={"Sign Up"}
          intent="secondary"
          size="sm"
          rounded={"full"}
        />
      </View>
    </View>
  );
};
