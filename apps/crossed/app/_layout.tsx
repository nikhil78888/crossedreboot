import { useEffect } from "react";
import { SplashScreen, Stack, usePathname, useRouter } from "expo-router";
import { useFonts } from "expo-font";
import {
  Lato_300Light,
  Lato_400Regular,
  Lato_700Bold,
} from "@expo-google-fonts/lato";
import { Bitter_700Bold } from "@expo-google-fonts/bitter";
import { useCurrentUser } from "../hooks/use-current-user";

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
    if (isReady && !isOnboardingComplete && pathname !== "/onboarding") {
      router.push("/onboarding");
    }
  }, [isOnboardingComplete, isReady, pathname, router]);

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
    </Stack>
  );
}
