import { ActivityIndicator, Text, TouchableOpacityProps } from "react-native";
import { TouchableOpacity } from "react-native-gesture-handler";
import { GenericTouchableProps } from "react-native-gesture-handler/lib/typescript/components/touchables/GenericTouchable";
import { VariantProps, cva } from "class-variance-authority";

const button = cva("w-full items-center justify-center rounded", {
  variants: {
    intent: {
      primary: "bg-crossed-yellow-300 rounded-full",
      secondary: "bg-cr-gray-300 rounded-full",
      text: "",
    },
    size: {
      small: "h-[29] px-3.5",
      medium: "h-10 px-3.5",
      large: "h-[54px]",
      tiny: "",
    },
  },
});

const buttonLabel = cva("font-[promptLight] tracking-widest", {
  variants: {
    intent: {
      primary: "text-cr-gray-800 font-[jost500]",
      secondary: "text-crossed-blue-500 font-[mukta400]",
      text: "font-[mukta700] text-crossed-blue-500",
    },
    size: {
      tiny: "text-sm",
      small: "text-sm",
      medium: "text-sm",
      large: "text-xl",
    },
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
