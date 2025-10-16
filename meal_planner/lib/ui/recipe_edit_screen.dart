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

  _CalculatedNutrients({
    this.energy = 0.0,
    this.protein = 0.0,
    this.carbs = 0.0,
    this.fat = 0.0,
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

    for (final item in ingredients) {
      final ingredient = item.ingredient;
      final usage = item.usage;

      if (ingredient != null && ingredient.servingSize != null && ingredient.servingSize! > 0) {
        final ratio = usage.quantity / ingredient.servingSize!;
        totalEnergy += (ingredient.energy ?? 0) * ratio;
        totalProtein += (ingredient.protein ?? 0) * ratio;
        totalCarbs += (ingredient.carbs ?? 0) * ratio;
        totalFat += (ingredient.fat ?? 0) * ratio;
      }
    }

    return _CalculatedNutrients(
      energy: totalEnergy,
      protein: totalProtein,
      carbs: totalCarbs,
      fat: totalFat,
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
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(16.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
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
                  ...data.ingredients.map((item) {
                    final color = _colorFromString(item.ingredient?.name ?? '');
                    return ListTile(
                      leading: CircleAvatar(
                        backgroundColor: color,
                        child: Text((item.ingredient?.name ?? '?').substring(0, 1), style: const TextStyle(color: Colors.white)),
                      ),
                      title: Text(item.ingredient?.name ?? 'Unknown Ingredient'),
                      subtitle: Text('${item.usage.quantity} ${item.ingredient?.servingUnit ?? ''}'),
                      trailing: IconButton(
                        icon: Icon(Icons.delete, color: Theme.of(context).colorScheme.error),
                        onPressed: () => _removeIngredient(ref, item.usage.id),
                      ),
                      onTap: () => _editIngredientUsage(context, ref, item.usage, item.ingredient),
                    );
                  }),
                ],
              ),
            ),
          );
        },
      ),
    );
  }

  Future<void> _addIngredient(BuildContext context, WidgetRef ref) async {
    final db = ref.read(databaseProvider);
    final allIngredients = await db.getAllIngredients();

    final selectedIngredient = await showModalBottomSheet<Ingredient>(
      context: context,
      isScrollControlled: true,
      builder: (ctx) {
        return DraggableScrollableSheet(
          expand: false,
          builder: (context, scrollController) {
            return _IngredientSelectionSheet(
              ingredients: allIngredients,
              scrollController: scrollController,
            );
          },
        );
      },
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

class _IngredientSelectionSheet extends StatefulWidget {
  final List<Ingredient> ingredients;
  final ScrollController scrollController;

  const _IngredientSelectionSheet({required this.ingredients, required this.scrollController});

  @override
  State<_IngredientSelectionSheet> createState() => _IngredientSelectionSheetState();
}

class _IngredientSelectionSheetState extends State<_IngredientSelectionSheet> {
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

    return Column(
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
            controller: widget.scrollController,
            itemCount: grouped.length,
            itemBuilder: (context, index) {
              final letter = grouped.keys.elementAt(index);
              final ingredientsInGroup = grouped[letter]!;
              return ExpansionTile(
                title: Text(letter, style: Theme.of(context).textTheme.titleLarge),
                initiallyExpanded: true,
                children: ingredientsInGroup.map((ing) {
                  return ListTile(
                    title: Text(ing.name),
                    onTap: () => Navigator.of(context).pop(ing),
                  );
                }).toList(),
              );
            },
          ),
        ),
      ],
    );
  }
}
