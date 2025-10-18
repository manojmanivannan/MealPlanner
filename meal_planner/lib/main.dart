import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:permission_handler/permission_handler.dart';

import 'data/app_database.dart';
import 'data/seed_service.dart';
import 'services/notification_service.dart';
import 'services/notification_scheduler_service.dart';
import 'ui/shell.dart';

final databaseProvider = Provider<AppDatabase>((ref) => AppDatabase());
final seedProvider = Provider<SeedService>((ref) => SeedService(ref.read(databaseProvider)));
final notificationServiceProvider = Provider<NotificationService>((ref) => NotificationService());
final sharedPreferencesProvider = FutureProvider<SharedPreferences>((ref) async => await SharedPreferences.getInstance());

final notificationSchedulerServiceProvider = Provider<NotificationSchedulerService>((ref) {
  final notificationService = ref.watch(notificationServiceProvider);
  final prefs = ref.watch(sharedPreferencesProvider).asData!.value;
  final db = ref.watch(databaseProvider);
  return NotificationSchedulerService(notificationService, prefs, db);
});

class AppInitializer extends ConsumerStatefulWidget {
  const AppInitializer({super.key, required this.child});
  final Widget child;

  @override
  ConsumerState<AppInitializer> createState() => _AppInitializerState();
}

class _AppInitializerState extends ConsumerState<AppInitializer> {
  bool _ready = false;

  @override
  void initState() {
    super.initState();
    Future(() async {
      await _requestPermissions();
      await ref.read(seedProvider).seedIfNeeded();
      await ref.read(notificationServiceProvider).init();
      // No need to await the scheduler, it will be ready when needed.
      if (mounted) setState(() => _ready = true);
    });
  }

  Future<void> _requestPermissions() async {
    if (await Permission.scheduleExactAlarm.isDenied) {
      await Permission.scheduleExactAlarm.request();
    }
    if (await Permission.notification.isDenied) {
      await Permission.notification.request();
    }
  }

  @override
  Widget build(BuildContext context) {
    if (!_ready) {
      return const MaterialApp(
        home: Scaffold(
          body: Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                CircularProgressIndicator(),
                SizedBox(height: 16),
                Text('Loading Recipes and Ingredients....'),
              ],
            ),
          ),
        ),
      );
    }
    return widget.child as MaterialApp; // child is the MaterialApp
  }
}

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const ProviderScope(child: MealPlannerApp()));
}

class MealPlannerApp extends StatelessWidget {
  const MealPlannerApp({super.key});

  @override
  Widget build(BuildContext context) {
    return AppInitializer(
      child: MaterialApp(
        title: 'Meal Planner',
        theme: ThemeData(
          colorScheme: ColorScheme.fromSeed(seedColor: Colors.blue),
          appBarTheme: const AppBarTheme(
            backgroundColor: Colors.blue,
            foregroundColor: Colors.white,
          ),
          pageTransitionsTheme: const PageTransitionsTheme(
            builders: {
              TargetPlatform.android: FadeUpwardsPageTransitionsBuilder(),
              TargetPlatform.iOS: FadeUpwardsPageTransitionsBuilder(),
              TargetPlatform.linux: FadeUpwardsPageTransitionsBuilder(),
              TargetPlatform.macOS: FadeUpwardsPageTransitionsBuilder(),
              TargetPlatform.windows: FadeUpwardsPageTransitionsBuilder(),
            },
          ),
          useMaterial3: true,
        ),
        home: const AppShell(),
      ),
    );
  }
}
