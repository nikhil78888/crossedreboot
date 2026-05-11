const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");
const path = require("path");

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

// Watch only the specific workspace packages the app uses (not the full monorepo root,
// which would cause Metro to scan all nested node_modules and time out on EAS).
config.watchFolders = [
  path.resolve(projectRoot, "../../packages/types-and-validators"),
];

// Resolve packages from the app first, then monorepo root
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(monorepoRoot, "node_modules"),
];

// Prefer TypeScript source over missing dist/ builds in workspace packages
config.resolver.resolverMainFields = [
  "react-native",
  "browser",
  "source",
  "main",
  "module",
];

module.exports = withNativeWind(config, { input: "./global.css" });
