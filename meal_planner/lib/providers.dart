import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'data/app_database.dart';
import 'repositories/ingredient_repository.dart';
import 'repositories/recipe_repository.dart';
import 'repositories/weekly_plan_repository.dart';

// Core singletons
final databaseProvider = Provider<AppDatabase>((ref) => AppDatabase());
final ingredientRepoProvider = Provider<IngredientRepository>((ref) => IngredientRepository(ref.read(databaseProvider)));
final recipeRepoProvider = Provider<RecipeRepository>((ref) => RecipeRepository(ref.read(databaseProvider)));
final planRepoProvider = Provider<WeeklyPlanRepository>((ref) => WeeklyPlanRepository(ref.read(databaseProvider)));

// Data providers
final ingredientsProvider = FutureProvider((ref) async => ref.read(ingredientRepoProvider).getAll());
final recipesProvider = FutureProvider((ref) async => ref.read(recipeRepoProvider).getAll());

final selectedDayProvider = StateProvider<String>((ref) => 'Monday');
final selectedMealTypeProvider = StateProvider<String>((ref) => 'breakfast');
final weeklyPlanItemsProvider = FutureProvider((ref) async {
  final day = ref.watch(selectedDayProvider);
  final meal = ref.watch(selectedMealTypeProvider);
  return ref.read(planRepoProvider).getFor(day, meal);
});

// Weekly plan view: Map<day, Map<mealType, List<Recipe>>>
final weeklyPlanViewProvider = FutureProvider((ref) async {
  final db = ref.read(databaseProvider);
  final plans = await (db.select(db.weeklyPlanItems)).get();
  final allRecipes = await db.getAllRecipes();
  final recipeIdToRecipe = {for (final r in allRecipes) r.id: r};
  final Map<String, Map<String, List<Recipe>>> view = {};
  for (final p in plans) {
    final day = p.day;
    final meal = p.mealType;
    final recipe = recipeIdToRecipe[p.recipeId];
    if (recipe != null) {
      view.putIfAbsent(day, () => {});
      view[day]!.putIfAbsent(meal, () => []);
      view[day]![meal]!.add(recipe);
    }
  }
  return view;
});

// Recipe detail provider
class RecipeDetail {
  RecipeDetail({required this.recipe, required this.ingredients});
  final Recipe recipe;
  final List<({RecipeIngredient usage, Ingredient? ingredient})> ingredients;
}

final recipeDetailProvider = FutureProvider.family<RecipeDetail, String>((ref, id) async {
  final db = ref.read(databaseProvider);
  final recipe = await (db.select(db.recipes)..where((t) => t.id.equals(id))).getSingle();
  final usages = await db.getRecipeIngredientsByRecipe(id);
  final allIngredients = await ref.read(ingredientsProvider.future);
  final ingMap = {for (final i in allIngredients) i.id.trim(): i};
  final pairs = usages.map((u) => (usage: u, ingredient: ingMap[u.ingredientId.trim()])).toList();
  return RecipeDetail(recipe: recipe, ingredients: pairs);
});

// Search query provider
final recipeSearchQueryProvider = StateProvider<String>((ref) => '');

// Filtered and grouped recipes provider
final filteredRecipesProvider = Provider<AsyncValue<List<dynamic>>>((ref) {
  final recipesAsync = ref.watch(recipesProvider);
  final query = ref.watch(recipeSearchQueryProvider);

  return recipesAsync.when(
    data: (items) {
      final filteredItems = query.isEmpty
          ? items
          : items.where((r) => r.name.toLowerCase().contains(query.toLowerCase())).toList();

      if (items.isEmpty) {
        return const AsyncData([]);
      }

      if (filteredItems.isEmpty && query.isNotEmpty) {
        return const AsyncData([]);
      }

      final groupedRecipes = <String, List<Recipe>>{};
      for (final recipe in filteredItems) {
        final mealType = recipe.mealType?.isNotEmpty == true ? recipe.mealType!.toLowerCase() : 'uncategorized';
        (groupedRecipes[mealType] ??= []).add(recipe);
      }

      const groupOrder = ['pre_breakfast', 'breakfast', 'lunch', 'dinner', 'snack', 'uncategorized'];
      final sortedGroups = groupedRecipes.keys.toList()
        ..sort((a, b) {
          final indexA = groupOrder.indexOf(a);
          final indexB = groupOrder.indexOf(b);
          final effectiveIndexA = indexA == -1 ? groupOrder.length : indexA;
          final effectiveIndexB = indexB == -1 ? groupOrder.length : indexB;
          return effectiveIndexA.compareTo(effectiveIndexB);
        });

      groupedRecipes.forEach((key, value) {
        value.sort((a, b) => a.name.toLowerCase().compareTo(b.name.toLowerCase()));
      });

      final List<dynamic> flatList = [];
      for (final groupName in sortedGroups) {
        if (groupedRecipes[groupName]!.isNotEmpty) {
          flatList.add(groupName);
          flatList.addAll(groupedRecipes[groupName]!);
        }
      }
      return AsyncData(flatList);
    },
    loading: () => const AsyncValue.loading(),
    error: (e, st) => AsyncValue.error(e, st),
  );
});

// The index of the page to show in the weekly plan.
final weeklyPlanPageIndexProvider = StateProvider<int>((ref) {
  // Monday is 1, Sunday is 7. We want 0-indexed.
  // This will make it default to the current day of the week.
  return DateTime.now().weekday - 1;
});
