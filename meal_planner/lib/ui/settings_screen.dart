import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../main.dart';
import '../services/notification_scheduler_service.dart';

class SettingsScreen extends ConsumerWidget {
  const SettingsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final prefsAsync = ref.watch(sharedPreferencesProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Settings')),
      body: prefsAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, st) => Center(child: Text('Error: $e')),
        data: (prefs) => _SettingsView(prefs: prefs),
      ),
    );
  }
}

class _SettingsView extends ConsumerStatefulWidget {
  final SharedPreferences prefs;

  const _SettingsView({required this.prefs});

  @override
  ConsumerState<_SettingsView> createState() => _SettingsViewState();
}

class _SettingsViewState extends ConsumerState<_SettingsView> {
  late bool _notificationsEnabled;
  late TimeOfDay _preBreakfastTime;
  late TimeOfDay _breakfastTime;
  late TimeOfDay _lunchTime;
  late TimeOfDay _snackTime;
  late TimeOfDay _dinnerTime;

  @override
  void initState() {
    super.initState();
    _notificationsEnabled = widget.prefs.getBool('notifications_enabled') ?? true;
    _preBreakfastTime = _getTime('pre_breakfast_time', const TimeOfDay(hour: 7, minute: 0));
    _breakfastTime = _getTime('breakfast_time', const TimeOfDay(hour: 9, minute: 0));
    _lunchTime = _getTime('lunch_time', const TimeOfDay(hour: 13, minute: 0));
    _snackTime = _getTime('snack_time', const TimeOfDay(hour: 17, minute: 0));
    _dinnerTime = _getTime('dinner_time', const TimeOfDay(hour: 20, minute: 0));
  }

  Future<void> _rescheduleNotifications() async {
    final scheduler = await ref.read(notificationSchedulerServiceProvider.future);
    if (_notificationsEnabled) {
      await scheduler.rescheduleAllNotifications();
    } else {
      await scheduler.cancelAllNotifications();
    }
  }

  TimeOfDay _getTime(String key, TimeOfDay defaultTime) {
    final timeString = widget.prefs.getString(key);
    if (timeString == null) return defaultTime;
    final parts = timeString.split(':');
    return TimeOfDay(hour: int.parse(parts[0]), minute: int.parse(parts[1]));
  }

  Future<void> _setTime(String key, TimeOfDay time) async {
    await widget.prefs.setString(key, '${time.hour}:${time.minute}');
    await _rescheduleNotifications();
  }

  Future<void> _selectTime(BuildContext context, String label, TimeOfDay initialTime, Function(TimeOfDay) onTimeChanged) async {
    final picked = await showTimePicker(context: context, initialTime: initialTime);
    if (picked != null) {
      await onTimeChanged(picked);
    }
  }

  @override
  Widget build(BuildContext context) {
    final schedulerAsync = ref.watch(notificationSchedulerServiceProvider);

    return schedulerAsync.when(
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (e, st) => Center(child: Text('Error: $e')),
      data: (scheduler) => ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Text('Meal Times', style: Theme.of(context).textTheme.titleLarge),
          const Divider(),
          _buildTimeSetting('Pre-Breakfast', _preBreakfastTime, (t) async {
            await _setTime('pre_breakfast_time', t);
            setState(() {
              _preBreakfastTime = t;
            });
          }),
          _buildTimeSetting('Breakfast', _breakfastTime, (t) async {
            await _setTime('breakfast_time', t);
            setState(() {
              _breakfastTime = t;
            });
          }),
          _buildTimeSetting('Lunch', _lunchTime, (t) async {
            await _setTime('lunch_time', t);
            setState(() {
              _lunchTime = t;
            });
          }),
          _buildTimeSetting('Snack', _snackTime, (t) async {
            await _setTime('snack_time', t);
            setState(() {
              _snackTime = t;
            });
          }),
          _buildTimeSetting('Dinner', _dinnerTime, (t) async {
            await _setTime('dinner_time', t);
            setState(() {
              _dinnerTime = t;
            });
          }),
          const SizedBox(height: 24),
          Text('Notifications', style: Theme.of(context).textTheme.titleLarge),
          const Divider(),
          SwitchListTile(
            title: const Text('Enable Notifications'),
            value: _notificationsEnabled,
            onChanged: (value) async {
              await widget.prefs.setBool('notifications_enabled', value);
              await _rescheduleNotifications();
              setState(() {
                _notificationsEnabled = value;
              });
            },
          ),
          if (_notificationsEnabled) ...[
            const SizedBox(height: 20),
            ElevatedButton(
              onPressed: () async {
                await scheduler.sendTestNotification();
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(
                    content: Text('Test notification sent!'),
                    duration: Duration(seconds: 2),
                  ),
                );
              },
              child: const Text('Test Notification'),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildTimeSetting(String title, TimeOfDay time, Function(TimeOfDay) onTimeChanged) {
    return ListTile(
      title: Text(title),
      trailing: Text(time.format(context)),
      onTap: () => _selectTime(context, title, time, onTimeChanged),
    );
  }
}
