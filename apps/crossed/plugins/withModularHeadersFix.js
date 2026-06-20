const { withDangerousMod } = require("@expo/config-plugins");
const path = require("path");
const fs = require("fs");

/**
 * Fixes the EAS iOS build failure:
 *   "include of non-modular header inside framework module 'RNFBApp...'
 *    React/RCTConvert.h [-Werror,-Wnon-modular-include-in-framework-module]"
 *
 * Root cause: RNFBApp's podspec sets DEFINES_MODULE = YES, so it builds as a
 * clang module; under `use_frameworks! :linkage => :static` it includes
 * non-modular React-Core headers, which is an error inside a framework module.
 *
 * Fix (two parts):
 *  1. Set `$RNFirebaseAsStaticFramework = true` — RN Firebase's official flag
 *     for static-framework setups; makes its pods build correctly as static
 *     frameworks and resolves the module/header conflict.
 *  2. Belt-and-suspenders: in post_install (AFTER react_native_post_install,
 *     which re-applies settings) turn the warning off and stop treating
 *     warnings as errors for every Pod target.
 */
const POST_INSTALL_SNIPPET = [
  "",
  "    # withModularHeadersFix: allow RN Firebase non-modular header includes",
  "    installer.pods_project.targets.each do |modular_fix_target|",
  "      modular_fix_target.build_configurations.each do |modular_fix_config|",
  "        modular_fix_config.build_settings['CLANG_WARN_NON_MODULAR_INCLUDE_IN_FRAMEWORK_MODULE'] = 'NO'",
  "        modular_fix_config.build_settings['CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES'] = 'YES'",
  "        modular_fix_config.build_settings['GCC_TREAT_WARNINGS_AS_ERRORS'] = 'NO'",
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
      let contents = fs.readFileSync(podfile, "utf8");

      // 1. RN Firebase static-framework global (top level, before targets).
      if (!contents.includes("RNFirebaseAsStaticFramework")) {
        contents = contents.replace(
          /require 'json'\n/,
          (m) => m + "\n$RNFirebaseAsStaticFramework = true\n"
        );
      }

      // 2. Warning suppression at the end of post_install.
      if (!contents.includes("withModularHeadersFix")) {
        const lines = contents.split("\n");
        const start = lines.findIndex((l) => l.includes("post_install do |installer|"));
        if (start !== -1) {
          let end = -1;
          for (let i = start + 1; i < lines.length; i++) {
            if (lines[i] === "  end") { end = i; break; }
          }
          if (end !== -1) {
            lines.splice(end, 0, POST_INSTALL_SNIPPET);
            contents = lines.join("\n");
          } else {
            console.warn("[withModularHeadersFix] post_install closing `end` not found");
          }
        } else {
          console.warn("[withModularHeadersFix] post_install hook not found");
        }
      }

      fs.writeFileSync(podfile, contents);
      return config;
    },
  ]);
};

module.exports = withModularHeadersFix;
