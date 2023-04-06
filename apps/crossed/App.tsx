import { SafeAreaProvider } from "react-native-safe-area-context";
import { Crossword } from "./src/Crossword";
import { useFonts } from "expo-font";
import { Lato_300Light } from "@expo-google-fonts/lato";
import { Bitter_700Bold } from "@expo-google-fonts/bitter";

export default function App() {
  const [fontsLoaded] = useFonts({ Lato_300Light, Bitter_700Bold });

  if (!fontsLoaded) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <Crossword />
    </SafeAreaProvider>
  );
}
