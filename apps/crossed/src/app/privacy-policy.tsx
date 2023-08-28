import { useNavigation } from "expo-router";
import { useLayoutEffect } from "react";
import { useWindowDimensions } from "react-native";
import Pdf from "react-native-pdf";

export default function CWebView() {
  const navigation = useNavigation();
  const { height, width } = useWindowDimensions();
  useLayoutEffect(() => {
    navigation.setOptions({ headerTitle: "Privary Policy" });
  }, [navigation]);
  return (
    <Pdf
      source={{
        uri: "https://firebasestorage.googleapis.com/v0/b/crossed-live.appspot.com/o/privacy-policy.pdf?alt=media&token=3fd85a20-e2ec-4b6d-9b8d-a828f885c7c9",
        cache: true,
      }}
      style={{ flex: 1, height, width }}
    />
  );
}
