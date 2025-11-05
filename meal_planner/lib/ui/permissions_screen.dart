import 'package:flutter/material.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:app_settings/app_settings.dart';

class PermissionsScreen extends StatelessWidget {
  final VoidCallback onPermissionsGranted;

  const PermissionsScreen({super.key, required this.onPermissionsGranted});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Permissions Required')),
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Text(
              'To ensure you receive timely meal notifications, please grant the following permissions:',
              style: TextStyle(fontSize: 16),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 32),
            _buildPermissionCard(
              context,
              'Alarms & Reminders',
              'This allows the app to schedule notifications for your meals, even when the app is closed.',
              () => Permission.scheduleExactAlarm.request(),
            ),
            const SizedBox(height: 16),
            _buildPermissionCard(
              context,
              'Disable Battery Optimization',
              'This prevents your phone from putting the app to sleep, which can block notifications.',
              () => AppSettings.openAppSettings(type: AppSettingsType.batteryOptimization),
            ),
            const SizedBox(height: 32),
            ElevatedButton(
              onPressed: onPermissionsGranted,
              child: const Text('Continue'),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildPermissionCard(
    BuildContext context,
    String title,
    String description,
    VoidCallback onPressed,
  ) {
    return Card(
      elevation: 2,
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(title, style: Theme.of(context).textTheme.titleLarge),
            const SizedBox(height: 8),
            Text(description),
            const SizedBox(height: 16),
            ElevatedButton(
              onPressed: onPressed,
              child: Text('Grant $title'),
            ),
          ],
        ),
      ),
    );
  }
}
