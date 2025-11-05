import '../data/app_database.dart';

class IngredientRepository {
  IngredientRepository(this.db);
  final AppDatabase db;

  Future<List<Ingredient>> getAll() => db.getAllIngredients();
  Future<void> delete(String id) => db.deleteIngredient(id);
  Future<void> deleteMany(List<String> ids) => db.deleteIngredients(ids);
  Future<List<Recipe>> getRecipesUsingIngredient(String ingredientId) => 
      db.getRecipesUsingIngredient(ingredientId);
  Future<List<Recipe>> getRecipesUsingIngredients(List<String> ingredientIds) => 
      db.getRecipesUsingIngredients(ingredientIds);
}
