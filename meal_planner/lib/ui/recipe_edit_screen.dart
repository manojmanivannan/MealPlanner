import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:drift/drift.dart' as d;
import 'package:uuid/uuid.dart';

import '../data/app_database.dart';
import '../providers.dart';
import 'ingredient_edit_screen.dart';
import 'form_fields.dart';

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
      await db.updateRecipe(
        widget.recipeId,
        RecipesCompanion(
          name: d.Value(_nameController.text),
          serves: d.Value(int.tryParse(_servesController.text) ?? 1),
          instructions: d.Value(_instructionsController.text),
        ),
      );
      ref.invalidate(recipesProvider);
      ref.invalidate(recipeDetailProvider(widget.recipeId));
      if (mounted) {
        Navigator.of(context).pop();
      }
    }
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
          return Form(
            key: _formKey,
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(16.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  TextFormField(
                    controller: _nameController,
                    decoration: const InputDecoration(labelText: 'Recipe Name'),
                    validator: (value) => (value?.isEmpty ?? true) ? 'Please enter a name' : null,
                  ),
                  TextFormField(
                    controller: _servesController,
                    decoration: const InputDecoration(labelText: 'Serves'),
                    keyboardType: TextInputType.number,
                  ),
                  TextFormField(
                    controller: _instructionsController,
                    decoration: const InputDecoration(labelText: 'Instructions'),
                    maxLines: null,
                  ),
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
                    return ListTile(
                      title: Text(item.ingredient?.name ?? 'Unknown Ingredient'),
                      subtitle: Text('${item.usage.quantity} ${item.usage.servingUnit ?? ''}'),
                      trailing: IconButton(
                        icon: const Icon(Icons.delete, color: Colors.red),
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
      builder: (ctx) {
        return ListView.builder(
          itemCount: allIngredients.length,
          itemBuilder: (context, index) {
            final ing = allIngredients[index];
            return ListTile(
              title: Text(ing.name),
              onTap: () => Navigator.of(ctx).pop(ing),
            );
          },
        );
      },
    );

    if (selectedIngredient != null) {
      final quantityController = TextEditingController();
      String? selectedUnit = servingUnitOptions.first;

      final confirmed = await showDialog<bool>(
        context: context,
        builder: (ctx) => AlertDialog(
          title: Text('Add ${selectedIngredient.name}'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: quantityController,
                decoration: const InputDecoration(labelText: 'Quantity'),
                keyboardType: TextInputType.number,
              ),
              ServingUnitDropdown(
                selectedValue: selectedUnit,
                onChanged: (value) => selectedUnit = value,
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
          servingUnit: d.Value(selectedUnit),
        ));
        ref.invalidate(recipeDetailProvider(widget.recipeId));
      }
    }
  }

  Future<void> _editIngredientUsage(BuildContext context, WidgetRef ref, RecipeIngredient usage, Ingredient? ingredient) async {
    final db = ref.read(databaseProvider);
    final quantityController = TextEditingController(text: usage.quantity.toString());
    String? selectedUnit = usage.servingUnit;

    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(ingredient?.name ?? 'Edit Usage'),
            if (ingredient != null)
              IconButton(
                icon: const Icon(Icons.edit, color: Colors.blue),
                onPressed: () {
                  Navigator.of(ctx).pop(); // Close the dialog
                  Navigator.of(context).push(MaterialPageRoute(
                    builder: (_) => IngredientEditScreen(ingredientId: ingredient.id),
                  ));
                },
              ),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: quantityController,
              decoration: const InputDecoration(labelText: 'Quantity'),
              keyboardType: TextInputType.number,
            ),
            ServingUnitDropdown(
              selectedValue: selectedUnit,
              onChanged: (value) => selectedUnit = value,
            ),
          ],
        ),
        actions: [
          TextButton(child: const Text('Cancel'), onPressed: () => Navigator.of(ctx).pop(false)),
          TextButton(child: const Text('Save'), onPressed: () => Navigator.of(ctx).pop(true)),
        ],
      ),
    );

    if (confirmed == true && quantityController.text.isNotEmpty) {
      await db.upsertRecipeIngredient(RecipeIngredientsCompanion(
        id: d.Value(usage.id),
        recipeId: d.Value(usage.recipeId),
        ingredientId: d.Value(usage.ingredientId),
        quantity: d.Value(double.tryParse(quantityController.text) ?? 0),
        servingUnit: d.Value(selectedUnit),
      ));
      ref.invalidate(recipeDetailProvider(widget.recipeId));
    }
  }

  Future<void> _removeIngredient(WidgetRef ref, String usageId) async {
    final db = ref.read(databaseProvider);
    await db.deleteRecipeIngredient(usageId);
    ref.invalidate(recipeDetailProvider(widget.recipeId));
  }
}
