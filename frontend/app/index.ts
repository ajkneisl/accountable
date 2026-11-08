// App entry. Expo Router only evaluates src/app/_layout when a screen renders,
// and a background launch has no screen, so the background sync task is defined
// here for iOS to find it (see plugins/withSceneLifecycle).

import "expo-router/entry"
import "./src/features/integration/backgroundSync"
