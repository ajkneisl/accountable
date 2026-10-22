// Adopts the UIScene life cycle on iOS. iOS 27 kills apps built with its SDK at
// launch unless they use scenes, and the SDK 57 project template still creates
// the window in the app delegate.
//
// Expo ships the scene delegate (ExpoAppSceneDelegate); this wires it up:
//   - Info.plist gets a scene manifest pointing at it.
//   - AppDelegate conforms to ExpoReactNativeFactoryProvider so the scene
//     delegate can reach the React Native factory, and stops creating its own
//     window, since the scene delegate now does that.

const { withAppDelegate, withInfoPlist } = require("expo/config-plugins")

const WINDOW_SETUP = `#if os(iOS) || os(tvOS)
    window = UIWindow(frame: UIScreen.main.bounds)
    factory.startReactNative(
      withModuleName: "main",
      in: window,
      launchOptions: launchOptions)
#endif
`

/** Replace the single occurrence of [find]; no-op if [applied] shows it already ran. */
function replaceOnce(src, find, replace, applied) {
    if (applied(src)) return src
    if (src.split(find).length !== 2) {
        throw new Error(
            `withSceneLifecycle: expected exactly one match in AppDelegate.swift for:\n${find}`
        )
    }
    return src.replace(find, replace)
}

module.exports = function withSceneLifecycle(config) {
    config = withInfoPlist(config, (cfg) => {
        cfg.modResults.UIApplicationSceneManifest = {
            UIApplicationSupportsMultipleScenes: false,
            UISceneConfigurations: {
                UIWindowSceneSessionRoleApplication: [
                    {
                        UISceneConfigurationName: "Default Configuration",
                        UISceneDelegateClassName: "EXExpoAppSceneDelegate"
                    }
                ]
            }
        }
        return cfg
    })

    config = withAppDelegate(config, (cfg) => {
        if (cfg.modResults.language !== "swift") {
            throw new Error("withSceneLifecycle only supports a Swift AppDelegate")
        }
        let src = cfg.modResults.contents
        src = replaceOnce(
            src,
            "class AppDelegate: ExpoAppDelegate {",
            "class AppDelegate: ExpoAppDelegate, ExpoReactNativeFactoryProvider {",
            (s) => s.includes("ExpoReactNativeFactoryProvider")
        )
        src = replaceOnce(
            src,
            WINDOW_SETUP,
            "",
            (s) => !s.includes("window = UIWindow(frame: UIScreen.main.bounds)")
        )
        cfg.modResults.contents = src
        return cfg
    })

    return config
}
