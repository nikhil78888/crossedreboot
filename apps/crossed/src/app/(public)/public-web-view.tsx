import { useLocalSearchParams, useNavigation } from "expo-router";
import { useLayoutEffect } from "react";
import { View } from "react-native";
import { LoaderScreen } from "react-native-ui-lib";
import WebView from "react-native-webview";

export default function CWebView() {
  const { uri, title } = useLocalSearchParams();
  const navigation = useNavigation();
  useLayoutEffect(() => {
    navigation.setOptions({ headerTitle: title });
  }, [navigation, title]);
  return (
    <WebView
      source={{ uri: uri as string }}
      renderLoading={() => (
        <View className="absolute inset-0 h-full w-full">
          <LoaderScreen loaderColor="#354646" backgroundColor="#fff" />
        </View>
      )}
      startInLoadingState
    />
  );
}
