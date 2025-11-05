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

  Future<void> cancelAllNotifications() async {
    await _notificationService.cancelAllNotifications();
  }

  Future<void> sendTestNotification() async {
    final now = DateTime.now();
    final mealTypes = ['pre_breakfast', 'breakfast', 'lunch', 'snack', 'dinner'];
    final mealTimes = mealTypes.map((mealType) {
      final time = _getTime('${mealType}_time', const TimeOfDay(hour: 12, minute: 0));
      return MapEntry(mealType, DateTime(now.year, now.month, now.day, time.hour, time.minute));
    }).toList();

    mealTimes.sort((a, b) => a.value.compareTo(b.value));

    // Find the next meal time
    var nextMealIndex = mealTimes.indexWhere((element) => element.value.isAfter(now));
    if (nextMealIndex == -1) {
      // If no meal is upcoming today, pick the first one for tomorrow
      nextMealIndex = 0;
    }

    final nextMeal = mealTimes[nextMealIndex];
    final dayToScheduleFor = DateFormat('EEEE').format(nextMeal.value);
    final mealsOnThatDay = await _db.getWeeklyPlanFor(dayToScheduleFor, nextMeal.key);

    final recipeNames = await Future.wait(mealsOnThatDay.map((e) => _db.getRecipeName(e.recipeId)));
    final body = recipeNames.isNotEmpty ? recipeNames.join(', ') : "No meals planned for this time.";

    await _notificationService.showNotification(
      id: 999, // A unique ID for test notifications
      title: 'Time for ${nextMeal.key.replaceAll('_', ' ')}',
      body: body,
      payload: 'plan',
    );
  }

  Future<void> rescheduleAllNotifications() async {
    await cancelAllNotifications();
    final notificationsEnabled = _prefs.getBool('notifications_enabled') ?? true;
    if (!notificationsEnabled) return;

    final now = DateTime.now();
    final mealTypes = ['pre_breakfast', 'breakfast', 'lunch', 'snack', 'dinner'];

    // Schedule all meal notifications
    for (var i = 0; i < mealTypes.length; i++) {
      final mealType = mealTypes[i];
      final mealTime = _getTime('${mealType}_time', const TimeOfDay(hour: 12, minute: 0));

      var mealDateTime = DateTime(now.year, now.month, now.day, mealTime.hour, mealTime.minute);

      // If the meal time for today has already passed, schedule it for tomorrow.
      if (mealDateTime.isBefore(now)) {
        mealDateTime = mealDateTime.add(const Duration(days: 1));
      }

      final dayToScheduleFor = DateFormat('EEEE').format(mealDateTime);
      final mealsOnThatDay = await _db.getWeeklyPlanFor(dayToScheduleFor, mealType);

      if (mealsOnThatDay.isNotEmpty) {
        final recipeNames = await Future.wait(mealsOnThatDay.map((e) => _db.getRecipeName(e.recipeId)));
        final body = recipeNames.join(', ');

        await _notificationService.scheduleDailyRepeatingNotification(
          id: i, // Meal notifications use IDs 0-4
          title: 'Time for ${mealType.replaceAll('_', ' ')}',
          body: body,
          scheduledDate: mealDateTime,
          payload: 'plan',
        );
      }
    }
  }

  TimeOfDay _getTime(String key, TimeOfDay defaultTime) {
    final timeString = _prefs.getString(key);
    if (timeString == null) return defaultTime;
    final parts = timeString.split(':');
    return TimeOfDay(hour: int.parse(parts[0]), minute: int.parse(parts[1]));
  }
}
