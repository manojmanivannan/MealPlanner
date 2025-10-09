import 'dart:convert';
import 'package:drift/drift.dart';
import 'package:file_selector/file_selector.dart';
import '../data/app_database.dart';

class BackupRestoreService {
  BackupRestoreService(this.db);
  final AppDatabase db;

  Future<void> exportJson() async {
    final ingredients = await db.getAllIngredients();
    final recipes = await db.getAllRecipes();
    final recipeIngs = await (db.select(db.recipeIngredients)).get();
    final plans = await (db.select(db.weeklyPlanItems)).get();

    Map<String, dynamic> rowToMap(dynamic row) => row.toJson();

    final payload = {
      'ingredients': ingredients.map(rowToMap).toList(),
      'recipes': recipes.map(rowToMap).toList(),
      'recipeIngredients': recipeIngs.map(rowToMap).toList(),
      'weeklyPlanItems': plans.map(rowToMap).toList(),
    };

    final file = await getSaveLocation(suggestedName: 'meal_planner_backup.json');
    if (file == null) return;
    final data = utf8.encode(const JsonEncoder.withIndent('  ').convert(payload));
    final xFile = XFile.fromData(data, name: 'meal_planner_backup.json', mimeType: 'application/json');
    await xFile.saveTo(file.path);
  }

  Future<void> importJson() async {
    final typeGroup = XTypeGroup(label: 'json', extensions: ['json']);
    final file = await openFile(acceptedTypeGroups: [typeGroup]);
    if (file == null) return;
    final raw = await file.readAsString();
    final Map<String, dynamic> payload = json.decode(raw);

    await db.transaction(() async {
      await db.delete(db.recipeIngredients).go();
      await db.delete(db.weeklyPlanItems).go();
      await db.delete(db.recipes).go();
      await db.delete(db.ingredients).go();

      for (final j in (payload['ingredients'] as List<dynamic>? ?? [])) {
        final m = j as Map<String, dynamic>;
        await db.upsertIngredient(IngredientsCompanion.insert(
          id: m['id'] as String,
          name: m['name'] as String,
          shelfLifeDays: Value(m['shelfLifeDays'] as int?),
          available: Value((m['available'] as bool?) ?? false),
          lastAvailable: Value(m['lastAvailable'] == null ? null : DateTime.tryParse(m['lastAvailable'] as String)),
          servingUnit: Value(m['servingUnit'] as String?),
          servingSize: Value((m['servingSize'] as num?)?.toDouble()),
          protein: Value((m['protein'] as num?)?.toDouble()),
          carbs: Value((m['carbs'] as num?)?.toDouble()),
          fat: Value((m['fat'] as num?)?.toDouble()),
          fiber: Value((m['fiber'] as num?)?.toDouble()),
          energy: Value((m['energy'] as num?)?.toDouble()),
          ironMg: Value((m['ironMg'] as num?)?.toDouble()),
          magnesiumMg: Value((m['magnesiumMg'] as num?)?.toDouble()),
          calciumMg: Value((m['calciumMg'] as num?)?.toDouble()),
          potassiumMg: Value((m['potassiumMg'] as num?)?.toDouble()),
          sodiumMg: Value((m['sodiumMg'] as num?)?.toDouble()),
          vitaminCMg: Value((m['vitaminCMg'] as num?)?.toDouble()),
        ));
      }

      for (final j in (payload['recipes'] as List<dynamic>? ?? [])) {
        final m = j as Map<String, dynamic>;
        await db.upsertRecipe(RecipesCompanion.insert(
          id: m['id'] as String,
          name: m['name'] as String,
          serves: Value(m['serves'] as int?),
          instructions: Value(m['instructions'] as String?),
          mealType: Value(m['mealType'] as String?),
          isVegetarian: Value(m['isVegetarian'] as bool?),
          protein: Value((m['protein'] as num?)?.toDouble()),
          carbs: Value((m['carbs'] as num?)?.toDouble()),
          fat: Value((m['fat'] as num?)?.toDouble()),
          fiber: Value((m['fiber'] as num?)?.toDouble()),
          energy: Value((m['energy'] as num?)?.toDouble()),
          ironMg: Value((m['ironMg'] as num?)?.toDouble()),
          magnesiumMg: Value((m['magnesiumMg'] as num?)?.toDouble()),
          calciumMg: Value((m['calciumMg'] as num?)?.toDouble()),
          potassiumMg: Value((m['potassiumMg'] as num?)?.toDouble()),
          sodiumMg: Value((m['sodiumMg'] as num?)?.toDouble()),
          vitaminCMg: Value((m['vitaminCMg'] as num?)?.toDouble()),
        ));
      }

      for (final j in (payload['recipeIngredients'] as List<dynamic>? ?? [])) {
        final m = j as Map<String, dynamic>;
        await db.addRecipeIngredient(RecipeIngredientsCompanion.insert(
          id: m['id'] as String,
          recipeId: m['recipeId'] as String,
          ingredientId: m['ingredientId'] as String,
          quantity: (m['quantity'] as num?)?.toDouble() ?? 0,
          servingUnit: Value(m['servingUnit'] as String?),
        ));
      }

      for (final j in (payload['weeklyPlanItems'] as List<dynamic>? ?? [])) {
        final m = j as Map<String, dynamic>;
        await db.addWeeklyPlanItem(WeeklyPlanItemsCompanion.insert(
          id: m['id'] as String,
          day: m['day'] as String,
          mealType: m['mealType'] as String,
          recipeId: m['recipeId'] as String,
        ));
      }
    });
  }
}
