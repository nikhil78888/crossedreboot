import { Image } from "expo-image";
import { Text, View } from "react-native";
import { Controller, useForm } from "react-hook-form";
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { images } from "../../lib/images";
import { useAuth } from "../../hooks/use-auth";
import { FormTextInput } from "../../components/FormTextInput";
import { Button } from "../../components/Button";

export default function ForgotPassword() {
  return (
    <View className="flex-1 px-4">
      <View className="mt-32 items-center">
        <Image source={images.logo} className="h-20 aspect-square" />
        <Text className="mt-1 text-crossed-green-900 text-xl font-[latoBold]">
          Crossed
        </Text>
      </View>
      <Text className="my-6 text-4xl text-center text-crossed-blue-700 font-[bitterBold]">
        Reset Password
      </Text>
      <ForgotPasswordForm />
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
      {errors.root?.message && (
        <Text className="text-xs text-red-500 text-center my-1">
          {errors.root.message}
        </Text>
      )}
      <View className="mt-4">
        <Button
          intent="primary"
          size="large"
          isLoading={isSendPasswordResetEmail}
          label={"Reset Password"}
          onPress={handleSubmit(onSubmit)}
        />
      </View>
    </View>
  );
};
