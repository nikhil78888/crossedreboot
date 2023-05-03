import { useEffect } from "react";
import { SplashScreen, Stack, usePathname, useRouter } from "expo-router";
import { useFonts } from "expo-font";
import {
  Lato_300Light,
  Lato_400Regular,
  Lato_700Bold,
} from "@expo-google-fonts/lato";
import { Bitter_700Bold } from "@expo-google-fonts/bitter";
import * as Updates from "expo-updates";
import { useCurrentUser } from "../hooks/use-current-user";
import { Alert } from "react-native";

export default function IndexLayout() {
  const [fontsLoaded] = useFonts({
    Lato_300Light,
    Lato_400Regular,
    Lato_700Bold,
    Bitter_700Bold,
  });
  const { user, profile } = useCurrentUser();
  const router = useRouter();
  const pathname = usePathname();

  const isOnboardingComplete = !!profile?.username;
  const isReady = fontsLoaded && !!user;

  useEffect(() => {
    // Redirect to onboarding if required
    if (isReady && !isOnboardingComplete && pathname !== "/onboarding") {
      router.push("/onboarding");
    }
  }, [isOnboardingComplete, isReady, pathname, router]);

  useEffect(() => {
    // Check for updates
    const checkForUpdates = async () => {
      try {
        const update = await Updates.checkForUpdateAsync();

        if (update.isAvailable) {
          const updateResult = await Updates.fetchUpdateAsync();
          if (updateResult) {
            Alert.alert(
              "New Stuff Alert!",
              "A new update is available. Please reload the app to enjoy a better experience.",
              [{ text: "Reload", onPress: Updates.reloadAsync }]
            );
          }
        }
      } catch (error) {
        // You can also add an alert() to see the error message in case of an error when fetching updates.
        console.info(`Error fetching latest Expo update: ${error}`);
      }
    };
    checkForUpdates();
  }, []);

  if (!isReady) {
    return <SplashScreen />;
  }

  return (
    <Stack
      screenOptions={{
        gestureEnabled: false,
        headerTitleStyle: { fontSize: 24, fontFamily: "Bitter_700Bold" },
        headerBackVisible: false,
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="onboarding" options={{ headerShown: false }} />
      <Stack.Screen name="invite-friend" options={{ headerShown: false }} />
      <Stack.Screen name="join-game" options={{ headerShown: false }} />
      <Stack.Screen name="game" options={{ headerTitle: "Match" }} />
      <Stack.Screen name="game-results" options={{ headerTitle: "Results" }} />
      <Stack.Screen name="view-answers" options={{ headerTitle: "Answers" }} />
      <Stack.Screen
        name="feedback"
        options={{
          headerTitle: "Feedback",
          presentation: "modal",
          gestureEnabled: true,
        }}
      />
    </Stack>
  );
}
