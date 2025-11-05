import 'package:flutter/material.dart';
import 'ingredients_screen.dart';
import 'recipes_screen.dart';
import 'weekly_plan_screen.dart';
import 'settings_screen.dart';

class AppShell extends StatefulWidget {
  const AppShell({super.key});

  @override
  State<AppShell> createState() => AppShellState();
}

class AppShellState extends State<AppShell> {
  int _index = 0;

  void goToTab(int index) {
    setState(() {
      _index = index;
    });
  }

  static const _pages = [
    WeeklyPlanScreen(),
    RecipesScreen(),
    IngredientsScreen(),
    SettingsScreen(),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: _pages[_index],
      bottomNavigationBar: NavigationBar(
        selectedIndex: _index,
        destinations: const [
          NavigationDestination(icon: Icon(Icons.calendar_month), label: 'Plan'),
          NavigationDestination(icon: Icon(Icons.restaurant_menu), label: 'Recipes'),
          NavigationDestination(icon: Icon(Icons.local_grocery_store), label: 'Ingredients'),
          NavigationDestination(icon: Icon(Icons.settings), label: 'Settings'),
        ],
        onDestinationSelected: (i) => setState(() => _index = i),
      ),
    );
  }
}
