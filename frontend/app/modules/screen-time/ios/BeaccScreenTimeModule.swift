// Screen Time for the screen_time integration. iOS never hands an app a usage
// total, so this schedules an all-day DeviceActivity with an event every
// STEP_MINUTES of use over the apps and categories the user picked. The
// ScreenTimeMonitor extension (targets/ScreenTimeMonitor) records the highest
// threshold each day reaches into the shared App Group, and readDays() hands
// those totals to JS to post to the backend.
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
private let ACTIVITY = DeviceActivityName("beacc.screenTime")
private let EVENT_PREFIX = "minutes."

/** Threshold step, so recorded totals are accurate to this many minutes. */
private let STEP_MINUTES = 15

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
      guard let selection = loadSelection(), !isEmpty(selection) else {
        throw Exception(name: "E_NO_SELECTION", description: "Pick apps to track first")
      }
      var events: [DeviceActivityEvent.Name: DeviceActivityEvent] = [:]
      for minutes in stride(from: STEP_MINUTES, to: 24 * 60, by: STEP_MINUTES) {
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

    /** Forget the selection and recorded days, e.g. on sign-out. */
    Function("clear") {
      DeviceActivityCenter().stopMonitoring([ACTIVITY])
      shared?.removeObject(forKey: SELECTION_KEY)
      shared?.removeObject(forKey: DAYS_KEY)
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
