import { Tabs } from "expo-router";
import { useAuth } from "../../hooks/use-auth";
import { Image } from "expo-image";
import Purchases from "react-native-purchases";
import { images } from "../../lib/images";
import { useEffect, useState } from "react";
import mobileAds, { MaxAdContentRating } from "react-native-google-mobile-ads";
import { mobileConfig } from "../../mobile-config";
import { useOfferings } from "../../hooks/use-offerings";

export default function HomeLayout() {
  const { user } = useAuth();
  const [adReady, setAdReady] = useState(false);
  const { offerings } = useOfferings();

  console.log({ offerings });

  useEffect(() => {
    Purchases.setLogLevel(Purchases.LOG_LEVEL.DEBUG);
    if (user?.uid) {
      Purchases.configure({
        apiKey: mobileConfig.revenueCatAPIKey,
        appUserID: user.uid,
      });
    }
  }, [user?.uid]);

  useEffect(() => {
    mobileAds()
      .setRequestConfiguration({
        // Update all future requests suitable for parental guidance
        maxAdContentRating: MaxAdContentRating.PG,

        // Indicates that you want your content treated as child-directed for purposes of COPPA.
        tagForChildDirectedTreatment: true,

        // Indicates that you want the ad request to be handled in a
        // manner suitable for users under the age of consent.
        tagForUnderAgeOfConsent: true,

        // An array of test device IDs to allow.
        testDeviceIdentifiers: ["EMULATOR"],
      })
      .then(() => {
        // Request config successfully set!
        mobileAds()
          .initialize()
          .then(() => {
            setAdReady(true);
          });
      });
  }, []);

  if (!user || !adReady) {
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
