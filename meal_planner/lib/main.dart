import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'data/app_database.dart';
import 'data/seed_service.dart';
import 'providers.dart' as p;
import 'ui/shell.dart';

final databaseProvider = Provider<AppDatabase>((ref) => AppDatabase());
final seedProvider = Provider<SeedService>((ref) => SeedService(ref.read(databaseProvider)));

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
      await ref.read(seedProvider).seedIfNeeded();
      if (mounted) setState(() => _ready = true);
    });
  }

  @override
  Widget build(BuildContext context) {
    if (!_ready) {
      return const MaterialApp(home: Scaffold(body: Center(child: CircularProgressIndicator())));
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

class _HomeScreen extends StatelessWidget {
  const _HomeScreen();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Meal Planner')),
      body: const Center(
        child: Text('Welcome to Meal Planner (Offline)'),
      ),
    );
  }
}
