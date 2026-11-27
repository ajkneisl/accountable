#!/usr/bin/env bash
# Build a signed Android App Bundle (.aab) for the Play Store, locally.
#
#   npm run playstore                   # build with the versionCode in app.json
#   BUMP=1 npm run playstore            # bump versionCode by one first
#   VERSION_CODE=12 npm run playstore
#
# Signs with the upload key named in ~/.gradle/gradle.properties (see
# plugins/withReleaseSigning.js) and needs google-services.json in this folder.
# The bundle is copied to ~/Downloads; upload it in Play Console. A bumped
# versionCode is written back to app.json; commit it afterwards.

set -euo pipefail

cd "$(dirname "$0")/.."

API_URL=${EXPO_PUBLIC_API_URL:-https://beacc.app/api}
OUT_DIR=${OUT_DIR:-$HOME/Downloads}
LOG=$(mktemp -t accountable-playstore).log
trap 'echo "Logs: $LOG"' ERR

say() { printf '\n\033[1m==> %s\033[0m\n' "$*"; }

if [[ ! -f google-services.json ]]; then
    echo "google-services.json is missing: download it from the Firebase console into $(pwd)" >&2
    exit 1
fi
if ! grep -q '^BEACC_UPLOAD_STORE_FILE=' ~/.gradle/gradle.properties 2>/dev/null; then
    echo "No upload key in ~/.gradle/gradle.properties (BEACC_UPLOAD_STORE_FILE etc.)" >&2
    exit 1
fi

# --------------------------------------------------------------- version code

CURRENT=$(node -p 'require("./app.json").expo.android.versionCode ?? 1')
if [[ -n ${VERSION_CODE:-} ]]; then
    NEXT=$VERSION_CODE
elif [[ -n ${BUMP:-} ]]; then
    NEXT=$((CURRENT + 1))
else
    NEXT=$CURRENT
fi
if [[ $NEXT != "$CURRENT" ]]; then
    say "Version code $CURRENT → $NEXT"
    node -e '
        const fs = require("fs")
        const src = fs.readFileSync("app.json", "utf8")
        const out = src.replace(/("versionCode":\s*)\d+/, `$1${process.argv[1]}`)
        if (out === src) {
            console.error("app.json has no expo.android.versionCode to update")
            process.exit(1)
        }
        fs.writeFileSync("app.json", out)
    ' "$NEXT"
fi
VERSION=$(node -p 'require("./app.json").expo.version')

# ------------------------------------------------------------------- prebuild

say "Generating the native project"
CI=1 EXPO_NO_TELEMETRY=1 npx expo prebuild -p android --clean >"$LOG" 2>&1

if ! grep -q BEACC_UPLOAD_STORE_FILE android/app/build.gradle; then
    echo "android/app/build.gradle isn't set up for the upload key" >&2
    exit 1
fi

# ---------------------------------------------------------------------- build

say "Building the release bundle (API: $API_URL)"
(cd android && EXPO_PUBLIC_API_URL=$API_URL NODE_ENV=production ./gradlew bundleRelease) \
    >>"$LOG" 2>&1 || {
    grep -E "error|FAILURE|What went wrong" -A3 "$LOG" | head -30 >&2
    exit 1
}

AAB=android/app/build/outputs/bundle/release/app-release.aab

# Signed with the upload key, not the debug one.
# (grep -c, not -q: -q stops reading early, and pipefail counts the writer's
# broken pipe as a failure.)
if [[ $(keytool -printcert -jarfile "$AAB" 2>/dev/null | grep -c "CN=Beacc") == 0 ]]; then
    echo "The bundle isn't signed with the upload key" >&2
    exit 1
fi
if [[ $(unzip -p "$AAB" base/assets/index.android.bundle | grep -ac "$API_URL") == 0 ]]; then
    echo "The JS bundle doesn't contain $API_URL" >&2
    exit 1
fi

DEST="$OUT_DIR/beacc-$VERSION-$NEXT.aab"
cp "$AAB" "$DEST"
rm -f "$LOG"
say "Built $DEST"
echo "Upload it in Play Console → Test and release."
[[ $NEXT != "$CURRENT" ]] && echo "Commit the versionCode change in app.json."
exit 0
