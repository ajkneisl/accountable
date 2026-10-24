// Adds the ScreenTimeMonitor DeviceActivity extension that records screen time
// for the screen_time integration (see targets/ScreenTimeMonitor and
// modules/screen-time):
//   - the app and the extension get the Family Controls entitlement, and the
//     extension joins the App Group the two share;
//   - the extension's Swift is copied from targets/ScreenTimeMonitor into
//     ios/ScreenTimeMonitor next to a generated Info.plist and entitlements;
//   - the Xcode target is added with expo-widgets' own target helper, so it's
//     wired and embedded exactly like the widget extension.
//
// Family Controls works for development builds as is; TestFlight and the App
// Store need Apple to approve the distribution entitlement for both bundle IDs.

const fs = require("fs")
const path = require("path")
const {
    withDangerousMod,
    withEntitlementsPlist
} = require("expo/config-plugins")
const withTargetXcodeProject =
    require("expo-widgets/plugin/build/ios/xcode/withTargetXcodeProject").default

const TARGET = "ScreenTimeMonitor"
const SOURCE_DIR = path.join(__dirname, "..", "targets", TARGET)
const FAMILY_CONTROLS = "com.apple.developer.family-controls"
const APP_GROUPS = "com.apple.security.application-groups"

const INFO_PLIST = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>NSExtension</key>
    <dict>
        <key>NSExtensionPointIdentifier</key>
        <string>com.apple.deviceactivity.monitor-extension</string>
        <key>NSExtensionPrincipalClass</key>
        <string>$(PRODUCT_MODULE_NAME).${TARGET}</string>
    </dict>
</dict>
</plist>
`

const entitlements = (group) => `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>${FAMILY_CONTROLS}</key>
    <true/>
    <key>${APP_GROUPS}</key>
    <array>
        <string>${group}</string>
    </array>
</dict>
</plist>
`

const swiftSources = () =>
    fs.readdirSync(SOURCE_DIR).filter((file) => file.endsWith(".swift"))

module.exports = function withScreenTimeMonitor(config) {
    const bundleID = config.ios?.bundleIdentifier
    if (!bundleID)
        throw new Error(
            "withScreenTimeMonitor: ios.bundleIdentifier is required"
        )
    // The group expo-widgets falls back to, which the app already belongs to.
    const group = `group.${bundleID}`

    config = withEntitlementsPlist(config, (config) => {
        config.modResults[FAMILY_CONTROLS] = true
        return config
    })

    config = withDangerousMod(config, [
        "ios",
        (config) => {
            const dir = path.join(config.modRequest.platformProjectRoot, TARGET)
            fs.mkdirSync(dir, { recursive: true })
            for (const file of swiftSources())
                fs.copyFileSync(
                    path.join(SOURCE_DIR, file),
                    path.join(dir, file)
                )
            fs.writeFileSync(path.join(dir, "Info.plist"), INFO_PLIST)
            fs.writeFileSync(
                path.join(dir, `${TARGET}.entitlements`),
                entitlements(group)
            )
            return config
        }
    ])

    return withTargetXcodeProject(config, {
        targetName: TARGET,
        bundleIdentifier: `${bundleID}.${TARGET}`,
        deploymentTarget: config.ios?.deploymentTarget ?? "16.4",
        appleTeamId: config.ios?.appleTeamId,
        // Where the dangerous mod above copies them; modRequest isn't set yet here.
        getFileUris: () =>
            swiftSources().map((file) =>
                path.join(config._internal.projectRoot, "ios", TARGET, file)
            )
    })
}
