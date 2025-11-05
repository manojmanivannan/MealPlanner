import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:drift/drift.dart' as d;
import 'package:uuid/uuid.dart';

import '../data/app_database.dart';
import '../providers.dart';
import 'form_fields.dart';

class IngredientEditScreen extends ConsumerWidget {
  final String? ingredientId;
  final String? ingredientName;

  const IngredientEditScreen({super.key, this.ingredientId, this.ingredientName});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final ingredientAsync = ingredientId != null ? ref.watch(ingredientDetailProvider(ingredientId!)) : null;

    if (ingredientId != null && ingredientAsync != null) {
      return ingredientAsync.when(
        loading: () => Scaffold(
          appBar: AppBar(title: const Text('Edit Ingredient')),
          body: const Center(child: CircularProgressIndicator()),
        ),
        error: (e, st) => Scaffold(
          appBar: AppBar(title: const Text('Edit Ingredient')),
          body: Center(child: Text('Error: $e')),
        ),
        data: (ingredient) => _IngredientEditForm(ingredient: ingredient),
      );
    } else {
      return _IngredientEditForm(ingredient: Ingredient(id: const Uuid().v4(), name: ingredientName ?? '', available: false));
    }
  }
}

class _IngredientEditForm extends ConsumerStatefulWidget {
  final Ingredient ingredient;

  const _IngredientEditForm({required this.ingredient});

  @override
  ConsumerState<_IngredientEditForm> createState() => _IngredientEditFormState();
}

class _IngredientEditFormState extends ConsumerState<_IngredientEditForm> {
  final _formKey = GlobalKey<FormState>();
  late TextEditingController _nameController;
  late TextEditingController _energyController;
  late TextEditingController _proteinController;
  late TextEditingController _carbsController;
  late TextEditingController _fatController;
  late TextEditingController _servingSizeController;
  late TextEditingController _ironController;
  late TextEditingController _magnesiumController;
  late TextEditingController _calciumController;
  late TextEditingController _potassiumController;
  late TextEditingController _sodiumController;
  late TextEditingController _vitaminCController;
  String? _selectedServingUnit;
  String? _selectedCategory;
  bool _isIngredientInUse = false;
  List<Recipe> _linkedRecipes = [];

  @override
  void initState() {
    super.initState();
    _nameController = TextEditingController(text: widget.ingredient.name);
    _energyController = TextEditingController(text: widget.ingredient.energy?.toString());
    _proteinController = TextEditingController(text: widget.ingredient.protein?.toString());
    _carbsController = TextEditingController(text: widget.ingredient.carbs?.toString());
    _fatController = TextEditingController(text: widget.ingredient.fat?.toString());
    _servingSizeController = TextEditingController(text: widget.ingredient.servingSize?.toString());
    _ironController = TextEditingController(text: widget.ingredient.ironMg?.toString());
    _magnesiumController = TextEditingController(text: widget.ingredient.magnesiumMg?.toString());
    _calciumController = TextEditingController(text: widget.ingredient.calciumMg?.toString());
    _potassiumController = TextEditingController(text: widget.ingredient.potassiumMg?.toString());
    _sodiumController = TextEditingController(text: widget.ingredient.sodiumMg?.toString());
    _vitaminCController = TextEditingController(text: widget.ingredient.vitaminCMg?.toString());
    _selectedServingUnit = widget.ingredient.servingUnit;
    _selectedCategory = widget.ingredient.category;

    if (widget.ingredient.id.isNotEmpty) {
      _checkIngredientUsage();
    }

    _servingSizeController.addListener(() => setState(() {}));
    // No need to add listener for dropdown, onChanged does it.
  }

  Future<void> _checkIngredientUsage() async {
    final db = ref.read(databaseProvider);
    final recipes = await db.getRecipesUsingIngredient(widget.ingredient.id);
    setState(() {
      _isIngredientInUse = recipes.isNotEmpty;
      _linkedRecipes = recipes;
    });
  }

  String _getUnitLabel(String baseUnit) {
    final servingSize = _servingSizeController.text;
    final servingUnit = _selectedServingUnit ?? '';
    if (servingSize.isNotEmpty && servingUnit.isNotEmpty) {
      return '$baseUnit/$servingSize-$servingUnit';
    }
    return baseUnit;
  }

  Future<void> _save() async {
    if (_formKey.currentState!.validate()) {
      final db = ref.read(databaseProvider);
      final ingredientId = widget.ingredient.id;

      await db.upsertIngredient(
        IngredientsCompanion(
          id: d.Value(ingredientId),
          name: d.Value(_nameController.text),
          category: d.Value(_selectedCategory),
          servingSize: d.Value(double.tryParse(_servingSizeController.text)),
          servingUnit: d.Value(_selectedServingUnit),
          energy: d.Value(double.tryParse(_energyController.text)),
          protein: d.Value(double.tryParse(_proteinController.text)),
          carbs: d.Value(double.tryParse(_carbsController.text)),
          fat: d.Value(double.tryParse(_fatController.text)),
          ironMg: d.Value(double.tryParse(_ironController.text)),
          magnesiumMg: d.Value(double.tryParse(_magnesiumController.text)),
          calciumMg: d.Value(double.tryParse(_calciumController.text)),
          potassiumMg: d.Value(double.tryParse(_potassiumController.text)),
          sodiumMg: d.Value(double.tryParse(_sodiumController.text)),
          vitaminCMg: d.Value(double.tryParse(_vitaminCController.text)),
        ),
      );
      ref.invalidate(ingredientsProvider);
      if (widget.ingredient.id.isNotEmpty) {
        ref.invalidate(ingredientDetailProvider(widget.ingredient.id));
      }

      if (mounted) {
        Navigator.of(context).pop(ingredientId);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(widget.ingredient.id.isEmpty ? 'Create Ingredient' : 'Edit Ingredient'),
        actions: [
          IconButton(
            icon: const Icon(Icons.check),
            onPressed: _save,
          ),
        ],
      ),
      body: Form(
        key: _formKey,
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(16.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              TextFormField(
                controller: _nameController,
                decoration: const InputDecoration(labelText: 'Ingredient Name', border: OutlineInputBorder()),
                validator: (value) => (value?.isEmpty ?? true) ? 'Please enter a name' : null,
              ),
              const SizedBox(height: 12),
              IngredientCategoryDropdown(
                selectedValue: _selectedCategory,
                onChanged: (value) => setState(() => _selectedCategory = value),
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _servingSizeController,
                decoration: InputDecoration(labelText: 'Serving Size', border: OutlineInputBorder(), enabled: !_isIngredientInUse),
                keyboardType: TextInputType.number,
                enabled: !_isIngredientInUse,
              ),
              const SizedBox(height: 12),
              ServingUnitDropdown(
                selectedValue: _selectedServingUnit,
                onChanged: _isIngredientInUse ? null : (value) => setState(() => _selectedServingUnit = value),
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _energyController,
                decoration: InputDecoration(labelText: 'Energy (${_getUnitLabel('kcal')})', border: OutlineInputBorder()),
                keyboardType: TextInputType.number,
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _proteinController,
                decoration: InputDecoration(labelText: 'Protein (${_getUnitLabel('g')})', border: OutlineInputBorder()),
                keyboardType: TextInputType.number,
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _carbsController,
                decoration: InputDecoration(labelText: 'Carbohydrates (${_getUnitLabel('g')})', border: OutlineInputBorder()),
                keyboardType: TextInputType.number,
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _fatController,
                decoration: InputDecoration(labelText: 'Fat (${_getUnitLabel('g')})', border: OutlineInputBorder()),
                keyboardType: TextInputType.number,
              ),
              const SizedBox(height: 12),
              Text('Micronutrients', style: Theme.of(context).textTheme.titleLarge),
              const Divider(),
              TextFormField(
                controller: _ironController,
                decoration: InputDecoration(labelText: 'Iron (${_getUnitLabel('mg')})', border: OutlineInputBorder()),
                keyboardType: TextInputType.number,
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _magnesiumController,
                decoration: InputDecoration(labelText: 'Magnesium (${_getUnitLabel('mg')})', border: OutlineInputBorder()),
                keyboardType: TextInputType.number,
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _calciumController,
                decoration: InputDecoration(labelText: 'Calcium (${_getUnitLabel('mg')})', border: OutlineInputBorder()),
                keyboardType: TextInputType.number,
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _potassiumController,
                decoration: InputDecoration(labelText: 'Potassium (${_getUnitLabel('mg')})', border: OutlineInputBorder()),
                keyboardType: TextInputType.number,
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _sodiumController,
                decoration: InputDecoration(labelText: 'Sodium (${_getUnitLabel('mg')})', border: OutlineInputBorder()),
                keyboardType: TextInputType.number,
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _vitaminCController,
                decoration: InputDecoration(labelText: 'Vitamin C (${_getUnitLabel('mg')})', border: OutlineInputBorder()),
                keyboardType: TextInputType.number,
              ),
              if (_linkedRecipes.isNotEmpty)
                Padding(
                  padding: const EdgeInsets.only(top: 24.0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Used in Recipes', style: Theme.of(context).textTheme.titleLarge),
                      const Divider(),
                      ListView.builder(
                        shrinkWrap: true,
                        physics: const NeverScrollableScrollPhysics(),
                        itemCount: _linkedRecipes.length,
                        itemBuilder: (context, index) {
                          final recipe = _linkedRecipes[index];
                          return ListTile(
                            title: Text(recipe.name),
                          );
                        },
                      ),
                    ],
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}

final ingredientDetailProvider = FutureProvider.family<Ingredient, String>((ref, id) async {
  final db = ref.read(databaseProvider);
  return (db.select(db.ingredients)..where((t) => t.id.equals(id))).getSingle();
});
