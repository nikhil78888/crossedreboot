import { View } from "react-native";
import { LoaderScreen } from "react-native-ui-lib";
import WebView from "react-native-webview";

export default function Feedback() {
  //   return <LoaderScreen loaderColor="#354646" overlay />;
  return (
    <WebView
      source={{ uri: "https://0t5r4r1nsu6.typeform.com/to/DUbfDOEn" }}
      renderLoading={() => (
        <View className="absolute inset-0 h-full w-full">
          <LoaderScreen loaderColor="#354646" backgroundColor="#fff" />
        </View>
      )}
      startInLoadingState
    />
  );
}
