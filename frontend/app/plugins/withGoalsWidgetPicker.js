// Lets each GoalsProgress widget pick which goals it shows (Edit Widget).
//
// expo-widgets only generates static configuration parameters (string, number,
// boolean, fixed enum), and a goal list is per user. So app.json declares a
// placeholder `goals` string parameter — which makes expo-widgets generate the
// AppIntentConfiguration plumbing — and this rewrites it into an array of goal
// entities, sized per family, whose options are the goals the app last synced
// into the widget's timeline. The layout receives the picked IDs as
// `env.configuration.goals`.
//
// Mods run last-registered first, so this must be listed *before* expo-widgets
// in app.json to run after it has generated the Swift.

const fs = require("fs")
const path = require("path")
const { withDangerousMod } = require("expo/config-plugins")

const WIDGET = "GoalsProgress"
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
// A goal the widget can be pointed at. The options come from the goals the app
// last synced into the widget's timeline, so the extension never needs the API.
struct ${WIDGET}GoalEntity: AppEntity {
  static let typeDisplayRepresentation: TypeDisplayRepresentation = "Goal"
  static let defaultQuery = ${WIDGET}GoalQuery()

  let id: String
  let name: String

  var displayRepresentation: DisplayRepresentation {
    DisplayRepresentation(title: "\\(name)")
  }
}

struct ${WIDGET}GoalQuery: EntityQuery {
  func entities(for identifiers: [String]) async throws -> [${WIDGET}GoalEntity] {
    let goals = Self.synced()
    return identifiers.compactMap { id in goals.first { $0.id == id } }
  }

  func suggestedEntities() async throws -> [${WIDGET}GoalEntity] {
    Self.synced()
  }

  /// Every timeline entry carries the full goal list; the first is enough.
  static func synced() -> [${WIDGET}GoalEntity] {
    guard let entry = WidgetsStorage.getArray(forKey: "__expo_widgets_${WIDGET}_timeline")?.first as? [String: Any],
          let props = entry["props"] as? [String: Any],
          let goals = props["goals"] as? [[String: Any]] else {
      return []
    }
    return goals.compactMap { goal in
      guard let id = goal["id"] as? String, let name = goal["name"] as? String else { return nil }
      return ${WIDGET}GoalEntity(id: id, name: name)
    }
  }
}
`

/** Replace the single occurrence of [find] in the generated widget. */
function replaceOnce(src, find, replace) {
    if (src.split(find).length !== 2) {
        throw new Error(
            `withGoalsWidgetPicker: expected exactly one match in ${WIDGET}.swift for:\n${find}`
        )
    }
    return src.replace(find, replace)
}

module.exports = function withGoalsWidgetPicker(config) {
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
                `  @Parameter(title: "Goals", default: "")\n  var goals: String`,
                `  @Parameter(title: "Goals", size: [.systemSmall: 1, .systemMedium: 2, .systemLarge: 4])\n  var goals: [${WIDGET}GoalEntity]?`
            )
            src = replaceOnce(
                src,
                `"goals": entry.configuration.goals\n`,
                `"goals": (entry.configuration.goals ?? []).map(\\.id)\n`
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
