const { withDangerousMod } = require("@expo/config-plugins");
const path = require("path");
const fs = require("fs");

/**
 * Copies PrivacyInfo.xcprivacy into the iOS app target directory.
 * Required for App Store submission since May 2024.
 * The file is picked up by Xcode's bundle phase because it sits
 * alongside the app's other resources inside the named target folder.
 */
const withPrivacyManifest = (config) => {
  return withDangerousMod(config, [
    "ios",
    (config) => {
      const projectRoot = config.modRequest.projectRoot;
      const platformProjectRoot = config.modRequest.platformProjectRoot;
      const projectName = config.modRequest.projectName;

      const sourceFile = path.join(projectRoot, "PrivacyInfo.xcprivacy");
      if (!fs.existsSync(sourceFile)) {
        console.warn(
          "[withPrivacyManifest] PrivacyInfo.xcprivacy not found at",
          sourceFile
        );
        return config;
      }

      const destDir = path.join(platformProjectRoot, projectName);
      fs.mkdirSync(destDir, { recursive: true });
      fs.copyFileSync(sourceFile, path.join(destDir, "PrivacyInfo.xcprivacy"));

      return config;
    },
  ]);
};

module.exports = withPrivacyManifest;
