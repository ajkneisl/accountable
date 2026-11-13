// DeviceActivity monitor extension for the screen_time integration. The app
// (modules/screen-time) schedules one all-day activity with an event every few
// minutes of use, named "minutes.<threshold>". iOS wakes this extension as each
// is crossed, and it keeps the highest threshold per local day in the shared
// App Group.
//
// It also posts the totals to the backend itself, at most every
// POST_INTERVAL, since this extension is the only thing iOS reliably runs as
// screen time accrues; the app may not be woken for hours. It can't sign in, so
// the app leaves the API URL and a token that only imports screen time in the
// App Group (see setSession in BeaccScreenTimeModule). The app still posts
// everything recorded whenever it runs, which covers whatever this missed.
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

/** The backend's base URL and a screen-time-only token, left here by the app. */
private let API_URL_KEY = "screenTime.apiUrl"
private let TOKEN_KEY = "screenTime.token"
/** Seconds epoch of this extension's last successful post, and of its last try. */
private let LAST_POST_KEY = "screenTime.lastPostAt"
private let LAST_ATTEMPT_KEY = "screenTime.lastAttemptAt"

/** Post to the backend no more often than this. */
private let POST_INTERVAL: TimeInterval = 30 * 60

/**
 * After a post that didn't go through, wait this long before another. iOS can
 * deliver many thresholds at once, and offline each would otherwise sit
 * through its own timeout.
 */
private let RETRY_INTERVAL: TimeInterval = 60

/** iOS suspends the extension once a callback returns, so a post is waited on this long. */
private let POST_TIMEOUT: TimeInterval = 10

/**
 * How long after midnight a threshold too big for the new day still counts as
 * yesterday's, delivered late. Past this it can't be either day's real use.
 */
private let LATE_DELIVERY_MINUTES = 30

/** Days older than this are dropped; the app syncs far more often. */
private let KEEP_DAYS = 60

class ScreenTimeMonitor: DeviceActivityMonitor {
  /** A new day began while monitoring, so it has a total even if nothing is used. */
  override func intervalDidStart(for activity: DeviceActivityName) {
    super.intervalDidStart(for: activity)
    record(minutes: 0)
    // Whatever the throttle held back last night, so yesterday ends up final.
    post(force: true)
  }

  override func eventDidReachThreshold(
    _ event: DeviceActivityEvent.Name,
    activity: DeviceActivityName
  ) {
    super.eventDidReachThreshold(event, activity: activity)
    guard event.rawValue.hasPrefix(EVENT_PREFIX),
      let minutes = Int(event.rawValue.dropFirst(EVENT_PREFIX.count))
    else { return }
    guard let day = dayOf(threshold: minutes, at: Date()) else { return }
    record(minutes: minutes, on: day)
    // Yesterday's total just changed after midnight's post called it final.
    post(force: !Calendar.current.isDateInToday(day))
  }

  /**
   * Post today's and yesterday's totals to the backend, unless the last post
   * was under [POST_INTERVAL] ago (or the last try under [RETRY_INTERVAL] ago)
   * and [force] isn't set. Does nothing while signed out. A failure (offline,
   * or a token that has expired because the app hasn't run in a month) is left
   * for the next threshold or the app's own sync.
   */
  private func post(force: Bool = false) {
    guard let defaults = UserDefaults(suiteName: GROUP_ID),
      let base = defaults.string(forKey: API_URL_KEY),
      let token = defaults.string(forKey: TOKEN_KEY),
      let url = URL(string: base + "/integrations/screen_time/import")
    else { return }

    let now = Date()
    let seconds = now.timeIntervalSince1970
    if !force {
      // A negative gap means the clock moved back; don't let that block posting.
      let sincePost = seconds - defaults.double(forKey: LAST_POST_KEY)
      if sincePost >= 0, sincePost < POST_INTERVAL { return }
      let sinceAttempt = seconds - defaults.double(forKey: LAST_ATTEMPT_KEY)
      if sinceAttempt >= 0, sinceAttempt < RETRY_INTERVAL { return }
    }

    let calendar = Calendar.current
    let recorded = defaults.dictionary(forKey: DAYS_KEY) as? [String: Int] ?? [:]
    let recent = [now, calendar.date(byAdding: .day, value: -1, to: now)].compactMap { $0 }
    let days: [[String: Any]] = recent.compactMap { date in
      guard let minutes = recorded[dayKey(date)],
        // Local noon, which the backend files under that day.
        let noon = calendar.date(bySettingHour: 12, minute: 0, second: 0, of: date)
      else { return nil }
      return ["day": Int(noon.timeIntervalSince1970 * 1000), "minutes": minutes]
    }
    guard !days.isEmpty,
      let body = try? JSONSerialization.data(withJSONObject: ["days": days])
    else { return }

    var request = URLRequest(url: url, timeoutInterval: POST_TIMEOUT)
    request.httpMethod = "POST"
    request.setValue("application/json", forHTTPHeaderField: "Content-Type")
    request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
    request.httpBody = body
    defaults.set(seconds, forKey: LAST_ATTEMPT_KEY)

    let session = URLSession(configuration: .ephemeral)
    let done = DispatchSemaphore(value: 0)
    session.dataTask(with: request) { _, response, _ in
      if let status = (response as? HTTPURLResponse)?.statusCode, (200..<300).contains(status) {
        defaults.set(seconds, forKey: LAST_POST_KEY)
      }
      done.signal()
    }.resume()
    _ = done.wait(timeout: .now() + POST_TIMEOUT + 1)
    session.finishTasksAndInvalidate()
  }

  /**
   * The day a [threshold] of minutes reported at [now] belongs to, or nil if
   * it can't be real. Each day's interval starts at midnight, so today can't
   * have more use than minutes since midnight. A bigger threshold just after
   * midnight is yesterday's, delivered late; any later, it's a bad report
   * (iOS has fired thresholds early), and recording it would stick, since a
   * day's total never comes back down.
   */
  private func dayOf(threshold minutes: Int, at now: Date) -> Date? {
    let calendar = Calendar.current
    let midnight = calendar.startOfDay(for: now)
    // A minute's slack for the threshold being crossed right at the boundary.
    let sinceMidnight = Int(now.timeIntervalSince(midnight) / 60) + 1
    if minutes <= sinceMidnight { return now }
    guard sinceMidnight <= LATE_DELIVERY_MINUTES else { return nil }
    return calendar.date(byAdding: .day, value: -1, to: midnight)
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
