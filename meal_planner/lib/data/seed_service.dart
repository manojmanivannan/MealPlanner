import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart' show rootBundle;
import 'package:drift/drift.dart';
import 'package:csv/csv.dart';
import 'package:uuid/uuid.dart';
import 'app_database.dart';

class SeedService {
  SeedService(this.db);
  final AppDatabase db;
  final Uuid _uuid = const Uuid();

  Future<void> seedIfNeeded() async {
    final initialized = await db.getKey('app_initialized');
    if (initialized != 'true') {
      await _seedIngredients();
      await _seedRecipes();
      await _seedWeeklyPlan(clearExisting: true);
      await db.setKey('app_initialized', 'true');
    }
    // Repair/upgrade weekly plan data if needed (e.g., early seeds with bad IDs)
    final planVer = await db.getKey('plan_seed_version');
    if (planVer != '2') {
      await _seedWeeklyPlan(clearExisting: true);
      await db.setKey('plan_seed_version', '2');
    }
  }

  Future<void> repairWeeklyPlan() async {
    await _seedWeeklyPlan(clearExisting: true);
    await db.setKey('plan_seed_version', '2');
  }

  Map<String, int> _buildIndex(List<dynamic> headerRow) {
    final header = headerRow.map((e) => (e?.toString() ?? '').trim().toLowerCase()).toList();
    return {for (var i = 0; i < header.length; i++) header[i]: i};
  }

  String _col(List<String> cols, Map<String, int> idx, String name) {
    final key = name.trim().toLowerCase();
    final i = idx[key];
    if (i == null) return '';
    if (i < 0 || i >= cols.length) return '';
    return cols[i];
  }

  Future<void> _seedIngredients() async {
    final csvStr = await rootBundle.loadString('assets/data/ingredients.csv');
    final rows = const CsvToListConverter(eol: '\n', shouldParseNumbers: false).convert(csvStr);
    if (rows.isEmpty) return;
    final idx = _buildIndex(rows.first);

    for (final row in rows.skip(1)) {
      final cols = (row as List).map((e) => (e?.toString() ?? '').trim()).toList();
      final idStr = _col(cols, idx, 'id');
      final name = _col(cols, idx, 'name');
      if (idStr.isEmpty || name.isEmpty) continue;
      await db.upsertIngredient(
        IngredientsCompanion.insert(
          id: idStr,
          name: name,
          shelfLifeDays: _intV(_col(cols, idx, 'shelf_life')),
          available: Value(_col(cols, idx, 'available') == 't'),
          lastAvailable: _dateV(_col(cols, idx, 'last_available')),
          servingUnit: Value(_col(cols, idx, 'serving_unit')),
          servingSize: _doubleV(_col(cols, idx, 'serving_size')),
          protein: _doubleV(_col(cols, idx, 'protein')),
          carbs: _doubleV(_col(cols, idx, 'carbs')),
          fat: _doubleV(_col(cols, idx, 'fat')),
          fiber: _doubleV(_col(cols, idx, 'fiber')),
          energy: _doubleV(_col(cols, idx, 'energy')),
          ironMg: _doubleV(_col(cols, idx, 'iron_mg')),
          magnesiumMg: _doubleV(_col(cols, idx, 'magnesium_mg')),
          calciumMg: _doubleV(_col(cols, idx, 'calcium_mg')),
          potassiumMg: _doubleV(_col(cols, idx, 'potassium_mg')),
          sodiumMg: _doubleV(_col(cols, idx, 'sodium_mg')),
          vitaminCMg: _doubleV(_col(cols, idx, 'vitamin_c_mg')),
        ),
      );
    }
  }

  Future<void> _seedRecipes() async {
    final allIngredients = await db.getAllIngredients();
    final ingredientMap = {for (var i in allIngredients) i.id: i};

    final csvStr = await rootBundle.loadString('assets/data/recipes.csv');
    final rows = const CsvToListConverter(eol: '\n', shouldParseNumbers: false).convert(csvStr);
    if (rows.isEmpty) return;
    final idx = _buildIndex(rows.first);

    for (final row in rows.skip(1)) {
      final cols = (row as List).map((e) => (e?.toString() ?? '').trim()).toList();
      final idStr = _col(cols, idx, 'id');
      final name = _col(cols, idx, 'name');
      if (idStr.isEmpty || name.isEmpty) continue;

      // Calculate nutrients from ingredients
      double totalEnergy = 0, totalProtein = 0, totalCarbs = 0, totalFat = 0, totalFiber = 0;
      double totalIron = 0, totalMagnesium = 0, totalCalcium = 0, totalPotassium = 0, totalSodium = 0, totalVitaminC = 0;

      final ingredientsJson = _col(cols, idx, 'ingredients');
      if (ingredientsJson.isNotEmpty) {
        try {
          final List<dynamic> items = json.decode(ingredientsJson);
          for (final item in items) {
            final ingCsvId = (item['id']?.toString() ?? '').trim();
            if (ingCsvId.isEmpty) {
              continue;
            }

            final quantity = (item['quantity'] as num?)?.toDouble() ?? 0;

            // Always add the ingredient to the recipe
            await db.addRecipeIngredient(
              RecipeIngredientsCompanion.insert(
                id: _uuid.v4(),
                recipeId: idStr,
                ingredientId: ingCsvId,
                quantity: quantity,
                servingUnit: Value(item['serving_unit']?.toString()),
              ),
            );

            // If nutrient data is available, add it to the total
            final ingredient = ingredientMap[ingCsvId];
            if (ingredient != null && ingredient.servingSize != null && ingredient.servingSize! > 0) {
              final ratio = quantity / ingredient.servingSize!;
              totalEnergy += (ingredient.energy ?? 0) * ratio;
              totalProtein += (ingredient.protein ?? 0) * ratio;
              totalCarbs += (ingredient.carbs ?? 0) * ratio;
              totalFat += (ingredient.fat ?? 0) * ratio;
              totalFiber += (ingredient.fiber ?? 0) * ratio;
              totalIron += (ingredient.ironMg ?? 0) * ratio;
              totalMagnesium += (ingredient.magnesiumMg ?? 0) * ratio;
              totalCalcium += (ingredient.calciumMg ?? 0) * ratio;
              totalPotassium += (ingredient.potassiumMg ?? 0) * ratio;
              totalSodium += (ingredient.sodiumMg ?? 0) * ratio;
              totalVitaminC += (ingredient.vitaminCMg ?? 0) * ratio;
            }
          }
        } catch (e) {
          // Ignore malformed JSON
        }
      }

      await db.upsertRecipe(
        RecipesCompanion.insert(
          id: idStr,
          name: name,
          serves: _intV(_col(cols, idx, 'serves')),
          instructions: Value(_col(cols, idx, 'instructions')),
          mealType: Value(_col(cols, idx, 'meal_type')),
          isVegetarian: Value(_boolV(_col(cols, idx, 'is_vegetarian'))),
          energy: Value(totalEnergy),
          protein: Value(totalProtein),
          carbs: Value(totalCarbs),
          fat: Value(totalFat),
          fiber: Value(totalFiber),
          ironMg: Value(totalIron),
          magnesiumMg: Value(totalMagnesium),
          calciumMg: Value(totalCalcium),
          potassiumMg: Value(totalPotassium),
          sodiumMg: Value(totalSodium),
          vitaminCMg: Value(totalVitaminC),
        ),
      );
    }
  }

  Future<void> _seedWeeklyPlan({bool clearExisting = false}) async {
    if (clearExisting) {
      await db.delete(db.weeklyPlanItems).go();
    }
    final csvStr = await rootBundle.loadString('assets/data/weekly_plan.csv');
    final rows = const CsvToListConverter(eol: '\n', shouldParseNumbers: false).convert(csvStr);
    if (rows.isEmpty) return;
    final idx = _buildIndex(rows.first);

    final recipeIds = (await db.getAllRecipes()).map((r) => r.id).toSet();

    for (final row in rows.skip(1)) {
      final cols = (row as List).map((e) => (e?.toString() ?? '').trim()).toList();
      final day = _col(cols, idx, 'day');
      final mealType = _col(cols, idx, 'meal_type');
      final idSetRaw = _col(cols, idx, 'recipe_ids');
      final ids = idSetRaw.replaceAll('{', '').replaceAll('}', '').split(',').map((e) => e.trim()).where((e) => e.isNotEmpty);
      for (final recipeId in ids) {
        if (!recipeIds.contains(recipeId)) continue; // skip bad IDs
        await db.addWeeklyPlanItem(
          WeeklyPlanItemsCompanion.insert(
            id: _uuid.v4(),
            day: day.isEmpty ? 'Sunday' : day,
            mealType: mealType.isEmpty ? 'breakfast' : mealType,
            recipeId: recipeId,
          ),
        );
      }
    }
  }

  Value<int?> _intV(String? s) => Value(s == null || s.isEmpty ? null : int.tryParse(s));
  Value<double?> _doubleV(String? s) => Value(s == null || s.isEmpty ? null : double.tryParse(s));
  Value<DateTime?> _dateV(String? s) => Value(s == null || s.isEmpty ? null : DateTime.tryParse(s));
  bool _boolV(String? s) => (s ?? '').toLowerCase().startsWith('t');
}
