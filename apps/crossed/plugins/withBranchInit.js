const { withAppDelegate, withDangerousMod } = require("expo/config-plugins");
const path = require("path");
const fs = require("fs");

/**
 * @config-plugins/react-native-branch only edits the bridging header + Info.plist.
 * It assumes you wire `RNBranch` into your AppDelegate yourself — which the
 * library's docs require, but Expo's generated Swift AppDelegate has none of it.
 * Without `initSession`, Branch never initializes: link generation fails (we fall
 * back to a plain https link → 404) and incoming universal/URI links are ignored.
 *
 * This plugin injects the missing pieces into AppDelegate.swift:
 *   1. RNBranch.initSession(...) in didFinishLaunchingWithOptions
 *   2. RNBranch.application(_:open:options:) in the openURL handler
 *   3. RNBranch.continueUserActivity(_:) in the Universal Links handler
 * and exposes RNBranch to Swift via the bridging header (<RNBranch/RNBranch.h>;
 * header_dir = 'RNBranch' in the podspec). Idempotent via a "withBranchInit" marker.
 */
const INIT_SNIPPET =
  "    RNBranch.initSession(launchOptions: launchOptions, isReferrable: true) // withBranchInit";
const OPENURL_SNIPPET = [
  "    if RNBranch.application(app, open: url, options: options) { // withBranchInit",
  "      return true",
  "    }",
].join("\n");
const CONTINUE_SNIPPET = [
  "    if RNBranch.continueUserActivity(userActivity) { // withBranchInit",
  "      return true",
  "    }",
].join("\n");

const withBranchInit = (config) => {
  // 1–3: patch AppDelegate.swift
  config = withAppDelegate(config, (config) => {
    let src = config.modResults.contents;
    if (!src.includes("withBranchInit")) {
      // initSession — right before React Native starts (window already exists).
      src = src.replace(
        /(\n)(\s*)factory\.startReactNative\(/,
        `$1${INIT_SNIPPET}$1$2factory.startReactNative(`
      );
      // URI-scheme links — insert before the base return (the Firebase auth mod
      // runs after this one, so don't anchor on its @generated block).
      src = src.replace(
        /(\n)(\s*)(return super\.application\(app, open: url, options: options\))/,
        `$1${OPENURL_SNIPPET}$1$2$3`
      );
      // Universal Links — before the default RCTLinkingManager handling.
      src = src.replace(
        /(\n)(\s*)let result = RCTLinkingManager\.application\(application, continue: userActivity/,
        `$1${CONTINUE_SNIPPET}$1$2let result = RCTLinkingManager.application(application, continue: userActivity`
      );
      config.modResults.contents = src;
    }
    return config;
  });

  // Expose RNBranch to Swift. Runs after the branch plugin's bridging-header mod;
  // appends outside its @generated block so it's preserved.
  config = withDangerousMod(config, [
    "ios",
    (config) => {
      const { projectName, platformProjectRoot } = config.modRequest;
      if (!projectName) return config;
      const header = path.join(
        platformProjectRoot,
        projectName,
        `${projectName}-Bridging-Header.h`
      );
      if (fs.existsSync(header)) {
        let src = fs.readFileSync(header, "utf8");
        if (!src.includes("<RNBranch/RNBranch.h>")) {
          src += "\n// withBranchInit: expose Branch to Swift\n#import <RNBranch/RNBranch.h>\n";
          fs.writeFileSync(header, src, "utf8");
        }
      }
      return config;
    },
  ]);

  return config;
};

module.exports = withBranchInit;
