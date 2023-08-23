import { Stack } from "expo-router";

export default function PublicLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen
        name="public-web-view"
        options={{ presentation: "modal" }}
      />
    </Stack>
  );
}
