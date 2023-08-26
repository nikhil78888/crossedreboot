import { ActivityIndicator, Text, TouchableOpacityProps } from "react-native";
import { TouchableOpacity } from "react-native-gesture-handler";
import { GenericTouchableProps } from "react-native-gesture-handler/lib/typescript/components/touchables/GenericTouchable";
import { VariantProps, cva } from "class-variance-authority";

const button = cva("items-center justify-center", {
  variants: {
    intent: {
      primary: "",
      secondary: "",
      danger: "",
    },
    size: {
      xs: "p-1 px-2",
      sm: "h-7 px-2",
      base: "h-10",
      lg: "h-[54]",
      xl: "h-[60]",
    },
    mode: {
      contained: "",
      outline: "",
      text: "",
    },
    rounded: {
      none: "rounded-none",
      base: "rounded-lg",
      full: "rounded-full",
    },
  },
  compoundVariants: [
    {
      intent: "primary",
      mode: "contained",
      className: "bg-crossed-yellow-300",
    },
    { intent: "secondary", mode: "contained", className: "bg-cr-gray-300" },
    { intent: "danger", mode: "contained", className: "bg-crossed-red-500" },
    {
      intent: "primary",
      mode: "outline",
      className: "border border-crossed-yellow-300 bg-white",
    },
    {
      intent: "secondary",
      mode: "outline",
      className: "border border-cr-gray-300 bg-white",
    },
    {
      intent: "danger",
      mode: "outline",
      className: "border border-crossed-red-500 bg-white",
    },
  ],
  defaultVariants: {
    intent: "primary",
    size: "base",
    mode: "contained",
    rounded: "base",
  },
});

const buttonLabel = cva("", {
  variants: {
    intent: {
      primary: "font-[jost500]",
      secondary: "font-[mukta400]",
      danger: "font-[jost500]",
    },
    size: {
      xs: "text-xs leading-none",
      sm: "text-sm",
      base: "text-base",
      lg: "text-lg font-semibold",
      xl: "text-xl",
    },
    mode: {
      contained: "",
      outline: "",
      text: "",
    },
  },
  compoundVariants: [
    { intent: "primary", mode: "contained", className: "text-cr-gray-800" },
    {
      intent: "secondary",
      mode: "contained",
      className: "text-crossed-blue-500",
    },
    { intent: "danger", mode: "contained", className: "text-white" },
    {
      intent: "primary",
      mode: ["outline", "text"],
      className: "text-cr-gray-800",
    },
    {
      intent: "secondary",
      mode: ["outline", "text"],
      className: "text-crossed-blue-500",
    },
    {
      intent: "danger",
      mode: ["outline", "text"],
      className: "text-crossed-red-500",
    },
  ],
  defaultVariants: {
    intent: "primary",
    size: "base",
    mode: "contained",
  },
});

type ButtonProps = TouchableOpacityProps &
  GenericTouchableProps & { label: string; isLoading?: boolean } & VariantProps<
    typeof button
  >;

export const Button = (props: ButtonProps) => {
  const { intent, size, mode, label, rounded, isLoading, ...btnProps } = props;
  return (
    <TouchableOpacity
      {...btnProps}
      className={button({ intent, size, mode, rounded })}
    >
      {isLoading ? (
        <ActivityIndicator />
      ) : (
        <Text className={buttonLabel({ intent, size, mode })}>{label}</Text>
      )}
    </TouchableOpacity>
  );
};
