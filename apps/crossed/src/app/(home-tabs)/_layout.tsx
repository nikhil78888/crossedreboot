import { Tabs } from "expo-router";
import { useEffect, useRef } from "react";
import { Animated, Text, View } from "react-native";
import { useAuth } from "../../hooks/use-auth";
import { Image } from "expo-image";
import { images } from "../../lib/images";
import { useDailyDone } from "../../hooks/use-daily-done";
import colors from "../../lib/colors";

// Daily tab icon: crossed swords + a bold red "!" badge when today's duel isn't
// done yet. The badge gently pulses to pull the eye.
const DailyTabIcon = ({ showDot }: { showDot: boolean }) => {
  const scale = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (!showDot) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(scale, {
          toValue: 1.25,
          duration: 650,
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 1,
          duration: 650,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [showDot, scale]);

  return (
    <View style={{ width: 26, height: 22, alignItems: "center" }}>
      <Text style={{ fontSize: 18 }}>⚔️</Text>
      {showDot && (
        <Animated.View
          style={{
            position: "absolute",
            top: -7,
            right: -9,
            minWidth: 19,
            height: 19,
            borderRadius: 10,
            backgroundColor: "#ef4444",
            borderWidth: 2,
            borderColor: "white",
            alignItems: "center",
            justifyContent: "center",
            paddingHorizontal: 3,
            transform: [{ scale }],
          }}
        >
          <Text
            style={{
              color: "white",
              fontSize: 12,
              fontWeight: "800",
              lineHeight: 14,
            }}
          >
            !
          </Text>
        </Animated.View>
      )}
    </View>
  );
};

export default function HomeLayout() {
  const { user } = useAuth();
  const dailyDone = useDailyDone();

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
        tabBarActiveTintColor: colors["crossed-blue"]["450"],
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
        name="daily"
        options={{
          tabBarLabel: "Duel",
          headerTitle: "Daily Duel",
          tabBarIcon: () => <DailyTabIcon showDot={dailyDone === false} />,
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
              source={images.ranked}
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
