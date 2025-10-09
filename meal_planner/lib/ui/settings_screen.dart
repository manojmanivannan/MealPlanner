import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../providers.dart';
import '../services/backup_restore_service.dart';
import '../data/seed_service.dart';

final backupServiceProvider = Provider<BackupRestoreService>((ref) => BackupRestoreService(ref.read(databaseProvider)));
final seedServiceProvider = Provider<SeedService>((ref) => SeedService(ref.read(databaseProvider)));

class SettingsScreen extends ConsumerWidget {
  const SettingsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final backup = ref.read(backupServiceProvider);
    final seeder = ref.read(seedServiceProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('Settings')),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            ElevatedButton.icon(
              onPressed: () async {
                await backup.exportJson();
                if (context.mounted) _snack(context, 'Exported backup');
              },
              icon: const Icon(Icons.upload_file),
              label: const Text('Export backup (JSON)'),
            ),
            const SizedBox(height: 12),
            ElevatedButton.icon(
              onPressed: () async {
                await backup.importJson();
                if (context.mounted) _snack(context, 'Imported backup');
              },
              icon: const Icon(Icons.download),
              label: const Text('Import backup (JSON)'),
            ),
            const SizedBox(height: 24),
            ElevatedButton.icon(
              onPressed: () async {
                await seeder.repairWeeklyPlan();
                if (context.mounted) _snack(context, 'Weekly plan repaired from assets');
              },
              icon: const Icon(Icons.build),
              label: const Text('Repair Weekly Plan Data'),
            ),
          ],
        ),
      ),
    );
  }

  void _snack(BuildContext context, String msg) {
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(msg)));
  }
}
