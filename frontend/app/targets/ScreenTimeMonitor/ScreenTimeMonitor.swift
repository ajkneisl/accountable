// DeviceActivity monitor extension for the screen_time integration. The app
// (modules/screen-time) schedules one all-day activity with an event every few
// minutes of use, named "minutes.<threshold>". iOS wakes this extension as each
// is crossed, and it keeps the highest threshold per local day in the shared
// App Group, where the app reads it back and posts it to the backend.
//
// The App Group keys and event naming are shared with BeaccScreenTimeModule;
// keep the two in step.

import DeviceActivity
import Foundation

private let GROUP_ID = "group.app.umn.acc"
private let DAYS_KEY = "screenTime.days"
private let EVENT_PREFIX = "minutes."

/** Days older than this are dropped; the app syncs far more often. */
private let KEEP_DAYS = 60

class ScreenTimeMonitor: DeviceActivityMonitor {
  /** A new day began while monitoring, so it has a total even if nothing is used. */
  override func intervalDidStart(for activity: DeviceActivityName) {
    super.intervalDidStart(for: activity)
    record(minutes: 0)
  }

  override func eventDidReachThreshold(
    _ event: DeviceActivityEvent.Name,
    activity: DeviceActivityName
  ) {
    super.eventDidReachThreshold(event, activity: activity)
    guard event.rawValue.hasPrefix(EVENT_PREFIX),
      let minutes = Int(event.rawValue.dropFirst(EVENT_PREFIX.count))
    else { return }
    record(minutes: minutes)
  }

  /** Raise today's total to [minutes]; thresholds only ever grow within a day. */
  private func record(minutes: Int) {
    guard let defaults = UserDefaults(suiteName: GROUP_ID) else { return }
    let now = Date()
    let today = dayKey(now)
    let oldest = dayKey(now.addingTimeInterval(-Double(KEEP_DAYS) * 86_400))
    var days = defaults.dictionary(forKey: DAYS_KEY) as? [String: Int] ?? [:]
    days[today] = max(days[today] ?? 0, minutes)
    defaults.set(days.filter { $0.key >= oldest }, forKey: DAYS_KEY)
  }

  private func dayKey(_ date: Date) -> String {
    let formatter = DateFormatter()
    formatter.calendar = Calendar(identifier: .gregorian)
    formatter.locale = Locale(identifier: "en_US_POSIX")
    formatter.timeZone = .current
    formatter.dateFormat = "yyyy-MM-dd"
    return formatter.string(from: date)
  }
}
