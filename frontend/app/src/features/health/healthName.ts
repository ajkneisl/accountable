// What the phone's health source is called: the app people actually granted
// access to. Behind it, both feed the same integrations (see appleHealth.android.ts).

import { Platform } from "react-native"

export const HEALTH_SOURCE =
    Platform.OS === "android" ? "Health Connect" : "Apple Health"

/** Heading for the sources read from this device. */
export const THIS_PHONE =
    Platform.OS === "android" ? "This phone" : "This iPhone"
