import { Image } from "expo-image";
import { Text, View } from "react-native";
import { Controller, useForm } from "react-hook-form";
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { images } from "../../lib/images";
import { useAuth } from "../../hooks/use-auth";
import { FormTextInput } from "../../components/FormTextInput";
import { Button } from "../../components/Button";

export default function SignIn() {
  return (
    <Image source={images.splash_bg} className="flex-1 px-4">
      <View className="mt-32 items-center">
        <Image source={images.logo} className="h-20 aspect-square" />
        <Text className="mt-1 text-crossed-green-900 text-xl font-[latoBold]">
          Crossed
        </Text>
      </View>
      <Text className="my-6 text-4xl text-center text-crossed-blue-700 font-[bitterBold]">
        Sign In
      </Text>
      <LoginForm />
    </Image>
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
  const { signInWithEmail } = useAuth();

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
          label="Login"
          onPress={handleSubmit(onSubmit)}
        />
      </View>
    </View>
  );
};
