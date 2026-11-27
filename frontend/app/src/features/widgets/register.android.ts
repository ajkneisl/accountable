// Registered at app entry (index.ts) so Android can draw a widget with no
// screen open: it starts the JS runtime headless and calls the handler.

import { registerWidgetTaskHandler } from "react-native-android-widget"
import { widgetTaskHandler } from "./render.android"

registerWidgetTaskHandler(widgetTaskHandler)
