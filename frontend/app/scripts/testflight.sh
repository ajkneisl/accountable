#!/usr/bin/env bash
# Build the iOS app and upload it to TestFlight.
#
#   npm run testflight              # bump buildNumber by one, then build and upload
#   BUILD_NUMBER=12 npm run testflight
#
# Signs and uploads through the Apple account signed in to Xcode
# (Settings → Accounts), so no App Store Connect API key is needed.
# The bumped buildNumber is written back to app.json; commit it afterwards.

set -euo pipefail

cd "$(dirname "$0")/.."

TEAM_ID=CBL6R6SP6A
API_URL=${EXPO_PUBLIC_API_URL:-https://beacc.app/api}

WORK=$(mktemp -d -t accountable-testflight)
ARCHIVE=$WORK/Beacc.xcarchive
LOG=$WORK/xcodebuild.log
trap 'echo "Logs: $LOG"' ERR

say() { printf '\n\033[1m==> %s\033[0m\n' "$*"; }

# ---------------------------------------------------------------- build number

CURRENT=$(node -p 'require("./app.json").expo.ios.buildNumber ?? "0"')
NEXT=${BUILD_NUMBER:-$((CURRENT + 1))}
say "Build number $CURRENT → $NEXT"
# Edit the one line in place so the rest of app.json keeps its formatting.
node -e '
    const fs = require("fs")
    const src = fs.readFileSync("app.json", "utf8")
    const out = src.replace(/("buildNumber":\s*)"[^"]*"/, `$1"${process.argv[1]}"`)
    if (out === src && !src.includes(`"buildNumber": "${process.argv[1]}"`)) {
        console.error("app.json has no expo.ios.buildNumber to update")
        process.exit(1)
    }
    fs.writeFileSync("app.json", out)
' "$NEXT"

# ------------------------------------------------------------------- prebuild

say "Generating the native project"
CI=1 EXPO_NO_TELEMETRY=1 npx expo prebuild -p ios --clean

BUILT=$(/usr/libexec/PlistBuddy -c "Print :CFBundleVersion" ios/Beacc/Info.plist)
if [[ $BUILT != "$NEXT" ]]; then
    echo "Info.plist has build $BUILT, expected $NEXT" >&2
    exit 1
fi

# -------------------------------------------------------------------- archive

say "Archiving (API: $API_URL)"
EXPO_PUBLIC_API_URL=$API_URL xcodebuild archive \
    -workspace ios/Beacc.xcworkspace \
    -scheme Beacc \
    -configuration Release \
    -destination "generic/platform=iOS" \
    -archivePath "$ARCHIVE" \
    -allowProvisioningUpdates \
    DEVELOPMENT_TEAM=$TEAM_ID \
    COMPILER_INDEX_STORE_ENABLE=NO \
    >"$LOG" 2>&1 || {
    grep -E "error:" "$LOG" | sort -u | head -20 >&2
    exit 1
}

if ! grep -aq "$API_URL" "$ARCHIVE/Products/Applications/Beacc.app/main.jsbundle"; then
    echo "The JS bundle doesn't contain $API_URL" >&2
    exit 1
fi

# --------------------------------------------------------------------- upload

cat >"$WORK/ExportOptions.plist" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>method</key>
    <string>app-store-connect</string>
    <key>destination</key>
    <string>upload</string>
    <key>teamID</key>
    <string>$TEAM_ID</string>
    <key>signingStyle</key>
    <string>automatic</string>
    <key>manageAppVersionAndBuildNumber</key>
    <false/>
    <key>uploadSymbols</key>
    <true/>
</dict>
</plist>
EOF

say "Uploading build $NEXT to App Store Connect"
xcodebuild -exportArchive \
    -archivePath "$ARCHIVE" \
    -exportOptionsPlist "$WORK/ExportOptions.plist" \
    -exportPath "$WORK/export" \
    -allowProvisioningUpdates \
    >>"$LOG" 2>&1 || {
    grep -iE "error" "$LOG" | sort -u | head -20 >&2
    exit 1
}

rm -rf "$WORK"
say "Uploaded build $NEXT"
echo "It shows up in TestFlight once Apple finishes processing (usually 5–15 minutes)."
echo "Commit the buildNumber change in app.json."
