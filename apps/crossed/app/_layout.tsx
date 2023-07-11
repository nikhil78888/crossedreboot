import { useEffect } from "react";
import { SplashScreen, Stack, useRouter, useSegments } from "expo-router";
import { useFonts } from "expo-font";
import * as Sentry from "sentry-expo";
import {
  Lato_300Light,
  Lato_400Regular,
  Lato_700Bold,
  Lato_900Black,
} from "@expo-google-fonts/lato";
import { Bitter_700Bold } from "@expo-google-fonts/bitter";
import * as Updates from "expo-updates";
import { Alert } from "react-native";
import Constants from "expo-constants";
import LogRocket from "@logrocket/react-native";
import { useAuth } from "../hooks/use-auth";

Sentry.init({
  dsn: Constants.expoConfig?.extra?.sentryDSN,
  enableInExpoDevelopment: false,
  debug: __DEV__,
});

export default function IndexLayout() {
  const [fontsLoaded] = useFonts({
    latoLight: Lato_300Light,
    latoRegular: Lato_400Regular,
    latoBold: Lato_700Bold,
    latoBlack: Lato_900Black,
    bitterBold: Bitter_700Bold,
  });
  const { user, isLoadingUser } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  const isReady = fontsLoaded && !isLoadingUser;

  // setup logrocket
  useEffect(() => {
    if (!__DEV__ && user?.uid && user.displayName) {
      LogRocket.init("mvzgsv/crossed");
      LogRocket.identify(user.uid, { username: user.displayName });
    }
  }, [user?.displayName, user?.uid]);

  useEffect(() => {
    if (isReady) {
      const inAuthGroup = segments[0] === "(public)";
      // Redirect to auth flow if required
      if (!user && !inAuthGroup) {
        router.replace("/welcome");
      } else if (user && inAuthGroup) {
        router.replace("/");
      }
    }
  }, [isReady, router, segments, user]);

  // Check for updates
  useEffect(() => {
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
        Sentry.Native.captureException(
          `Error fetching latest Expo update: ${error}`
        );
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
        headerTitleStyle: { fontSize: 24, fontFamily: "bitterBold" },
        headerBackVisible: false,
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="(public)" options={{ headerShown: false }} />
      <Stack.Screen name="(home-tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="invite-friend" options={{ headerShown: false }} />
      <Stack.Screen name="join-game" options={{ headerShown: false }} />
      <Stack.Screen name="game" options={{ headerTitle: "Match" }} />
      <Stack.Screen name="game-results" options={{ headerTitle: "Results" }} />
      <Stack.Screen name="view-answers" options={{ headerTitle: "Answers" }} />
      <Stack.Screen
        name="choose-avatar"
        options={{ headerTitle: "Choose Avatar", headerBackVisible: true }}
      />
      <Stack.Screen
        name="notifications"
        options={{ headerTitle: "Notifications" }}
      />
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
