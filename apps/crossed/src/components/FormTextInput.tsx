import { Text, TextInputProps, View } from "react-native";
import {
  NativeViewGestureHandlerProps,
  TextInput,
} from "react-native-gesture-handler";

type FormTextInputProps = TextInputProps &
  NativeViewGestureHandlerProps & { label: string; error?: string };

export const FormTextInput = (props: FormTextInputProps) => {
  const { label, error, ...textInputProps } = props;
  return (
    <View className="mt-2">
      <Text className="text-crossed-green-900 font-[latoRegular]">
        {props.label}
      </Text>
      <TextInput
        className="mt-1 h-[60] border border-gray-200 px-3 rounded-sm"
        {...textInputProps}
      />
      <View className="h-4">
        {error && (
          <Text className="text-xs text-red-500 font-[latoRegular]">
            {error}
          </Text>
        )}
      </View>
    </View>
  );
};
