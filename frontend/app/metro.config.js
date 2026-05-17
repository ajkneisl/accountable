const { getDefaultConfig } = require("expo/metro-config")
const { withNativeWind } = require("nativewind/metro")
const path = require("node:path")

const projectRoot = __dirname
const sharedRoot = path.resolve(projectRoot, "..", "shared")

const config = getDefaultConfig(projectRoot)

config.watchFolders = [sharedRoot]

config.resolver.nodeModulesPaths = [path.resolve(projectRoot, "node_modules")]

config.resolver.disableHierarchicalLookup = true

config.resolver.extraNodeModules = {
    "@shared": path.resolve(sharedRoot, "src")
}

module.exports = withNativeWind(config, { input: "./global.css" })
