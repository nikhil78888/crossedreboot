import { Image, ImageSource } from "expo-image";
import { Text, TextInputProps, View } from "react-native";
import {
  NativeViewGestureHandlerProps,
  TextInput,
} from "react-native-gesture-handler";
import { classNames } from "../lib/utils";

type FormTextInputProps = TextInputProps &
  NativeViewGestureHandlerProps & {
    error?: string;
    icon?: ImageSource;
  };

export const FormTextInput = (props: FormTextInputProps) => {
  const { error, icon, ...textInputProps } = props;
  return (
    <View className="mt-2">
      <View>
        <TextInput
          className={classNames(
            "bg-cr-gray-300 h-[60px] px-3 rounded-2xl font-[jost500]",
            icon ? "pl-[60px]" : ""
          )}
          {...textInputProps}
        />
        {icon && (
          <View className="absolute left-0 inset-y-0 items-center justify-center p-3">
            <Image source={icon} className="h-9 w-9" contentFit="contain" />
          </View>
        )}
      </View>
      <View className="h-4">
        {error && (
          <Text className="text-xs text-red-400 font-[jost400]">{error}</Text>
        )}
      </View>
    </View>
  );
};
