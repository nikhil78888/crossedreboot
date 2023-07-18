import { Redirect } from "expo-router";
import { Text } from "react-native";

export default function Index() {
  return <Redirect href="/(home-tabs)/home" />;
}
