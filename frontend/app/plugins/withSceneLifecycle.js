// Adopts the UIScene life cycle on iOS. iOS 27 kills apps built with its SDK at
// launch unless they use scenes, and the SDK 57 project template still creates
// the window in the app delegate.
//
// Expo ships the scene delegate (ExpoAppSceneDelegate); this wires it up:
//   - Info.plist gets a scene manifest pointing at it.
//   - AppDelegate conforms to ExpoReactNativeFactoryProvider so the scene
//     delegate can reach the React Native factory, and stops creating its own
//     window, since the scene delegate now does that.
//   - AppDelegate starts React Native itself when no scene connects. The scene
//     delegate is what normally starts it, and a background launch (BGTask,
//     HealthKit) may have no scene, which would leave background tasks queued
//     for JS that never loads.

const { withAppDelegate, withInfoPlist } = require("expo/config-plugins")

const WINDOW_SETUP = `#if os(iOS) || os(tvOS)
    window = UIWindow(frame: UIScreen.main.bounds)
    factory.startReactNative(
      withModuleName: "main",
      in: window,
      launchOptions: launchOptions)
#endif
`

const LAUNCH_RETURN = `    return super.application(application, didFinishLaunchingWithOptions: launchOptions)
  }
`

const BACKGROUND_LAUNCH = `    let launched = super.application(application, didFinishLaunchingWithOptions: launchOptions)
    startReactNativeIfNoSceneConnects()
    return launched
  }

  /**
   * A foreground launch connects its scene right after launching. Without one
   * this is a background launch, so load JS with no surface for the waiting
   * background tasks. A scene connecting later adds its surface to this host.
   */
  private func startReactNativeIfNoSceneConnects() {
    DispatchQueue.main.asyncAfter(deadline: .now() + 1) { [weak self] in
      guard UIApplication.shared.connectedScenes.isEmpty,
        let factory = self?.reactNativeFactory
      else { return }
      factory.rootViewFactory.initializeReactHost(
        launchOptions: nil,
        bundleConfiguration: factory.bundleConfiguration,
        devMenuConfiguration: factory.devMenuConfiguration ?? RCTDevMenuConfiguration.default()
      )
    }
  }
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
        src = replaceOnce(src, LAUNCH_RETURN, BACKGROUND_LAUNCH, (s) =>
            s.includes("startReactNativeIfNoSceneConnects")
        )
        cfg.modResults.contents = src
        return cfg
    })

    return config
}
