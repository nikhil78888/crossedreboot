import { Text, View } from "react-native";
import { Controller, useForm } from "react-hook-form";
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "../../hooks/use-auth";
import { FormTextInput } from "../../components/FormTextInput";
import { Button } from "../../components/Button";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

export default function SignIn() {
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
          Sign In
        </Text>
      </View>
      <View className="mt-10 px-10">
        <LoginForm />
        <View className="mt-5">
          <Button
            intent="text"
            label="Forgot Password?"
            onPress={() => router.push("/forgot-password")}
          />
        </View>
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
            label="Email"
            error={error?.message}
            placeholder="example@gmail.com"
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
            label="Password"
            error={error?.message}
            placeholder="xxxxxxxxx"
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
      <View className="mt-4">
        <Button
          intent="primary"
          size="large"
          isLoading={isSigningInWithEmail}
          label={"Login"}
          onPress={handleSubmit(onSubmit)}
        />
      </View>
    </View>
  );
};
