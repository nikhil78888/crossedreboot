import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, Controller } from "react-hook-form";
import { View, Text } from "react-native";
import { z } from "zod";
import { FormTextInput } from "../components/FormTextInput";
import { useMyProfile } from "../hooks/use-my-profile";
import { Button } from "../components/Button";

export default function UpdateAccountForm() {
  const { myProfile, updateProfile, isUpdatingProfile } = useMyProfile();
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm({
    defaultValues: {
      name: "",
    },
    values: {
      name: myProfile?.name || "",
    },
    resolver: zodResolver(updateAccountFormSchema),
  });

  const onSubmit = async (
    formValues: z.infer<typeof updateAccountFormSchema>
  ) => {
    if (myProfile) {
      await updateProfile({
        userId: myProfile.userId,
        name: formValues.name,
      });
    }
  };

  return (
    <View className="flex-1 bg-white px-4">
      <View className="mt-8">
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
        {errors.root?.message && (
          <Text className="text-xs text-red-500 text-center my-1">
            {errors.root.message}
          </Text>
        )}
        <View className="mt-4">
          <Button
            onPress={handleSubmit(onSubmit)}
            isLoading={isUpdatingProfile}
            label={"Update Account"}
            intent="primary"
            size="large"
          />
        </View>
      </View>
    </View>
  );
}

const updateAccountFormSchema = z.object({
  name: z
    .string({ required_error: "Please provide your name" })
    .nonempty({ message: "Please provide your name" }),
});
