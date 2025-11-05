import 'dart:io';

import 'package:drift/drift.dart';
import 'package:drift/native.dart';
import 'package:path/path.dart' as p;
import 'package:path_provider/path_provider.dart';

part 'app_database.g.dart';

class Ingredients extends Table {
  TextColumn get id => text()(); // CSV numeric id as string
  TextColumn get name => text()();
  TextColumn get category => text().nullable()();
  IntColumn get shelfLifeDays => integer().nullable()();
  BoolColumn get available => boolean().withDefault(const Constant(false))();
  DateTimeColumn get lastAvailable => dateTime().nullable()();
  TextColumn get servingUnit => text().nullable()();
  RealColumn get servingSize => real().nullable()();
  RealColumn get protein => real().nullable()();
  RealColumn get carbs => real().nullable()();
  RealColumn get fat => real().nullable()();
  RealColumn get fiber => real().nullable()();
  RealColumn get energy => real().nullable()();
  RealColumn get ironMg => real().nullable()();
  RealColumn get magnesiumMg => real().nullable()();
  RealColumn get calciumMg => real().nullable()();
  RealColumn get potassiumMg => real().nullable()();
  RealColumn get sodiumMg => real().nullable()();
  RealColumn get vitaminCMg => real().nullable()();

  @override
  Set<Column<Object>>? get primaryKey => {id};
}

class Recipes extends Table {
  TextColumn get id => text()(); // CSV numeric id as string
  TextColumn get name => text()();
  IntColumn get serves => integer().nullable()();
  TextColumn get instructions => text().nullable()();
  TextColumn get mealType => text().nullable()();
  BoolColumn get isVegetarian => boolean().nullable()();
  RealColumn get protein => real().nullable()();
  RealColumn get carbs => real().nullable()();
  RealColumn get fat => real().nullable()();
  RealColumn get fiber => real().nullable()();
  RealColumn get energy => real().nullable()();
  RealColumn get ironMg => real().nullable()();
  RealColumn get magnesiumMg => real().nullable()();
  RealColumn get calciumMg => real().nullable()();
  RealColumn get potassiumMg => real().nullable()();
  RealColumn get sodiumMg => real().nullable()();
  RealColumn get vitaminCMg => real().nullable()();

  @override
  Set<Column<Object>>? get primaryKey => {id};
}

class RecipeIngredients extends Table {
  TextColumn get id => text()(); // synthetic id
  TextColumn get recipeId => text().references(Recipes, #id)();
  TextColumn get ingredientId => text().references(Ingredients, #id)();
  RealColumn get quantity => real()();
  TextColumn get servingUnit => text().nullable()();

  @override
  Set<Column<Object>>? get primaryKey => {id};
}

class WeeklyPlanItems extends Table {
  TextColumn get id => text()();
  TextColumn get day => text()(); // Sunday..Saturday
  TextColumn get mealType => text()(); // pre_breakfast, breakfast, lunch, snack, dinner
  TextColumn get recipeId => text().references(Recipes, #id)();

  @override
  Set<Column<Object>>? get primaryKey => {id};
}

class KeyValues extends Table {
  TextColumn get key => text()();
  TextColumn get value => text().nullable()();

  @override
  Set<Column<Object>>? get primaryKey => {key};
}

@DriftDatabase(tables: [Ingredients, Recipes, RecipeIngredients, WeeklyPlanItems, KeyValues])
class AppDatabase extends _$AppDatabase {
  AppDatabase() : super(_openConnection());
  AppDatabase.connect(DatabaseConnection connection) : super(connection);

  @override
  int get schemaVersion => 1;

  // Ingredients DAO-like helpers
  Future<List<Ingredient>> getAllIngredients() => select(ingredients).get();
  Future<void> upsertIngredient(IngredientsCompanion data) => into(ingredients).insertOnConflictUpdate(data);
  Future<void> deleteIngredient(String id) => (delete(ingredients)..where((tbl) => tbl.id.equals(id))).go();
  Future<void> deleteIngredients(List<String> ids) => (delete(ingredients)..where((tbl) => tbl.id.isIn(ids))).go();
  Future<List<Recipe>> getRecipesUsingIngredient(String ingredientId) =>
      (select(recipes)..where((r) => existsQuery(
        select(recipeIngredients)
          ..where((ri) => ri.recipeId.equalsExp(r.id) & ri.ingredientId.equals(ingredientId))
      ))).get();

  Future<List<Recipe>> getRecipesUsingIngredients(List<String> ingredientIds) =>
      (select(recipes)..where((r) => existsQuery(
        select(recipeIngredients)
          ..where((ri) => ri.recipeId.equalsExp(r.id) & ri.ingredientId.isIn(ingredientIds))
      ))).get();

  // Recipes helpers
  Future<List<Recipe>> getAllRecipes() => select(recipes).get();
  Future<String> getRecipeName(String recipeId) async {
    final recipe = await (select(recipes)..where((tbl) => tbl.id.equals(recipeId))).getSingle();
    return recipe.name;
  }
  Future<void> upsertRecipe(RecipesCompanion data) => into(recipes).insertOnConflictUpdate(data);
  Future<void> deleteRecipe(String id) => transaction(() async {
        await (delete(recipeIngredients)..where((tbl) => tbl.recipeId.equals(id))).go();
        await (delete(recipes)..where((tbl) => tbl.id.equals(id))).go();
      });
  Future<void> deleteRecipes(List<String> ids) => transaction(() async {
        await (delete(recipeIngredients)..where((tbl) => tbl.recipeId.isIn(ids))).go();
        await (delete(recipes)..where((tbl) => tbl.id.isIn(ids))).go();
      });
  Future<void> updateRecipe(String id, RecipesCompanion data) async {
    await (update(recipes)..where((t) => t.id.equals(id))).write(data);
  }

  // RecipeIngredients helpers
  Future<void> addRecipeIngredient(RecipeIngredientsCompanion data) => into(recipeIngredients).insertOnConflictUpdate(data);
  Future<List<RecipeIngredient>> getRecipeIngredientsByRecipe(String recipeId) => (select(recipeIngredients)..where((t) => t.recipeId.equals(recipeId))).get();
  Future<void> deleteRecipeIngredient(String id) async {
    await (delete(recipeIngredients)..where((t) => t.id.equals(id))).go();
  }
  Future<void> removeIngredientsFromRecipes(List<String> ingredientIds) async {
    await (delete(recipeIngredients)..where((t) => t.ingredientId.isIn(ingredientIds))).go();
  }
  Future<void> upsertRecipeIngredient(RecipeIngredientsCompanion data) => into(recipeIngredients).insertOnConflictUpdate(data);

  // WeeklyPlan helpers
  Future<void> addWeeklyPlanItem(WeeklyPlanItemsCompanion data) => into(weeklyPlanItems).insertOnConflictUpdate(data);
  Future<List<WeeklyPlanItem>> getWeeklyPlanFor(String day, String mealType) => (select(weeklyPlanItems)
        ..where((t) => t.day.equals(day) & t.mealType.equals(mealType)))
      .get();

  // KeyValues helpers
  Future<String?> getKey(String key) async {
    final row = await (select(keyValues)..where((t) => t.key.equals(key))).getSingleOrNull();
    return row?.value;
  }
  Future<void> setKey(String key, String value) => into(keyValues).insertOnConflictUpdate(KeyValuesCompanion.insert(key: key, value: Value(value)));
}

LazyDatabase _openConnection() {
  return LazyDatabase(() async {
    final dir = await getApplicationDocumentsDirectory();
    final file = File(p.join(dir.path, 'meal_planner.sqlite'));
    return NativeDatabase(file);
  });
}

AppDatabase makeInMemoryDatabase() {
  final exec = NativeDatabase.memory();
  return AppDatabase.connect(DatabaseConnection(exec));
}
