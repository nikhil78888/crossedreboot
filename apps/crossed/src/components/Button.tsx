import { Text, TouchableOpacityProps } from "react-native";
import { TouchableOpacity } from "react-native-gesture-handler";
import { GenericTouchableProps } from "react-native-gesture-handler/lib/typescript/components/touchables/GenericTouchable";
import { VariantProps, cva } from "class-variance-authority";

const button = cva("w-full items-center justify-center rounded", {
  variants: {
    intent: {
      primary: "bg-crossed-blue-400 border border-crossed-blue-300",
      secondary: "bg-crossed-gray-100 border-2 border-crossed-blue-400",
      text: "",
    },
    size: { small: "", medium: "h-10 px-3", large: "h-[60]" },
  },
});

const buttonLabel = cva("font-[bitterBold]", {
  variants: {
    intent: {
      primary: "text-white font-[bitterBold]",
      secondary: "font-[bitterBold] text-crossed-blue-400",
      text: "font-[bitterBold]",
    },
    size: { small: "", medium: "text-base", large: "text-2xl" },
  },
});

type ButtonProps = TouchableOpacityProps &
  GenericTouchableProps & { label: string } & VariantProps<typeof button>;

export const Button = (props: ButtonProps) => {
  const { intent, size } = props;
  return (
    <TouchableOpacity
      onPress={props.onPress}
      className={button({ intent, size })}
    >
      <Text className={buttonLabel({ intent, size })}>{props.label}</Text>
    </TouchableOpacity>
  );
};
