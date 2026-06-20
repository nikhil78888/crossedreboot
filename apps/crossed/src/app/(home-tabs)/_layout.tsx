import { Tabs } from "expo-router";
import { useAuth } from "../../hooks/use-auth";
import { Image } from "expo-image";
import { images } from "../../lib/images";

export default function HomeLayout() {
  const { user } = useAuth();

  if (!user) {
    return null;
  }

  return (
    <Tabs
      screenOptions={{
        headerTitleStyle: {
          fontFamily: "jost600",
          fontSize: 28,
          lineHeight: 40,
        },
        headerShadowVisible: false,
        tabBarLabelStyle: {
          fontFamily: "jost500",
          fontSize: 12,
        },
        tabBarActiveTintColor: "#000",
        tabBarInactiveTintColor: "#B8B8B8",
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          tabBarLabel: "Home",
          headerTitle: "Crossed.",
          tabBarIcon: ({ color }) => (
            <Image
              source={images.tab_home}
              className="h-5 w-5"
              style={{ tintColor: color }}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="stats"
        options={{
          tabBarLabel: "Stats",
          headerTitle: "My Stats",
          tabBarIcon: ({ color }) => (
            <Image
              source={images.tab_stats}
              className="h-5 w-5"
              style={{ tintColor: color }}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="leaderboard"
        options={{
          tabBarLabel: "Ranks",
          headerTitle: "Leaderboard",
          tabBarIcon: ({ color }) => (
            <Image
              source={images.rating}
              className="h-5 w-5"
              style={{ tintColor: color }}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="my-account"
        options={{
          headerTitle: "My Account",
          tabBarLabel: "My Account",
          tabBarIcon: ({ color }) => (
            <Image
              source={images.tab_my_account}
              className="h-5 w-[17.62]"
              style={{ tintColor: color }}
            />
          ),
        }}
      />
    </Tabs>
  );
}
