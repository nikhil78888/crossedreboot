import { ActivityIndicator, Text, TouchableOpacityProps } from "react-native";
import { TouchableOpacity } from "react-native-gesture-handler";
import { GenericTouchableProps } from "react-native-gesture-handler/lib/typescript/components/touchables/GenericTouchable";
import { VariantProps, cva } from "class-variance-authority";

const button = cva("w-full items-center justify-center rounded", {
  variants: {
    intent: {
      primary: "bg-crossed-blue-500 shadow rounded-full",
      secondary: "bg-white border-0.5 border-crossed-gray-200 rounded-full",
      text: "",
    },
    size: { small: "h-8 px-3", medium: "h-10 px-3", large: "h-[54px]" },
  },
});

const buttonLabel = cva("font-[promptLight] tracking-widest", {
  variants: {
    intent: {
      primary: "text-white",
      secondary: "text-black",
      text: "",
    },
    size: { small: "", medium: "text-base", large: "text-base" },
  },
});

type ButtonProps = TouchableOpacityProps &
  GenericTouchableProps & { label: string; isLoading?: boolean } & VariantProps<
    typeof button
  >;

export const Button = (props: ButtonProps) => {
  const { intent, size } = props;
  return (
    <TouchableOpacity className={button({ intent, size })} {...props}>
      {props.isLoading ? (
        <ActivityIndicator />
      ) : (
        <Text className={buttonLabel({ intent, size })}>{props.label}</Text>
      )}
    </TouchableOpacity>
  );
};
