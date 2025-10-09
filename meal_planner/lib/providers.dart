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
  final ingIds = usages.map((u) => u.ingredientId).toSet();
  final ingList = await (db.select(db.ingredients)..where((t) => t.id.isIn(ingIds.toList()))).get();
  final ingMap = {for (final i in ingList) i.id: i};
  final pairs = usages.map((u) => (usage: u, ingredient: ingMap[u.ingredientId])).toList();
  return RecipeDetail(recipe: recipe, ingredients: pairs);
});
