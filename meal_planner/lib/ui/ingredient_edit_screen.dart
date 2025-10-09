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

    _servingSizeController.addListener(() => setState(() {}));
    // No need to add listener for dropdown, onChanged does it.
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

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Edit Ingredient'),
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
              TextFormField(
                controller: _servingSizeController,
                decoration: const InputDecoration(labelText: 'Serving Size', border: OutlineInputBorder()),
                keyboardType: TextInputType.number,
              ),
              const SizedBox(height: 12),
              ServingUnitDropdown(
                selectedValue: _selectedServingUnit,
                onChanged: (value) => setState(() => _selectedServingUnit = value),
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
