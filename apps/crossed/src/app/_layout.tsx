import "../../global.css";
import "../lib/nativewind-interop";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useEffect } from "react";
import { SplashScreen, Stack, useRouter, useSegments } from "expo-router";
import { useFonts } from "expo-font";
import { KeyboardProvider } from "react-native-keyboard-controller";
import {
  Lato_300Light,
  Lato_400Regular,
  Lato_700Bold,
  Lato_900Black,
} from "@expo-google-fonts/lato";
import {
  Prompt_300Light,
  Prompt_400Regular,
  Prompt_500Medium,
  Prompt_600SemiBold,
} from "@expo-google-fonts/prompt";
import {
  Jost_300Light,
  Jost_400Regular,
  Jost_500Medium,
  Jost_600SemiBold,
  Jost_700Bold,
  Jost_800ExtraBold,
} from "@expo-google-fonts/jost";
import { Montserrat_700Bold } from "@expo-google-fonts/montserrat";
import { Mukta_400Regular, Mukta_700Bold } from "@expo-google-fonts/mukta";
import {
  Rubik_400Regular,
  Rubik_500Medium,
  Rubik_600SemiBold,
  Rubik_700Bold,
} from "@expo-google-fonts/rubik";
import { Besley_500Medium } from "@expo-google-fonts/besley";
import { Bitter_700Bold } from "@expo-google-fonts/bitter";
import * as Updates from "expo-updates";
import { Alert } from "react-native";
import { useAuth } from "../hooks/use-auth";
import { useHeartbeat } from "../hooks/use-heartbeat";
import { useMyProfile } from "../hooks/use-my-profile";
import { configureRevenueCat } from "../lib/revenuecat";
import { mobileConfig } from "../mobile-config";
import axios from "axios";
import { BackButton } from "../components/BackButton";
import { ErrorBoundary } from "../components/ErrorBoundary";
import { VariantProvider } from "../hooks/use-variant";

axios.defaults.baseURL = mobileConfig.apiBaseUrl;

SplashScreen.preventAutoHideAsync();

export default function IndexLayout() {
  const [fontsLoaded] = useFonts({
    latoLight: Lato_300Light,
    latoRegular: Lato_400Regular,
    latoBold: Lato_700Bold,
    latoBlack: Lato_900Black,
    promptLight: Prompt_300Light,
    promptRegular: Prompt_400Regular,
    promptMedium: Prompt_500Medium,
    promptSemiBold: Prompt_600SemiBold,
    besleyMedium: Besley_500Medium,
    bitterBold: Bitter_700Bold,
    jost300: Jost_300Light,
    jost400: Jost_400Regular,
    jost500: Jost_500Medium,
    jost600: Jost_600SemiBold,
    jost700: Jost_700Bold,
    jost800: Jost_800ExtraBold,
    rubik400: Rubik_400Regular,
    rubik500: Rubik_500Medium,
    rubik600: Rubik_600SemiBold,
    rubik700: Rubik_700Bold,
    mukta400: Mukta_400Regular,
    mukta700: Mukta_700Bold,
    montserrat700: Montserrat_700Bold,
  });
  const { user, isLoadingUser } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  const isReady = fontsLoaded && !isLoadingUser;


  useEffect(() => {
    if (isReady) {
      const inAuthGroup = segments[0] === "(public)";
      // Redirect to auth flow if required
      if (!user && !inAuthGroup) {
        router.replace("/welcome");
      } else if (user && inAuthGroup) {
        router.replace("/home");
      }
    }
  }, [isReady, router, segments, user]);

  // Keep online presence fresh for the friends list.
  useHeartbeat();

  // Initialize RevenueCat (anonymously first, then tie purchases to the profile).
  const { myProfile } = useMyProfile();
  useEffect(() => {
    configureRevenueCat(myProfile?.id);
  }, [myProfile?.id]);

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
              [{ text: "Reload", onPress: () => Updates.reloadAsync() }]
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

  useEffect(() => {
    if (isReady) {
      SplashScreen.hideAsync();
    }
  }, [isReady]);

  if (!isReady) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
    <ErrorBoundary>
    <VariantProvider>
    <KeyboardProvider>
      <Stack
        screenOptions={{
          headerTitleStyle: { fontSize: 28, fontFamily: "jost600" },
          headerShadowVisible: false,
          headerLeft: BackButton,
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(public)" options={{ headerShown: false }} />
        <Stack.Screen name="(home-tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="invite-friend"
          options={{ title: "Friendly Match", headerBackVisible: false }}
        />
        <Stack.Screen name="join-game" options={{ title: "Join Game" }} />
        <Stack.Screen
          name="game"
          options={{
            headerTitle: "Match",
            headerTitleStyle: { fontSize: 26, fontFamily: "jost600" },
            gestureEnabled: false,
            headerLeft: () => <></>,
          }}
        />
        <Stack.Screen
          name="game-results"
          options={{
            headerTitle: "Results",
            gestureEnabled: false,
            headerBackVisible: false,
          }}
        />
        <Stack.Screen
          name="view-answers"
          options={{
            headerTitle: "Answers",
          }}
        />
        <Stack.Screen
          name="choose-avatar"
          options={{
            headerTitle: "Choose Avatar",
          }}
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
          }}
        />
        <Stack.Screen
          name="update-profile"
          options={{
            headerTitle: "Update Profile",
          }}
        />
        <Stack.Screen
          name="ranked-lobby"
          options={{
            headerTitle: "Ranked Match",
          }}
        />
        <Stack.Screen
          name="tournament"
          options={{
            headerTitle: "Tournament",
            gestureEnabled: false,
            headerBackVisible: false,
          }}
        />
        <Stack.Screen
          name="tournament-invite"
          options={{ headerTitle: "Invite Friends" }}
        />
        <Stack.Screen
          name="select-difficulty"
          options={{ headerTitle: "Difficulty" }}
        />
        <Stack.Screen name="friends" options={{ headerTitle: "Friends" }} />
        <Stack.Screen
          name="friend-profile"
          options={{ headerTitle: "Profile" }}
        />
        <Stack.Screen
          name="upgrade-to-pro"
          options={{
            headerTitle: "Upgrade",
          }}
        />
        <Stack.Screen
          name="create-account"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="delete-account"
          options={{
            headerTitle: "Delete Account",
          }}
        />
      </Stack>
    </KeyboardProvider>
    </VariantProvider>
    </ErrorBoundary>
    </GestureHandlerRootView>
  );
}
