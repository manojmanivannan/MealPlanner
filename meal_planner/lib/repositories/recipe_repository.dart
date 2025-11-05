import '../data/app_database.dart';

class RecipeRepository {
  RecipeRepository(this.db);
  final AppDatabase db;

  Future<List<Recipe>> getAll() => db.getAllRecipes();
  Future<List<RecipeIngredient>> getIngredients(String recipeId) => db.getRecipeIngredientsByRecipe(recipeId);
  Future<void> delete(String id) => db.deleteRecipe(id);
  Future<void> deleteMany(List<String> ids) => db.deleteRecipes(ids);
  Future<void> removeIngredients(List<String> ingredientIds) => db.removeIngredientsFromRecipes(ingredientIds);
}
