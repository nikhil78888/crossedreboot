import { Alert, Linking, Text, View } from "react-native";
import { Controller, useForm } from "react-hook-form";
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "../hooks/use-auth";
import { FormTextInput } from "../components/FormTextInput";
import { Button } from "../components/Button";
import { useSubscriptionInfo } from "../hooks/use-subscription-info";
import { images } from "../lib/images";

export default function DeleteAccount() {
  return (
    <View className="flex-1 bg-white">
      <Text className="mt-4 text-base font-[jost600] text-center">
        Please re-enter your password.
      </Text>
      <View className="mt-10 px-10">
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
  const { user, signInWithEmail, isSigningInWithEmail, deleteAccount } =
    useAuth();
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm({
    values: {
      email: user?.email || "",
      password: "",
    },
    resolver: zodResolver(loginFormSchema),
  });
  const { customerInfo, currentSubscription } = useSubscriptionInfo();

  const deleteAcc = async () => {
    const showSubscriptionAlert = !currentSubscription;
    await deleteAccount();
    if (showSubscriptionAlert) {
      Alert.alert(
        "Account Deleted.",
        "Please manage your Crossed Pro subscription in app store",
        [
          {
            text: "OK",
            onPress: () =>
              Linking.openURL(customerInfo?.managementURL as string),
          },
        ]
      );
    } else {
      Alert.alert("Account Deleted.", "Your account was deleted.", [
        {
          text: "OK",
        },
      ]);
    }
  };

  const onSubmit = async (formValues: z.infer<typeof loginFormSchema>) => {
    await signInWithEmail(formValues);
    await deleteAcc();
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
            placeholder="example@gmail.com"
            onBlur={onBlur}
            onChangeText={onChange}
            value={value}
            keyboardType="email-address"
            autoComplete="email"
            autoCapitalize="none"
            editable={false}
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
          intent="danger"
          size="lg"
          rounded={"full"}
          isLoading={isSigningInWithEmail}
          label={"Delete Account"}
          onPress={handleSubmit(onSubmit)}
        />
      </View>
    </View>
  );
};
