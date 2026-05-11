const { getDefaultConfig } = require("expo/metro-config");
const { withCssInterop } = require("react-native-css-interop/metro");
const { cssToReactNativeRuntimeOptions } = require("react-native-css-interop/metro");
const path = require("path");
const fs = require("fs");

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(monorepoRoot, "node_modules"),
];

// Pre-generated CSS avoids NativeWind's fork()-based Tailwind CLI which hangs
// in EAS (child process IPC unreliable in the build sandbox). Regenerate by
// running: node -e "require('nativewind/dist/metro/tailwind').tailwindCli(()=>{}).getCSSForPlatform({platform:'ios',input:require('path').join(process.cwd(),'global.css'),browserslist:'last 1 version',browserslistEnv:'native'}).then(css=>require('fs').writeFileSync('.nativewind-output.css',css))"
const preGeneratedCss = fs.readFileSync(
  path.join(projectRoot, ".nativewind-output.css"),
  "utf-8"
);

module.exports = withCssInterop(config, {
  ...cssToReactNativeRuntimeOptions,
  input: path.join(projectRoot, "global.css"),
  getCSSForPlatform: () => Promise.resolve(preGeneratedCss),
});
