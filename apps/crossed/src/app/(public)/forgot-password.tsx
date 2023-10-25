import { Image } from "expo-image";
import { Text, View } from "react-native";
import { Controller, useForm } from "react-hook-form";
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { images } from "../../lib/images";
import { useAuth } from "../../hooks/use-auth";
import { FormTextInput } from "../../components/FormTextInput";
import { Button } from "../../components/Button";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { TouchableOpacity } from "react-native-gesture-handler";
import { Logo } from "../../components/Logo";

export default function ForgotPassword() {
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
          Forgot Password
        </Text>
      </View>
      <View className="mt-[30px] items-center">
        <Logo />
      </View>
      <View className="mt-10 px-5">
        <ForgotPasswordForm />
      </View>
    </View>
  );
}

const forgotPasswordFormSchema = z.object({
  email: z
    .string({ required_error: "Please provide your email" })
    .email({ message: "Please provide a valid email" }),
});

const ForgotPasswordForm = () => {
  const {
    control,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm({
    defaultValues: {
      email: "",
    },
    resolver: zodResolver(forgotPasswordFormSchema),
  });
  const { sendPasswordResetEmail, isSendPasswordResetEmail } = useAuth();

  const onSubmit = async (
    formValues: z.infer<typeof forgotPasswordFormSchema>
  ) => {
    try {
      await sendPasswordResetEmail(formValues);
    } catch (error: any) {
      if (error.code === "auth/user-not-found") {
        setError("root", { message: "The email does not exist." });
      } else {
        setError("root", { message: "Something went wrong." });
      }
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
      {errors.root?.message && (
        <Text className="text-xs text-red-500 text-center my-1">
          {errors.root.message}
        </Text>
      )}
      <View className="mt-6">
        <Button
          intent="primary"
          size="lg"
          rounded={"full"}
          isLoading={isSendPasswordResetEmail}
          label={"Continue"}
          onPress={handleSubmit(onSubmit)}
        />
      </View>
    </View>
  );
};
