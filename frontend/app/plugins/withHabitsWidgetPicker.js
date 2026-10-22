// Lets each HabitsHeatmap widget pick which habits it shows (Edit Widget).
//
// expo-widgets only generates static configuration parameters (string, number,
// boolean, fixed enum), and a habit list is per user. So app.json declares a
// placeholder `habits` string parameter — which makes expo-widgets generate the
// AppIntentConfiguration plumbing — and this rewrites it into an array of habit
// entities, sized per family, whose options are the habits the app last synced
// into the widget's timeline. The layout receives the picked IDs as
// `env.configuration.habits`.
//
// Mods run last-registered first, so this must be listed *before* expo-widgets
// in app.json to run after it has generated the Swift.

const fs = require("fs")
const path = require("path")
const { withDangerousMod } = require("expo/config-plugins")

const WIDGET = "HabitsHeatmap"
const TARGET = "ExpoWidgetsTarget"

// expo-widgets only marks the Widget itself iOS 17+, but a family-sized array
// parameter is iOS 17 API, so everything built on the intent needs it too.
const INTENT_TYPES = [
    "ConfigurationAppIntent: WidgetConfigurationIntent",
    "TimelineEntry: TimelineEntry",
    "TimelineProvider: AppIntentTimelineProvider",
    "EntryView: View"
]

const ENTITY = `
// A habit the widget can be pointed at. The options come from the habits the app
// last synced into the widget's timeline, so the extension never needs the API.
struct ${WIDGET}HabitEntity: AppEntity {
  static let typeDisplayRepresentation: TypeDisplayRepresentation = "Habit"
  static let defaultQuery = ${WIDGET}HabitQuery()

  let id: String
  let name: String

  var displayRepresentation: DisplayRepresentation {
    DisplayRepresentation(title: "\\(name)")
  }
}

struct ${WIDGET}HabitQuery: EntityQuery {
  func entities(for identifiers: [String]) async throws -> [${WIDGET}HabitEntity] {
    let habits = Self.synced()
    return identifiers.compactMap { id in habits.first { $0.id == id } }
  }

  func suggestedEntities() async throws -> [${WIDGET}HabitEntity] {
    Self.synced()
  }

  /// Every timeline entry carries the full habit list; the first is enough.
  static func synced() -> [${WIDGET}HabitEntity] {
    guard let entry = WidgetsStorage.getArray(forKey: "__expo_widgets_${WIDGET}_timeline")?.first as? [String: Any],
          let props = entry["props"] as? [String: Any],
          let habits = props["habits"] as? [[String: Any]] else {
      return []
    }
    return habits.compactMap { habit in
      guard let id = habit["id"] as? String, let name = habit["name"] as? String else { return nil }
      return ${WIDGET}HabitEntity(id: id, name: name)
    }
  }
}
`

/** Replace the single occurrence of [find] in the generated widget. */
function replaceOnce(src, find, replace) {
    if (src.split(find).length !== 2) {
        throw new Error(
            `withHabitsWidgetPicker: expected exactly one match in ${WIDGET}.swift for:\n${find}`
        )
    }
    return src.replace(find, replace)
}

module.exports = function withHabitsWidgetPicker(config) {
    return withDangerousMod(config, [
        "ios",
        async (cfg) => {
            const file = path.join(
                cfg.modRequest.platformProjectRoot,
                TARGET,
                `${WIDGET}.swift`
            )
            let src = fs.readFileSync(file, "utf8")

            src = replaceOnce(
                src,
                `  @Parameter(title: "Habits", default: "")\n  var habits: String`,
                `  @Parameter(title: "Habits", size: [.systemSmall: 1, .systemMedium: 2, .systemLarge: 4])\n  var habits: [${WIDGET}HabitEntity]?`
            )
            src = replaceOnce(
                src,
                `"habits": entry.configuration.habits\n`,
                `"habits": (entry.configuration.habits ?? []).map(\\.id)\n`
            )
            src = replaceOnce(
                src,
                `\nstruct ${WIDGET}TimelineEntry: TimelineEntry {`,
                `${ENTITY}\nstruct ${WIDGET}TimelineEntry: TimelineEntry {`
            )

            for (const type of INTENT_TYPES) {
                src = replaceOnce(
                    src,
                    `\nstruct ${WIDGET}${type} {`,
                    `\n@available(iOS 17.0, *)\nstruct ${WIDGET}${type} {`
                )
            }

            fs.writeFileSync(file, src)
            return cfg
        }
    ])
}
