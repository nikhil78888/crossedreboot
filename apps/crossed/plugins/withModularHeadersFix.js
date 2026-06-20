const { withDangerousMod } = require("@expo/config-plugins");
const path = require("path");
const fs = require("fs");

/**
 * Fixes the EAS build failure:
 *   "include of non-modular header inside framework module 'RNFBApp...'
 *    React/RCTConvert.h [-Werror,-Wnon-modular-include-in-framework-module]"
 *
 * React Native Firebase requires `use_frameworks! :linkage => :static`
 * (we set useFrameworks: "static" in expo-build-properties). Under static
 * frameworks, RNFirebase's Objective-C headers include non-modular
 * React-Core headers and clang promotes that warning to an error.
 *
 * Fix: turn that warning off for every Pod target. The override MUST run
 * AFTER `react_native_post_install(...)`, which re-applies build settings and
 * would otherwise wipe ours — so we insert it right before the post_install
 * block's closing `end` (line-based, resilient to template arg changes).
 */
const SNIPPET = [
  "",
  "    # withModularHeadersFix: allow RN Firebase non-modular header includes",
  "    installer.pods_project.build_configurations.each do |modular_fix_proj_config|",
  "      modular_fix_proj_config.build_settings['CLANG_WARN_NON_MODULAR_INCLUDE_IN_FRAMEWORK_MODULE'] = 'NO'",
  "    end",
  "    installer.pods_project.targets.each do |modular_fix_target|",
  "      modular_fix_target.build_configurations.each do |modular_fix_config|",
  "        modular_fix_config.build_settings['CLANG_WARN_NON_MODULAR_INCLUDE_IN_FRAMEWORK_MODULE'] = 'NO'",
  "      end",
  "    end",
].join("\n");

const withModularHeadersFix = (config) => {
  return withDangerousMod(config, [
    "ios",
    (config) => {
      const podfile = path.join(config.modRequest.platformProjectRoot, "Podfile");
      if (!fs.existsSync(podfile)) {
        console.warn("[withModularHeadersFix] Podfile not found at", podfile);
        return config;
      }
      const lines = fs.readFileSync(podfile, "utf8").split("\n");
      const start = lines.findIndex((l) => l.includes("post_install do |installer|"));
      if (start === -1) {
        console.warn("[withModularHeadersFix] post_install hook not found; skipping");
        return config;
      }
      // First line at the post_install indentation (2 spaces) that is exactly
      // `  end` closes the block. Insert our override just before it.
      let end = -1;
      for (let i = start + 1; i < lines.length; i++) {
        if (lines[i] === "  end") { end = i; break; }
      }
      if (end === -1) {
        console.warn("[withModularHeadersFix] post_install closing `end` not found; skipping");
        return config;
      }
      lines.splice(end, 0, SNIPPET);
      fs.writeFileSync(podfile, lines.join("\n"));
      return config;
    },
  ]);
};

module.exports = withModularHeadersFix;
