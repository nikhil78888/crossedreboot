import { useNavigation } from "expo-router";
import { useLayoutEffect } from "react";
import { WebView } from "react-native-webview";

const PRIVACY_POLICY_URL =
  "https://firebasestorage.googleapis.com/v0/b/crossed-live.appspot.com/o/privacy-policy.pdf?alt=media&token=3fd85a20-e2ec-4b6d-9b8d-a828f885c7c9";

export default function PrivacyPolicy() {
  const navigation = useNavigation();
  useLayoutEffect(() => {
    navigation.setOptions({ headerTitle: "Privacy Policy" });
  }, [navigation]);
  return <WebView source={{ uri: PRIVACY_POLICY_URL }} style={{ flex: 1 }} />;
}
