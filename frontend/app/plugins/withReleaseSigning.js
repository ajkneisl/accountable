// Signs Android release builds with the Play Store upload key. The key and its
// passwords stay out of the repo: they're read from Gradle properties
// (~/.gradle/gradle.properties) when present:
//
//   BEACC_UPLOAD_STORE_FILE=/path/to/beacc-upload.jks
//   BEACC_UPLOAD_KEY_ALIAS=beacc-upload
//   BEACC_UPLOAD_STORE_PASSWORD=…
//   BEACC_UPLOAD_KEY_PASSWORD=…
//
// Without them, release builds fall back to the debug key, as the template
// does, so `expo run:android --variant release` still works anywhere.

const { withAppBuildGradle } = require("expo/config-plugins")

const HAS_KEY = "project.hasProperty('BEACC_UPLOAD_STORE_FILE')"

const RELEASE_CONFIG = `signingConfigs {
        release {
            if (${HAS_KEY}) {
                storeFile file(BEACC_UPLOAD_STORE_FILE)
                storePassword BEACC_UPLOAD_STORE_PASSWORD
                keyAlias BEACC_UPLOAD_KEY_ALIAS
                keyPassword BEACC_UPLOAD_KEY_PASSWORD
            }
        }`

module.exports = function withReleaseSigning(config) {
    return withAppBuildGradle(config, (config) => {
        let gradle = config.modResults.contents
        if (gradle.includes("BEACC_UPLOAD_STORE_FILE")) return config

        if (!/signingConfigs \{/.test(gradle)) {
            throw new Error("withReleaseSigning: no signingConfigs block in app/build.gradle")
        }
        gradle = gradle.replace(/signingConfigs \{/, RELEASE_CONFIG)

        // The release build type is the one after `buildTypes {` … `release {`.
        const releaseType = /(buildTypes \{[\s\S]*?release \{[\s\S]*?)signingConfig signingConfigs\.debug/
        if (!releaseType.test(gradle)) {
            throw new Error("withReleaseSigning: no release signingConfig in app/build.gradle")
        }
        gradle = gradle.replace(
            releaseType,
            `$1signingConfig ${HAS_KEY} ? signingConfigs.release : signingConfigs.debug`
        )

        config.modResults.contents = gradle
        return config
    })
}
