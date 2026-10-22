// Lets each CompetitionStandings widget pick which competition it shows (Edit
// Widget).
//
// expo-widgets only generates static configuration parameters (string, number,
// boolean, fixed enum), and a competition list is per user. So app.json declares
// a placeholder `competition` string parameter — which makes expo-widgets
// generate the AppIntentConfiguration plumbing — and this rewrites it into a
// competition entity whose options are the competitions the app last synced into
// the widget's timeline. The layout receives the picked ID (or "") as
// `env.configuration.competition`.
//
// Mods run last-registered first, so this must be listed *before* expo-widgets
// in app.json to run after it has generated the Swift.

const fs = require("fs")
const path = require("path")
const { withDangerousMod } = require("expo/config-plugins")

const WIDGET = "CompetitionStandings"
const TARGET = "ExpoWidgetsTarget"

const ENTITY = `
// A competition the widget can be pointed at. The options come from the
// competitions the app last synced into the widget's timeline, so the extension
// never needs the API.
struct ${WIDGET}CompetitionEntity: AppEntity {
  static let typeDisplayRepresentation: TypeDisplayRepresentation = "Competition"
  static let defaultQuery = ${WIDGET}CompetitionQuery()

  let id: String
  let name: String

  var displayRepresentation: DisplayRepresentation {
    DisplayRepresentation(title: "\\(name)")
  }
}

struct ${WIDGET}CompetitionQuery: EntityQuery {
  func entities(for identifiers: [String]) async throws -> [${WIDGET}CompetitionEntity] {
    let competitions = Self.synced()
    return identifiers.compactMap { id in competitions.first { $0.id == id } }
  }

  func suggestedEntities() async throws -> [${WIDGET}CompetitionEntity] {
    Self.synced()
  }

  /// Every timeline entry carries the full competition list; the first is enough.
  static func synced() -> [${WIDGET}CompetitionEntity] {
    guard let entry = WidgetsStorage.getArray(forKey: "__expo_widgets_${WIDGET}_timeline")?.first as? [String: Any],
          let props = entry["props"] as? [String: Any],
          let competitions = props["competitions"] as? [[String: Any]] else {
      return []
    }
    return competitions.compactMap { competition in
      guard let id = competition["id"] as? String, let name = competition["name"] as? String else { return nil }
      return ${WIDGET}CompetitionEntity(id: id, name: name)
    }
  }
}
`

/** Replace the single occurrence of [find] in the generated widget. */
function replaceOnce(src, find, replace) {
    if (src.split(find).length !== 2) {
        throw new Error(
            `withCompetitionsWidgetPicker: expected exactly one match in ${WIDGET}.swift for:\n${find}`
        )
    }
    return src.replace(find, replace)
}

module.exports = function withCompetitionsWidgetPicker(config) {
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
                `  @Parameter(title: "Competition", default: "")\n  var competition: String`,
                `  @Parameter(title: "Competition")\n  var competition: ${WIDGET}CompetitionEntity?`
            )
            src = replaceOnce(
                src,
                `"competition": entry.configuration.competition\n`,
                `"competition": entry.configuration.competition?.id ?? ""\n`
            )
            src = replaceOnce(
                src,
                `\nstruct ${WIDGET}TimelineEntry: TimelineEntry {`,
                `${ENTITY}\nstruct ${WIDGET}TimelineEntry: TimelineEntry {`
            )

            fs.writeFileSync(file, src)
            return cfg
        }
    ])
}
