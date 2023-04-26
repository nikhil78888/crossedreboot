import { TouchableOpacity } from "react-native";

export const PrimaryButton = ({
  children,
  onPress,
}: {
  children: React.ReactNode;
  onPress: () => void;
}) => {
  return (
    <TouchableOpacity
      onPress={onPress}
      className="h-12 w-full bg-crossed-blue-400 border border-crossed-blue-300 rounded"
    >
      {children}
    </TouchableOpacity>
  );
};
