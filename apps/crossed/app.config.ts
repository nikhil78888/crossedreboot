module.exports = {
  expo: {
    name: "Crossed.",
    slug: "crossed",
    owner: "harshpillario",
    version: "1.0.3",
    orientation: "portrait",
    icon: "./assets/images/logo_black.png",
    userInterfaceStyle: "light",
    splash: {
      image: "./assets/images/splash.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff",
    },
    assetBundlePatterns: ["**/*"],
    ios: {
      supportsTablet: true,
      googleServicesFile: "./GoogleService-Info.plist",
      bundleIdentifier: "live.crossed.app",
      config: {
        usesNonExemptEncryption: false,
      },
    },
    android: {
      package: "live.crossed.app",
      googleServicesFile: "./google-services.json",
    },
    web: {
      favicon: "./assets/favicon.png",
    },
    plugins: [
      "@react-native-firebase/app",
      "@react-native-firebase/auth",
      [
        "expo-build-properties",
        {
          ios: {
            useFrameworks: "static",
          },
        },
      ],
      "sentry-expo",
      "@logrocket/react-native",
    ],
    scheme: "crossed",
    extra: {
      eas: {
        projectId: "95dd38ca-d0be-41ad-8148-56a2b4f5460e",
      },
      sentryDSN: process.env.SENTRY_DSN,
    },
    runtimeVersion: "1.0.3",
    updates: {
      url: "https://u.expo.dev/95dd38ca-d0be-41ad-8148-56a2b4f5460e",
    },
    hooks: {
      postPublish: [
        {
          file: "sentry-expo/upload-sourcemaps",
          config: {
            organization: "crossed",
            project: "crossed-mobile",
          },
        },
      ],
    },
  },
};
