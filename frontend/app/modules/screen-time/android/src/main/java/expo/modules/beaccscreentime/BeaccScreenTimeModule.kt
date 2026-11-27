package expo.modules.beaccscreentime

import android.app.AppOpsManager
import android.app.usage.UsageEvents
import android.app.usage.UsageStatsManager
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.Process
import android.provider.Settings
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId

/**
 * Screen time on Android: how long apps were in the foreground each day, from
 * the system's usage event log (the source Digital Wellbeing reads). Every app
 * counts except the home screen and the system UI, so the total is the phone's
 * screen time. Needs Usage access, which the user grants in Settings.
 */
class BeaccScreenTimeModule : Module() {
  private val context: Context
    get() = appContext.reactContext ?: throw IllegalStateException("No React context")

  override fun definition() = ModuleDefinition {
    Name("BeaccScreenTime")

    /** Whether the user has granted Usage access to this app. */
    Function("hasAccess") { hasAccess() }

    /** Open the Usage access settings, on this app's page where the phone supports it. */
    Function("openAccessSettings") {
      val withPackage =
        Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS, Uri.parse("package:${context.packageName}"))
      val plain = Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS)
      for (intent in listOf(withPackage, plain)) {
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        try {
          context.startActivity(intent)
          return@Function true
        } catch (_: Exception) {
          // Some phones reject the package form; try the plain list.
        }
      }
      false
    }

    /**
     * Foreground minutes per local day for the last [days] days, oldest first,
     * as { date: "yyyy-MM-dd", minutes }, plus when the latest usage event
     * happened. The log only reaches back about a week, so a day the log
     * doesn't fully cover is left out rather than reported short.
     */
    Function("readDays") { days: Int -> readDays(days) }
  }

  private fun hasAccess(): Boolean {
    val ops = context.getSystemService(Context.APP_OPS_SERVICE) as AppOpsManager
    val mode =
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
        ops.unsafeCheckOpNoThrow(
          AppOpsManager.OPSTR_GET_USAGE_STATS, Process.myUid(), context.packageName)
      } else {
        @Suppress("DEPRECATION")
        ops.checkOpNoThrow(AppOpsManager.OPSTR_GET_USAGE_STATS, Process.myUid(), context.packageName)
      }
    return mode == AppOpsManager.MODE_ALLOWED
  }

  /** Packages whose foreground time isn't screen time: home screens and the system UI. */
  private fun ignoredPackages(): Set<String> {
    val home = Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_HOME)
    val launchers =
      context.packageManager
        .queryIntentActivities(home, PackageManager.MATCH_DEFAULT_ONLY)
        .map { it.activityInfo.packageName }
    return launchers.toSet() + "com.android.systemui"
  }

  private fun readDays(days: Int): Map<String, Any?> {
    if (!hasAccess()) return mapOf("days" to emptyList<Any>(), "lastEventAt" to null)
    val zone = ZoneId.systemDefault()
    val today = LocalDate.now(zone)
    val firstDay = today.minusDays((days - 1).toLong())
    val start = firstDay.atStartOfDay(zone).toInstant().toEpochMilli()
    val now = System.currentTimeMillis()
    val ignored = ignoredPackages()

    val minutesByDay = sortedMapOf<LocalDate, Double>()
    /** Add the span [from, to) to the days it falls on, split at midnight. */
    fun add(from: Long, to: Long) {
      var t = from
      while (t < to) {
        val day = Instant.ofEpochMilli(t).atZone(zone).toLocalDate()
        val dayEnd = day.plusDays(1).atStartOfDay(zone).toInstant().toEpochMilli()
        val end = minOf(to, dayEnd)
        minutesByDay[day] = (minutesByDay[day] ?: 0.0) + (end - t) / 60_000.0
        t = end
      }
    }

    val usage = context.getSystemService(Context.USAGE_STATS_SERVICE) as UsageStatsManager
    val events = usage.queryEvents(start, now)
    val event = UsageEvents.Event()
    // Package → when it came to the foreground and how many of its activities
    // are resumed. Counted, because an app's next screen can resume just before
    // its last one pauses; the app is in use until none are left.
    class Open(val since: Long, var activities: Int)
    val foreground = mutableMapOf<String, Open>()
    var firstEventAt: Long? = null
    var lastEventAt: Long? = null

    fun closeAll(at: Long) {
      foreground.values.forEach { add(it.since, at) }
      foreground.clear()
    }

    while (events.hasNextEvent()) {
      events.getNextEvent(event)
      val at = event.timeStamp
      if (firstEventAt == null) firstEventAt = at
      when (event.eventType) {
        UsageEvents.Event.ACTIVITY_RESUMED -> {
          if (event.packageName in ignored) continue
          val open = foreground[event.packageName]
          if (open == null) foreground[event.packageName] = Open(at, 1) else open.activities++
          lastEventAt = at
        }
        // Every activity pauses before it stops, so PAUSED alone counts down.
        UsageEvents.Event.ACTIVITY_PAUSED -> {
          val open = foreground[event.packageName] ?: continue
          open.activities--
          if (open.activities <= 0) {
            foreground.remove(event.packageName)
            add(open.since, at)
          }
          lastEventAt = at
        }
        // The screen went off or the phone shut down: nothing is in use any more.
        UsageEvents.Event.SCREEN_NON_INTERACTIVE,
        UsageEvents.Event.DEVICE_SHUTDOWN -> closeAll(at)
      }
    }
    // Whatever is still open is in use right now.
    closeAll(now)

    // The log may start partway through the window: drop the day it starts on
    // (and any before it) unless it's the window's first day and starts there.
    // Today always counts: a log that starts today means a phone set up (or
    // reset) today, and what it has is all there is.
    val coveredFrom =
      firstEventAt
        ?.let {
          val day = Instant.ofEpochMilli(it).atZone(zone).toLocalDate()
          if (day == firstDay) firstDay else day.plusDays(1)
        }
        ?.let { if (it.isAfter(today)) today else it } ?: today

    val result = mutableListOf<Map<String, Any>>()
    var day = coveredFrom
    while (!day.isAfter(today)) {
      result.add(
        mapOf(
          "date" to day.toString(),
          "minutes" to Math.round(minOf(24 * 60.0, minutesByDay[day] ?: 0.0)).toInt()))
      day = day.plusDays(1)
    }
    return mapOf("days" to result, "lastEventAt" to lastEventAt?.toDouble())
  }
}
