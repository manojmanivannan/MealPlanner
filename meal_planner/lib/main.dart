import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_mobile_ads/google_mobile_ads.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:permission_handler/permission_handler.dart';

import 'data/app_database.dart';
import 'data/seed_service.dart';
import 'services/notification_service.dart';
import 'services/notification_scheduler_service.dart';
import 'ui/shell.dart';

final databaseProvider = Provider<AppDatabase>((ref) => AppDatabase());
final seedProvider = Provider<SeedService>((ref) => SeedService(ref.read(databaseProvider)));
final notificationServiceProvider = Provider<NotificationService>((ref) {
  final service = NotificationService();
  ref.onDispose(service.dispose);
  return service;
});
final sharedPreferencesProvider = FutureProvider<SharedPreferences>((ref) async => await SharedPreferences.getInstance());

final notificationSchedulerServiceProvider = FutureProvider<NotificationSchedulerService>((ref) async {
  final notificationService = ref.watch(notificationServiceProvider);
  final prefs = await ref.watch(sharedPreferencesProvider.future);
  final db = ref.watch(databaseProvider);
  return NotificationSchedulerService(notificationService, prefs, db);
});

final GlobalKey<AppShellState> appShellKey = GlobalKey<AppShellState>();

class AppInitializer extends ConsumerStatefulWidget {
  const AppInitializer({super.key, required this.child});
  final Widget child;

  @override
  ConsumerState<AppInitializer> createState() => _AppInitializerState();
}

class _AppInitializerState extends ConsumerState<AppInitializer> with WidgetsBindingObserver {
  StreamSubscription<String?>? _notificationSubscription;
  bool _ready = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    Future(() async {
      await _requestPermissions();
      await ref.read(seedProvider).seedIfNeeded();
      await ref.read(notificationServiceProvider).init();
      final scheduler = await ref.read(notificationSchedulerServiceProvider.future);
      await scheduler.rescheduleAllNotifications();
      _listenForNotifications();
      if (mounted) setState(() => _ready = true);
    });
  }

  @override
  void dispose() {
    _notificationSubscription?.cancel();
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      ref.read(notificationSchedulerServiceProvider.future).then((scheduler) {
        scheduler.rescheduleAllNotifications();
      });
    }
  }

  void _listenForNotifications() {
    final notificationService = ref.read(notificationServiceProvider);
    _notificationSubscription = notificationService.onNotificationTapped.listen((payload) {
      if (payload == 'plan') {
        appShellKey.currentState?.goToTab(0);
      }
    });
  }

  Future<void> _requestPermissions() async {
    await Permission.notification.request();
    await Permission.scheduleExactAlarm.request();
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
    return widget.child as MaterialApp;
  }
}

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  MobileAds.instance.initialize();
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
        home: AppShell(key: appShellKey),
      ),
    );
  }
}
