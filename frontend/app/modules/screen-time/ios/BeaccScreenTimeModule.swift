// Screen Time for the screen_time integration. iOS never hands an app a usage
// total, so this schedules an all-day DeviceActivity with an event every
// STEP_MINUTES of use (plus a few early ones, see THRESHOLDS) over the apps
// and categories the user picked. The ScreenTimeMonitor extension
// (targets/ScreenTimeMonitor) records the highest threshold each day reaches
// into the shared App Group, and readDays() hands those totals to JS to post
// to the backend.
//
// The App Group keys, activity name and event naming are shared with the
// extension; keep the two in step.

import DeviceActivity
import ExpoModulesCore
import FamilyControls
import SwiftUI

private let GROUP_ID = "group.app.umn.acc"
private let SELECTION_KEY = "screenTime.selection"
private let DAYS_KEY = "screenTime.days"
private let LAST_EVENT_KEY = "screenTime.lastEventAt"
private let VERSION_KEY = "screenTime.monitorVersion"
private let ACTIVITY = DeviceActivityName("beacc.screenTime")
private let EVENT_PREFIX = "minutes."

/**
 * Bump when the schedule or events change, so devices already monitoring
 * restart with the new ones (see ensureMonitoring).
 */
private let MONITOR_VERSION = 2

/** Threshold step, so recorded totals are accurate to this many minutes. */
private let STEP_MINUTES = 15

/**
 * Every threshold, in minutes: a few early ones so a day's first use shows up
 * (and proves the extension runs) within minutes, then every [STEP_MINUTES].
 */
private let THRESHOLDS =
  [1, 5, 10] + Array(stride(from: STEP_MINUTES, to: 24 * 60, by: STEP_MINUTES))

private var shared: UserDefaults? { UserDefaults(suiteName: GROUP_ID) }

private func loadSelection() -> FamilyActivitySelection? {
  guard let data = shared?.data(forKey: SELECTION_KEY) else { return nil }
  return try? PropertyListDecoder().decode(FamilyActivitySelection.self, from: data)
}

private func saveSelection(_ selection: FamilyActivitySelection) {
  shared?.set(try? PropertyListEncoder().encode(selection), forKey: SELECTION_KEY)
}

private func isEmpty(_ selection: FamilyActivitySelection) -> Bool {
  selection.applicationTokens.isEmpty && selection.categoryTokens.isEmpty
    && selection.webDomainTokens.isEmpty
}

/** Local "yyyy-MM-dd", matching the extension's day keys. */
private func dayKey(_ date: Date) -> String {
  let formatter = DateFormatter()
  formatter.calendar = Calendar(identifier: .gregorian)
  formatter.locale = Locale(identifier: "en_US_POSIX")
  formatter.timeZone = .current
  formatter.dateFormat = "yyyy-MM-dd"
  return formatter.string(from: date)
}

/** Start the daily activity over the saved selection, replacing any running one. */
private func startMonitoring() throws {
  guard let selection = loadSelection(), !isEmpty(selection) else {
    throw Exception(name: "E_NO_SELECTION", description: "Pick apps to track first")
  }
  var events: [DeviceActivityEvent.Name: DeviceActivityEvent] = [:]
  for minutes in THRESHOLDS {
    events[DeviceActivityEvent.Name("\(EVENT_PREFIX)\(minutes)")] = DeviceActivityEvent(
      applications: selection.applicationTokens,
      categories: selection.categoryTokens,
      webDomains: selection.webDomainTokens,
      threshold: DateComponents(hour: minutes / 60, minute: minutes % 60)
    )
  }
  let schedule = DeviceActivitySchedule(
    intervalStart: DateComponents(hour: 0, minute: 0),
    intervalEnd: DateComponents(hour: 23, minute: 59),
    repeats: true
  )
  let center = DeviceActivityCenter()
  center.stopMonitoring([ACTIVITY])
  try center.startMonitoring(ACTIVITY, during: schedule, events: events)
  shared?.set(MONITOR_VERSION, forKey: VERSION_KEY)

  // iOS only calls intervalDidStart at the next midnight, so give today a
  // total now; the extension raises it as thresholds are crossed.
  var days = shared?.dictionary(forKey: DAYS_KEY) as? [String: Int] ?? [:]
  let today = dayKey(Date())
  days[today] = days[today] ?? 0
  shared?.set(days, forKey: DAYS_KEY)
}

public class BeaccScreenTimeModule: Module {
  public func definition() -> ModuleDefinition {
    Name("BeaccScreenTime")

    Function("authorizationStatus") { () -> String in
      switch AuthorizationCenter.shared.authorizationStatus {
      case .approved: return "approved"
      case .denied: return "denied"
      default: return "notDetermined"
      }
    }

    /** Show the Screen Time permission prompt (Face ID / passcode). Throws if declined. */
    AsyncFunction("requestAuthorization") {
      try await AuthorizationCenter.shared.requestAuthorization(for: .individual)
    }

    Function("hasSelection") { () -> Bool in
      loadSelection().map { !isEmpty($0) } ?? false
    }

    /** Present the app/category picker. Resolves true once a non-empty choice is saved. */
    AsyncFunction("pickActivities") { (promise: Promise) in
      guard let presenter = self.appContext?.utilities?.currentViewController() else {
        promise.reject("E_NO_VIEW", "Nothing to show the picker from")
        return
      }
      var host: UIViewController?
      let picker = ActivityPicker(initial: loadSelection() ?? FamilyActivitySelection()) {
        selection in
        host?.dismiss(animated: true)
        if let selection { saveSelection(selection) }
        promise.resolve(selection != nil)
      }
      let controller = UIHostingController(rootView: picker)
      // A swipe-down would leave the promise hanging; Cancel and Done are the only ways out.
      controller.isModalInPresentation = true
      host = controller
      presenter.present(controller, animated: true)
    }.runOnQueue(.main)

    /** (Re)start the daily activity over the saved selection. */
    Function("startMonitoring") {
      try startMonitoring()
    }

    /**
     * Restart monitoring if it was started by an older build with different
     * events. A plain restart can undercount the day, so it's only done then.
     */
    Function("ensureMonitoring") {
      if shared?.integer(forKey: VERSION_KEY) != MONITOR_VERSION { try startMonitoring() }
    }

    Function("isMonitoring") { () -> Bool in
      DeviceActivityCenter().activities.contains(ACTIVITY)
    }

    Function("stopMonitoring") {
      DeviceActivityCenter().stopMonitoring([ACTIVITY])
    }

    /** Every recorded day as { date: "yyyy-MM-dd" (local), minutes }. */
    Function("readDays") { () -> [[String: Any]] in
      let days = shared?.dictionary(forKey: DAYS_KEY) as? [String: Int] ?? [:]
      return days.map { ["date": $0.key, "minutes": $0.value] }
    }

    /** Ms epoch the extension last recorded anything, or nil if it never has. */
    Function("lastEventAt") { () -> Double? in
      (shared?.object(forKey: LAST_EVENT_KEY) as? NSNumber)?.doubleValue
    }

    /** Forget the selection and recorded days, e.g. on sign-out. */
    Function("clear") {
      DeviceActivityCenter().stopMonitoring([ACTIVITY])
      shared?.removeObject(forKey: SELECTION_KEY)
      shared?.removeObject(forKey: DAYS_KEY)
      shared?.removeObject(forKey: LAST_EVENT_KEY)
      shared?.removeObject(forKey: VERSION_KEY)
    }
  }
}

/** The system app/category picker with Cancel and Done; nil on cancel. */
private struct ActivityPicker: View {
  @State private var selection: FamilyActivitySelection
  let onDone: (FamilyActivitySelection?) -> Void

  init(initial: FamilyActivitySelection, onDone: @escaping (FamilyActivitySelection?) -> Void) {
    _selection = State(initialValue: initial)
    self.onDone = onDone
  }

  var body: some View {
    NavigationView {
      FamilyActivityPicker(
        headerText: "Select every category so all of your screen time counts.",
        selection: $selection
      )
      .navigationTitle("Screen Time")
      .navigationBarTitleDisplayMode(.inline)
      .toolbar {
        ToolbarItem(placement: .cancellationAction) {
          Button("Cancel") { onDone(nil) }
        }
        ToolbarItem(placement: .confirmationAction) {
          Button("Done") { onDone(selection) }.disabled(isEmpty(selection))
        }
      }
    }
  }
}
