import { Platform, Share } from "react-native";
import { branch } from "./branch";

const APP_STORE = "https://apps.apple.com/us/app/crossed/id6448530256";

// A Branch deep link that drops an EXISTING player into today's Daily Duel and
// sends a NEW user to the App Store + normal onboarding. Falls back to the plain
// store link when Branch isn't on this build.
export const buildDuelLink = async (): Promise<string> => {
  try {
    if (branch) {
      const buo = await branch.createBranchUniversalObject("daily-duel", {
        title: "Crossed · Daily Duel",
        contentMetadata: { customMetadata: { duel: "true" } },
      });
      const res = await buo.generateShortUrl(
        { feature: "daily-duel-share" },
        { duel: "true" }
      );
      if (res?.url) return res.url;
    }
  } catch {
    // keep the App Store fallback
  }
  return APP_STORE;
};

// Share a duel brag: a rendered IMAGE card on builds that have the native capture
// module, and a plain-text message everywhere else (and if capture/share fails).
// `buildMessage` receives the resolved deep link so the text always carries it.
export const shareDuel = async (opts: {
  cardRef?: { current: unknown } | null;
  buildMessage: (link: string) => string;
}): Promise<void> => {
  const link = await buildDuelLink();
  const msg = opts.buildMessage(link);
  try {
    if (!opts.cardRef?.current) throw new Error("no card");
    // Loaded lazily so a build without the native module never crashes on import
    // (react-native-view-shot throws at import via TurboModuleRegistry.getEnforcing).
    // On such builds this throws here and we fall through to the text share.
    const { captureRef } = require("react-native-view-shot");
    const Sharing = require("expo-sharing");
    const uri = await captureRef(opts.cardRef, {
      format: "png",
      quality: 1,
      result: "tmpfile",
    });
    const fileUri = uri.startsWith("file://") ? uri : `file://${uri}`;
    if (Platform.OS === "ios") {
      await Share.share({ url: fileUri, message: link });
    } else if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(fileUri, {
        mimeType: "image/png",
        dialogTitle: "Share your Daily Duel",
      });
    } else {
      await Share.share({ message: msg });
    }
  } catch {
    Share.share({ message: msg }).catch(() => undefined);
  }
};
