const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");
const path = require("path");

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(monorepoRoot, "node_modules"),
];

// Wrap getCSSForPlatform to detect if NativeWind's Tailwind child hangs in EAS
const wrapped = withNativeWind(config, { input: path.join(__dirname, "global.css") });
const originalGetTransformOptions = wrapped.transformer?.getTransformOptions;
if (originalGetTransformOptions) {
  wrapped.transformer.getTransformOptions = async function (entryPoints, transformOptions, getDepsOf) {
    console.log("[metro.config] getTransformOptions called for platform:", transformOptions.platform);
    const start = Date.now();
    const result = await Promise.race([
      originalGetTransformOptions(entryPoints, transformOptions, getDepsOf),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("getTransformOptions timed out after 60s")), 60000)
      ),
    ]);
    console.log("[metro.config] getTransformOptions done in", Date.now() - start, "ms");
    return result;
  };
}

module.exports = wrapped;
