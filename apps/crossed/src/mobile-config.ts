import { TestIds } from "react-native-google-mobile-ads";

export const mobileConfig = {
  sentryDSN: process.env.EXPO_PUBLIC_SENTRY_DSN,
  apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL,
  homeScreenAdId: __DEV__
    ? TestIds.BANNER
    : "ca-app-pub-2740483950780206/4682712660",
  resultsScreenAdId: __DEV__
    ? TestIds.BANNER
    : "ca-app-pub-2740483950780206/4231803446",
  inviteFriendScreenAdId: __DEV__
    ? TestIds.BANNER
    : "ca-app-pub-2740483950780206/2603344239",
  lobbyScreenAdId: __DEV__
    ? TestIds.BANNER
    : "ca-app-pub-2740483950780206/7417467460",
  interstitialAdId: __DEV__
    ? TestIds.INTERSTITIAL
    : "ca-app-pub-2740483950780206/4059997763",
  revenueCatAPIKey: "appl_wtDAWNsfUysrDEiBbTZdIhgesdW",
};
