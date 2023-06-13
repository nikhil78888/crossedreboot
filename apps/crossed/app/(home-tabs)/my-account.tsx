import { Text, View } from "react-native";
import { useAuth } from "../../hooks/use-auth";
import { Button } from "../../components/Button";
import { useMyProfile } from "../../hooks/use-my-profile";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { FormTextInput } from "../../components/FormTextInput";
import { avatars, images } from "../../lib/images";
import { Image } from "expo-image";
import { Avatar } from "react-native-ui-lib";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import colors from "../../lib/colors";

export default function MyAccount() {
  const { user, logout } = useAuth();
  const { myProfile } = useMyProfile();
  const router = useRouter();

  if (!user || !myProfile) {
    return null;
  }

  if (user.isAnonymous) {
    return (
      <Image source={images.splash_bg} className="flex-1 px-4">
        <View className="mt-16 items-center">
          <Image source={images.logo} className="h-20 aspect-square" />
          <Text className="mt-1 text-crossed-green-900 text-xl font-[latoBold]">
            {myProfile?.username}
          </Text>
          <Text className="mt-6 text-crossed-blue-700 text-[36px] font-[bitterBold]">
            Create your account
          </Text>
        </View>
        <View className="mt-6">
          <CreateAccountForm />
        </View>
      </Image>
    );
  }

  return (
    <View className="flex-1 px-4 bg-gray-50">
      <View className="mt-16 items-center">
        <Avatar
          size={128}
          name={myProfile.name || ""}
          onPress={() => {
            router.push("/choose-avatar");
          }}
          imageStyle={{ backgroundColor: "white" }}
          source={
            myProfile.avatar
              ? avatars[myProfile.avatar as keyof typeof avatars]
              : images.tab_my_account
          }
        />
        <Text className="mt-4 text-crossed-green-900 text-xl font-[latoBold]">
          {myProfile?.username}
        </Text>
      </View>
      <View className="mt-8 bg-white shadow-sm divide-y divide-gray-50 px-3">
        <View className="flex-row items-center py-3">
          <Ionicons
            name="ios-person"
            size={28}
            color={colors["crossed-blue"][700]}
          />
          <Text className="font-[latoLight] text-lg ml-4">
            {myProfile.name}
          </Text>
        </View>
        <View className="flex-row items-center py-3">
          <Ionicons
            name="ios-mail"
            size={28}
            color={colors["crossed-blue"][700]}
          />
          <Text className="font-[latoLight] text-lg ml-4">
            {myProfile.email}
          </Text>
        </View>
      </View>
      <View className="items-center mt-8">
        <Button
          intent="text"
          label="Logout"
          size="medium"
          onPress={() => {
            logout();
          }}
        />
      </View>
    </View>
  );
}

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

const CreateAccountForm = () => {
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
        <Text className="text-xs text-red-500 text-center my-1">
          {errors.root.message}
        </Text>
      )}
      <View className="mt-4">
        <Button
          onPress={handleSubmit(onSubmit)}
          label={isLinkingAccount ? "Please wait..." : "Create Account"}
          intent="primary"
          size="large"
        />
      </View>
    </View>
  );
};

const updateAccountFormSchema = z.object({
  name: z
    .string({ required_error: "Please provide your name" })
    .nonempty({ message: "Please provide your name" }),
  email: z
    .string({ required_error: "Please provide your email" })
    .nonempty({ message: "Please provide your email" })
    .email({ message: "Please provide a valid email" }),
});

const UpdateAccountForm = () => {
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
    resolver: zodResolver(updateAccountFormSchema),
  });
  const { user, isLinkingAccount } = useAuth();
  const { updateProfile } = useMyProfile();

  const onSubmit = async (
    formValues: z.infer<typeof updateAccountFormSchema>
  ) => {
    if (user) {
      await updateProfile({
        userId: user.uid,
        name: formValues.name,
        email: formValues.email,
      });
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
      {errors.root?.message && (
        <Text className="text-xs text-red-500 text-center my-1">
          {errors.root.message}
        </Text>
      )}
      <View className="mt-4">
        <Button
          onPress={handleSubmit(onSubmit)}
          label={isLinkingAccount ? "Please wait..." : "Update Account"}
          intent="primary"
          size="large"
        />
      </View>
    </View>
  );
};
