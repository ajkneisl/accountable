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
/** Ms epoch of the last time iOS woke this extension, so the app can tell it's running. */
private let LAST_EVENT_KEY = "screenTime.lastEventAt"

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
    record(minutes: minutes, on: dayOf(threshold: minutes, at: Date()))
  }

  /**
   * The day a [threshold] of minutes reported at [now] belongs to. Each day's
   * interval starts at midnight, so today can't have more use than minutes
   * since midnight: a bigger threshold is yesterday's, delivered late.
   */
  private func dayOf(threshold minutes: Int, at now: Date) -> Date {
    let calendar = Calendar.current
    let midnight = calendar.startOfDay(for: now)
    // A minute's slack for the threshold being crossed right at the boundary.
    let sinceMidnight = Int(now.timeIntervalSince(midnight) / 60) + 1
    guard minutes > sinceMidnight,
      let yesterday = calendar.date(byAdding: .day, value: -1, to: midnight)
    else { return now }
    return yesterday
  }

  /** Raise [day]'s total to [minutes]; thresholds only ever grow within a day. */
  private func record(minutes: Int, on day: Date = Date()) {
    guard let defaults = UserDefaults(suiteName: GROUP_ID) else { return }
    let now = Date()
    let key = dayKey(day)
    let oldest = dayKey(now.addingTimeInterval(-Double(KEEP_DAYS) * 86_400))
    var days = defaults.dictionary(forKey: DAYS_KEY) as? [String: Int] ?? [:]
    days[key] = max(days[key] ?? 0, minutes)
    defaults.set(days.filter { $0.key >= oldest }, forKey: DAYS_KEY)
    defaults.set(Int(now.timeIntervalSince1970 * 1000), forKey: LAST_EVENT_KEY)
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
