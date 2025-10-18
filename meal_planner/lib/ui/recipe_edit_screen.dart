import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:drift/drift.dart' as d;
import 'package:uuid/uuid.dart';

import '../data/app_database.dart';
import '../providers.dart';
import 'ingredient_edit_screen.dart';
import 'form_fields.dart';

Color _colorFromString(String str) {
  return Colors.primaries[str.hashCode % Colors.primaries.length];
}

class _CalculatedNutrients {
  final double energy;
  final double protein;
  final double carbs;
  final double fat;
  final double ironMg;
  final double magnesiumMg;
  final double calciumMg;
  final double potassiumMg;
  final double sodiumMg;
  final double vitaminCMg;

  _CalculatedNutrients({
    this.energy = 0.0,
    this.protein = 0.0,
    this.carbs = 0.0,
    this.fat = 0.0,
    this.ironMg = 0.0,
    this.magnesiumMg = 0.0,
    this.calciumMg = 0.0,
    this.potassiumMg = 0.0,
    this.sodiumMg = 0.0,
    this.vitaminCMg = 0.0,
  });
}

class RecipeEditScreen extends ConsumerStatefulWidget {
  final String recipeId;

  const RecipeEditScreen({super.key, required this.recipeId});

  @override
  ConsumerState<RecipeEditScreen> createState() => _RecipeEditScreenState();
}

class _RecipeEditScreenState extends ConsumerState<RecipeEditScreen> {
  final _formKey = GlobalKey<FormState>();
  late TextEditingController _nameController;
  late TextEditingController _servesController;
  late TextEditingController _instructionsController;

  @override
  void initState() {
    super.initState();
    final recipe = ref.read(recipeDetailProvider(widget.recipeId)).asData?.value.recipe;
    _nameController = TextEditingController(text: recipe?.name ?? '');
    _servesController = TextEditingController(text: recipe?.serves?.toString() ?? '1');
    _instructionsController = TextEditingController(text: recipe?.instructions ?? '');
  }

  Future<void> _save() async {
    if (_formKey.currentState!.validate()) {
      final db = ref.read(databaseProvider);
      final recipeData = await ref.read(recipeDetailProvider(widget.recipeId).future);
      final nutrients = _calculateNutrients(recipeData.ingredients);

      await db.updateRecipe(
        widget.recipeId,
        RecipesCompanion(
          name: d.Value(_nameController.text),
          serves: d.Value(int.tryParse(_servesController.text) ?? 1),
          instructions: d.Value(_instructionsController.text),
          energy: d.Value(nutrients.energy),
          protein: d.Value(nutrients.protein),
          carbs: d.Value(nutrients.carbs),
          fat: d.Value(nutrients.fat),
          ironMg: d.Value(nutrients.ironMg),
          magnesiumMg: d.Value(nutrients.magnesiumMg),
          calciumMg: d.Value(nutrients.calciumMg),
          potassiumMg: d.Value(nutrients.potassiumMg),
          sodiumMg: d.Value(nutrients.sodiumMg),
          vitaminCMg: d.Value(nutrients.vitaminCMg),
        ),
      );
      ref.invalidate(recipesProvider);
      ref.invalidate(recipeDetailProvider(widget.recipeId));
      if (mounted) {
        Navigator.of(context).pop();
      }
    }
  }

  _CalculatedNutrients _calculateNutrients(List<({RecipeIngredient usage, Ingredient? ingredient})> ingredients) {
    double totalEnergy = 0.0;
    double totalProtein = 0.0;
    double totalCarbs = 0.0;
    double totalFat = 0.0;
    double totalIron = 0.0;
    double totalMagnesium = 0.0;
    double totalCalcium = 0.0;
    double totalPotassium = 0.0;
    double totalSodium = 0.0;
    double totalVitaminC = 0.0;

    for (final item in ingredients) {
      final ingredient = item.ingredient;
      final usage = item.usage;

      if (ingredient != null && ingredient.servingSize != null && ingredient.servingSize! > 0) {
        final ratio = usage.quantity / ingredient.servingSize!;
        totalEnergy += (ingredient.energy ?? 0) * ratio;
        totalProtein += (ingredient.protein ?? 0) * ratio;
        totalCarbs += (ingredient.carbs ?? 0) * ratio;
        totalFat += (ingredient.fat ?? 0) * ratio;
        totalIron += (ingredient.ironMg ?? 0) * ratio;
        totalMagnesium += (ingredient.magnesiumMg ?? 0) * ratio;
        totalCalcium += (ingredient.calciumMg ?? 0) * ratio;
        totalPotassium += (ingredient.potassiumMg ?? 0) * ratio;
        totalSodium += (ingredient.sodiumMg ?? 0) * ratio;
        totalVitaminC += (ingredient.vitaminCMg ?? 0) * ratio;
      }
    }

    return _CalculatedNutrients(
      energy: totalEnergy,
      protein: totalProtein,
      carbs: totalCarbs,
      fat: totalFat,
      ironMg: totalIron,
      magnesiumMg: totalMagnesium,
      calciumMg: totalCalcium,
      potassiumMg: totalPotassium,
      sodiumMg: totalSodium,
      vitaminCMg: totalVitaminC,
    );
  }

  Widget _buildNutrientInfo(_CalculatedNutrients nutrients) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(8.0),
        child: Column(
          children: [
            ListTile(
              title: const Text('Energy'),
              trailing: Text('${nutrients.energy.toStringAsFixed(1)} kcal'),
            ),
            ListTile(
              title: const Text('Protein'),
              trailing: Text('${nutrients.protein.toStringAsFixed(1)} g'),
            ),
            ListTile(
              title: const Text('Carbohydrates'),
              trailing: Text('${nutrients.carbs.toStringAsFixed(1)} g'),
            ),
            ListTile(
              title: const Text('Fat'),
              trailing: Text('${nutrients.fat.toStringAsFixed(1)} g'),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildMicroNutrientInfo(_CalculatedNutrients nutrients) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(8.0),
        child: Column(
          children: [
            ListTile(
              title: const Text('Iron'),
              trailing: Text('${nutrients.ironMg.toStringAsFixed(1)} mg'),
            ),
            ListTile(
              title: const Text('Magnesium'),
              trailing: Text('${nutrients.magnesiumMg.toStringAsFixed(1)} mg'),
            ),
            ListTile(
              title: const Text('Calcium'),
              trailing: Text('${nutrients.calciumMg.toStringAsFixed(1)} mg'),
            ),
            ListTile(
              title: const Text('Potassium'),
              trailing: Text('${nutrients.potassiumMg.toStringAsFixed(1)} mg'),
            ),
            ListTile(
              title: const Text('Sodium'),
              trailing: Text('${nutrients.sodiumMg.toStringAsFixed(1)} mg'),
            ),
            ListTile(
              title: const Text('Vitamin C'),
              trailing: Text('${nutrients.vitaminCMg.toStringAsFixed(1)} mg'),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final recipeAsync = ref.watch(recipeDetailProvider(widget.recipeId));

    return Scaffold(
      appBar: AppBar(
        title: const Text('Edit Recipe'),
        actions: [
          IconButton(
            icon: const Icon(Icons.check),
            onPressed: _save,
          ),
        ],
      ),
      body: recipeAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, st) => Center(child: Text('Error: $e')),
        data: (data) {
          final nutrients = _calculateNutrients(data.ingredients);
          return Form(
            key: _formKey,
            child: CustomScrollView(
              slivers: [
                SliverPadding(
                  padding: const EdgeInsets.all(16.0),
                  sliver: SliverList(
                    delegate: SliverChildListDelegate([
                      TextFormField(
                        controller: _nameController,
                        decoration: const InputDecoration(labelText: 'Recipe Name', border: OutlineInputBorder()),
                        validator: (value) => (value?.isEmpty ?? true) ? 'Please enter a name' : null,
                      ),
                      const SizedBox(height: 12),
                      TextFormField(
                        controller: _servesController,
                        decoration: const InputDecoration(labelText: 'Serves', border: OutlineInputBorder()),
                        keyboardType: TextInputType.number,
                      ),
                      const SizedBox(height: 12),
                      TextFormField(
                        controller: _instructionsController,
                        decoration: const InputDecoration(labelText: 'Instructions', border: OutlineInputBorder()),
                        maxLines: 5,
                      ),
                      const SizedBox(height: 24),
                      Text('Nutritional Information', style: Theme.of(context).textTheme.titleLarge),
                      const Divider(),
                      _buildNutrientInfo(nutrients),
                      const SizedBox(height: 24),
                      Text('Micronutrients', style: Theme.of(context).textTheme.titleLarge),
                      const Divider(),
                      _buildMicroNutrientInfo(nutrients),
                      const SizedBox(height: 24),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text('Ingredients', style: Theme.of(context).textTheme.titleLarge),
                          IconButton(
                            icon: const Icon(Icons.add),
                            onPressed: () => _addIngredient(context, ref),
                          ),
                        ],
                      ),
                      const Divider(),
                    ]),
                  ),
                ),
                SliverList(
                  delegate: SliverChildBuilderDelegate(
                    (context, index) {
                      final item = data.ingredients[index];
                      final color = _colorFromString(item.ingredient?.name ?? '');
                      return ListTile(
                        leading: CircleAvatar(
                          backgroundColor: color,
                          child: Text((item.ingredient?.name ?? '?').substring(0, 1),
                              style: const TextStyle(color: Colors.white)),
                        ),
                        title: Text(item.ingredient?.name ?? 'Unknown Ingredient'),
                        subtitle: Text('${item.usage.quantity} ${item.ingredient?.servingUnit ?? ''}'),
                        trailing: IconButton(
                          icon: Icon(Icons.delete, color: Theme.of(context).colorScheme.error),
                          onPressed: () => _removeIngredient(ref, item.usage.id),
                        ),
                        onTap: () => _editIngredientUsage(context, ref, item.usage, item.ingredient),
                      );
                    },
                    childCount: data.ingredients.length,
                  ),
                ),
              ],
            ),
          );
        },
      ),
    );
  }

  Future<void> _addIngredient(BuildContext context, WidgetRef ref) async {
    final db = ref.read(databaseProvider);
    final allIngredients = await db.getAllIngredients();

    final selectedIngredient = await Navigator.of(context).push<Ingredient>(
      MaterialPageRoute(
        builder: (ctx) {
          return _IngredientSelectionScreen(ingredients: allIngredients);
        },
      ),
    );

    if (selectedIngredient != null) {
      final quantityController = TextEditingController();

      final confirmed = await showDialog<bool>(
        context: context,
        builder: (ctx) => AlertDialog(
          title: Text('Add ${selectedIngredient.name}'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: quantityController,
                decoration: InputDecoration(labelText: 'Quantity', suffixText: selectedIngredient.servingUnit),
                keyboardType: TextInputType.number,
              ),
            ],
          ),
          actions: [
            TextButton(child: const Text('Cancel'), onPressed: () => Navigator.of(ctx).pop(false)),
            TextButton(child: const Text('Add'), onPressed: () => Navigator.of(ctx).pop(true)),
          ],
        ),
      );

      if (confirmed == true && quantityController.text.isNotEmpty) {
        await db.addRecipeIngredient(RecipeIngredientsCompanion.insert(
          id: const Uuid().v4(),
          recipeId: widget.recipeId,
          ingredientId: selectedIngredient.id,
          quantity: double.tryParse(quantityController.text) ?? 0,
        ));
        ref.invalidate(recipeDetailProvider(widget.recipeId));
      }
    }
  }

  Future<void> _editIngredientUsage(BuildContext context, WidgetRef ref, RecipeIngredient usage, Ingredient? ingredient) async {
    final db = ref.read(databaseProvider);
    final quantityController = TextEditingController(text: usage.quantity.toString());

    final result = await showDialog<bool?>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Flexible(child: Text(ingredient?.name ?? 'Edit Usage', overflow: TextOverflow.ellipsis)),
            if (ingredient != null)
              IconButton(
                icon: const Icon(Icons.edit, color: Colors.blue),
                onPressed: () {
                  Navigator.of(ctx).pop(null); // Indicates edit action
                },
              ),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: quantityController,
              decoration: InputDecoration(labelText: 'Quantity', suffixText: ingredient?.servingUnit),
              keyboardType: TextInputType.number,
            ),
          ],
        ),
        actions: [
          TextButton(child: const Text('Cancel'), onPressed: () => Navigator.of(ctx).pop(false)),
          TextButton(child: const Text('Save'), onPressed: () => Navigator.of(ctx).pop(true)),
        ],
      ),
    );

    if (result == null) {
      // User wants to edit the ingredient
      if (ingredient != null) {
        await Navigator.of(context).push(MaterialPageRoute(
          builder: (_) => IngredientEditScreen(ingredientId: ingredient.id),
        ));
        ref.invalidate(recipeDetailProvider(widget.recipeId));
      }
    } else if (result == true) {
      // User wants to save the quantity
      if (quantityController.text.isNotEmpty) {
        await db.upsertRecipeIngredient(RecipeIngredientsCompanion(
          id: d.Value(usage.id),
          recipeId: d.Value(usage.recipeId),
          ingredientId: d.Value(usage.ingredientId),
          quantity: d.Value(double.tryParse(quantityController.text) ?? 0),
        ));
        ref.invalidate(recipeDetailProvider(widget.recipeId));
      }
    }
  }

  Future<void> _removeIngredient(WidgetRef ref, String usageId) async {
    final db = ref.read(databaseProvider);
    await db.deleteRecipeIngredient(usageId);
    ref.invalidate(recipeDetailProvider(widget.recipeId));
  }
}

class _IngredientSelectionScreen extends StatefulWidget {
  final List<Ingredient> ingredients;

  const _IngredientSelectionScreen({required this.ingredients});

  @override
  State<_IngredientSelectionScreen> createState() => _IngredientSelectionScreenState();
}

class _IngredientSelectionScreenState extends State<_IngredientSelectionScreen> {
  final _searchController = TextEditingController();
  String _searchTerm = '';

  @override
  void initState() {
    super.initState();
    _searchController.addListener(() => setState(() => _searchTerm = _searchController.text));
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final filteredIngredients = widget.ingredients.where((ing) {
      return _searchTerm.isEmpty || ing.name.toLowerCase().contains(_searchTerm.toLowerCase());
    }).toList();

    filteredIngredients.sort((a, b) => a.name.toLowerCase().compareTo(b.name.toLowerCase()));

    final grouped = <String, List<Ingredient>>{};
    for (final ing in filteredIngredients) {
      final letter = ing.name.substring(0, 1).toUpperCase();
      (grouped[letter] ??= []).add(ing);
    }
    final sortedKeys = grouped.keys.toList()..sort();

    final flatList = [];
    for (var key in sortedKeys) {
      flatList.add(key);
      flatList.addAll(grouped[key]!);
    }

    return Scaffold(
      appBar: AppBar(
        title: const Text('Select Ingredient'),
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(8.0),
            child: TextField(
              controller: _searchController,
              decoration: const InputDecoration(
                labelText: 'Search Ingredients',
                border: OutlineInputBorder(),
                prefixIcon: Icon(Icons.search),
              ),
            ),
          ),
          Expanded(
            child: ListView.builder(
              itemCount: flatList.length,
              itemBuilder: (context, index) {
                final item = flatList[index];
                if (item is String) {
                  return Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 8.0),
                    child: Text(item, style: Theme.of(context).textTheme.titleLarge),
                  );
                }
                final ing = item as Ingredient;
                return ListTile(
                  title: Text(ing.name),
                  onTap: () => Navigator.of(context).pop(ing),
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}
