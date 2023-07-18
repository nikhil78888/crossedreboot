import { Tabs } from "expo-router";
import { useAuth } from "../../hooks/use-auth";
import { Image } from "expo-image";
import { images } from "../../lib/images";
import axios from "axios";
import { mobileConfig } from "../../mobile-config";

axios.defaults.baseURL = mobileConfig.apiBaseUrl;

export default function HomeLayout() {
  const { user } = useAuth();
  if (!user) {
    return null;
  }
  return (
    <Tabs
      screenOptions={{
        headerTitleStyle: {
          fontFamily: "bitterBold",
          fontSize: 32,
          lineHeight: 38.4,
        },
        // headerRight: () => (
        //   <TouchableOpacity
        //     onPress={() => router.push("/notifications")}
        //     className="mr-4"
        //   >
        //     <Image source={images.bell} className="h-[25] w-[22.47]" />
        //   </TouchableOpacity>
        // ),
        tabBarLabelStyle: {
          fontFamily: "bitterBold",
          fontSize: 12,
        },
        tabBarActiveTintColor: "#316C81",
        tabBarInactiveTintColor: "#BDCBCB",
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
