import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:drift/drift.dart' as d;

import '../data/app_database.dart';
import '../providers.dart';
import 'form_fields.dart';

class IngredientEditScreen extends ConsumerWidget {
  final String ingredientId;

  const IngredientEditScreen({super.key, required this.ingredientId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final ingredientAsync = ref.watch(ingredientDetailProvider(ingredientId));

    return Scaffold(
      appBar: AppBar(title: const Text('Edit Ingredient')),
      body: ingredientAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, st) => Center(child: Text('Error: $e')),      
        data: (ingredient) {
          return _IngredientEditForm(ingredient: ingredient);
        },
      ),
    );
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
  String? _selectedServingUnit;

  @override
  void initState() {
    super.initState();
    _nameController = TextEditingController(text: widget.ingredient.name);
    _energyController = TextEditingController(text: widget.ingredient.energy?.toString());
    _proteinController = TextEditingController(text: widget.ingredient.protein?.toString());
    _carbsController = TextEditingController(text: widget.ingredient.carbs?.toString());
    _fatController = TextEditingController(text: widget.ingredient.fat?.toString());
    _servingSizeController = TextEditingController(text: widget.ingredient.servingSize?.toString());
    _selectedServingUnit = widget.ingredient.servingUnit;
  }

  @override
  Widget build(BuildContext context) {
    return Form(
      key: _formKey,
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            TextFormField(
              controller: _nameController,
              decoration: const InputDecoration(labelText: 'Ingredient Name'),
              validator: (value) => (value?.isEmpty ?? true) ? 'Please enter a name' : null,
            ),
            TextFormField(
              controller: _servingSizeController,
              decoration: const InputDecoration(labelText: 'Serving Size'),
              keyboardType: TextInputType.number,
            ),
            ServingUnitDropdown(
              selectedValue: _selectedServingUnit,
              onChanged: (value) => setState(() => _selectedServingUnit = value),
            ),
            TextFormField(
              controller: _energyController,
              decoration: const InputDecoration(labelText: 'Energy (kcal)'),
              keyboardType: TextInputType.number,
            ),
            TextFormField(
              controller: _proteinController,
              decoration: const InputDecoration(labelText: 'Protein (g)'),
              keyboardType: TextInputType.number,
            ),
            TextFormField(
              controller: _carbsController,
              decoration: const InputDecoration(labelText: 'Carbohydrates (g)'),
              keyboardType: TextInputType.number,
            ),
            TextFormField(
              controller: _fatController,
              decoration: const InputDecoration(labelText: 'Fat (g)'),
              keyboardType: TextInputType.number,
            ),
            const SizedBox(height: 24),
            ElevatedButton(
              onPressed: _save,
              child: const Text('Save'),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _save() async {
    if (_formKey.currentState!.validate()) {
      final db = ref.read(databaseProvider);
      await db.upsertIngredient(
        IngredientsCompanion(
          id: d.Value(widget.ingredient.id),
          name: d.Value(_nameController.text),
          servingSize: d.Value(double.tryParse(_servingSizeController.text)),
          servingUnit: d.Value(_selectedServingUnit),
          energy: d.Value(double.tryParse(_energyController.text)),
          protein: d.Value(double.tryParse(_proteinController.text)),
          carbs: d.Value(double.tryParse(_carbsController.text)),
          fat: d.Value(double.tryParse(_fatController.text)),
        ),
      );
      ref.invalidate(ingredientsProvider);
      ref.invalidate(ingredientDetailProvider(widget.ingredient.id));
      if (mounted) {
        Navigator.of(context).pop();
      }
    }
  }
}

final ingredientDetailProvider = FutureProvider.family<Ingredient, String>((ref, id) async {
  final db = ref.read(databaseProvider);
  return (db.select(db.ingredients)..where((t) => t.id.equals(id))).getSingle();
});
