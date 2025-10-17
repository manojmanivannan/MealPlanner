import 'package:shared_preferences/shared_preferences.dart';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'notification_service.dart';
import '../data/app_database.dart';

class NotificationSchedulerService {
  final NotificationService _notificationService;
  final SharedPreferences _prefs;
  final AppDatabase _db;

  NotificationSchedulerService(this._notificationService, this._prefs, this._db);

  Future<void> rescheduleAllNotifications() async {
    // 1. Cancel everything to ensure a clean slate.
    await _notificationService.cancelAllNotifications();

    final now = DateTime.now();
    final leadTime = _prefs.getInt('notification_lead_time') ?? 15;
    final mealTypes = ['pre_breakfast', 'breakfast', 'lunch', 'snack', 'dinner'];

    // 2. Schedule all meal notifications
    for (var i = 0; i < mealTypes.length; i++) {
      final mealType = mealTypes[i];
      final mealTime = _getTime('${mealType}_time', const TimeOfDay(hour: 12, minute: 0));

      var notificationTime = DateTime(now.year, now.month, now.day, mealTime.hour, mealTime.minute)
          .subtract(Duration(minutes: leadTime));

      if (notificationTime.isBefore(now)) {
        notificationTime = notificationTime.add(const Duration(days: 1));
      }

      final dayToScheduleFor = DateFormat('EEEE').format(notificationTime);
      final mealsOnThatDay = await _db.getWeeklyPlanFor(dayToScheduleFor, mealType);

      if (mealsOnThatDay.isNotEmpty) {
        await _notificationService.scheduleNotification(
          id: i, // Meal notifications use IDs 0-4
          title: 'Upcoming Meal: $mealType',
          body: 'Time for your scheduled meal.',
          scheduledDate: notificationTime,
        );
      }
    }

    // 3. Schedule the summary notification for the next day's plan.
    final mealPlanTime = _getTime('next_day_plan_time', const TimeOfDay(hour: 21, minute: 0));
    var summaryNotificationTime = DateTime(now.year, now.month, now.day, mealPlanTime.hour, mealPlanTime.minute);

    if (summaryNotificationTime.isBefore(now)) {
      summaryNotificationTime = summaryNotificationTime.add(const Duration(days: 1));
    }

    final tomorrow = DateTime.now().add(const Duration(days: 1));
    final dayOfWeek = DateFormat('EEEE').format(tomorrow);
    final allMealsForTomorrow = <WeeklyPlanItem>[];
    for (final mealType in mealTypes) {
      allMealsForTomorrow.addAll(await _db.getWeeklyPlanFor(dayOfWeek, mealType));
    }

    if (allMealsForTomorrow.isNotEmpty) {
        final body = allMealsForTomorrow.length == 1 ? "1 meal planned" : "${allMealsForTomorrow.length} meals planned";
        await _notificationService.scheduleNotification(
            id: 101, // Summary notification uses ID 101
            title: "Tomorrow's Meal Plan",
            body: body,
            scheduledDate: summaryNotificationTime,
        );
    }
  }

  TimeOfDay _getTime(String key, TimeOfDay defaultTime) {
    final timeString = _prefs.getString(key);
    if (timeString == null) return defaultTime;
    final parts = timeString.split(':');
    return TimeOfDay(hour: int.parse(parts[0]), minute: int.parse(parts[1]));
  }
}
