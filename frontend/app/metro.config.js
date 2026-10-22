const { getDefaultConfig } = require("expo/metro-config")
const { withNativeWind } = require("nativewind/metro")
const path = require("node:path")

const projectRoot = __dirname
const sharedRoot = path.resolve(projectRoot, "..", "shared")

const config = getDefaultConfig(projectRoot)

// The @shared sources live outside the project root, so Metro has to watch them.
config.watchFolders = [sharedRoot]

// Anything unresolved falls back to the app's own install, which is what pulls
// `react` for the @shared sources (see blockList below).
config.resolver.nodeModulesPaths = [path.resolve(projectRoot, "node_modules")]

// shared/ contributes source, not dependencies. Its node_modules holds a second
// copy of React (a devDependency there, for type-checking), and two React copies
// break hooks — the same hazard web/vite.config.ts handles with `dedupe`. Hiding
// the directory sends those imports to the app's copy instead.
//
// Hierarchical lookup stays ON: npm nests some of expo's own dependencies under
// node_modules/expo/node_modules, and disabling it makes them unresolvable.
config.resolver.blockList = [
    new RegExp(`^${path.join(sharedRoot, "node_modules").replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\${path.sep}.*$`)
]

config.resolver.extraNodeModules = {
    "@shared": path.resolve(sharedRoot, "src")
}

module.exports = withNativeWind(config, { input: "./global.css" })
