import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../providers.dart';
import 'recipe_edit_screen.dart';

class RecipeDetailScreen extends ConsumerWidget {
  const RecipeDetailScreen({super.key, required this.recipeId});
  final String recipeId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final detailAsync = ref.watch(recipeDetailProvider(recipeId));
    return Scaffold(
      appBar: AppBar(
        title: const Text('Recipe'),
        actions: [
          IconButton(
            tooltip: 'Edit',
            icon: const Icon(Icons.edit),
            onPressed: () => Navigator.of(context).push(
              MaterialPageRoute(builder: (_) => RecipeEditScreen(recipeId: recipeId)),
            ),
          ),
        ],
      ),
      body: detailAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text('Error: $e')),
        data: (d) {
          final r = d.recipe;
          return SingleChildScrollView(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(r.name, style: Theme.of(context).textTheme.headlineMedium?.copyWith(fontWeight: FontWeight.w700)),
                const SizedBox(height: 8),
                Wrap(
                  spacing: 12,
                  runSpacing: 8,
                  children: [
                    _Chip('Serves', r.serves?.toString() ?? '-'),
                    _Chip('Meal', r.mealType ?? '-'),
                    _Chip('Veg', (r.isVegetarian ?? false) ? 'Yes' : 'No'),
                  ],
                ),
                const SizedBox(height: 12),
                _Macros(protein: r.protein, carbs: r.carbs, fat: r.fat, fiber: r.fiber, energy: r.energy),
                const SizedBox(height: 16),
                Text('Ingredients', style: Theme.of(context).textTheme.titleLarge),
                const SizedBox(height: 8),
                ...d.ingredients.map((p) {
                  final ing = p.ingredient;
                  final u = p.usage;
                  final name = ing?.name ?? u.ingredientId;
                  final qty = u.quantity;
                  final unit = u.servingUnit ?? '';
                  return ListTile(
                    contentPadding: EdgeInsets.zero,
                    title: Text(name),
                    subtitle: Text(qty == null ? unit : '$qty $unit'),
                  );
                }),
                const SizedBox(height: 16),
                Text('Instructions', style: Theme.of(context).textTheme.titleLarge),
                const SizedBox(height: 6),
                Text(r.instructions ?? '—'),
              ],
            ),
          );
        },
      ),
    );
  }
}

class _Chip extends StatelessWidget {
  const _Chip(this.label, this.value);
  final String label;
  final String value;
  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.secondaryContainer,
        borderRadius: BorderRadius.circular(10),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text('$label: ', style: const TextStyle(fontWeight: FontWeight.w600)),
          Text(value),
        ],
      ),
    );
  }
}

class _Macros extends StatelessWidget {
  const _Macros({this.protein, this.carbs, this.fat, this.fiber, this.energy});
  final double? protein;
  final double? carbs;
  final double? fat;
  final double? fiber;
  final double? energy;

  @override
  Widget build(BuildContext context) {
    Text _cell(String k, double? v, {String suffix = 'g'}) => Text('$k: ${v == null ? '-' : v.toStringAsFixed(1)}$suffix');
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surfaceVariant,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Wrap(
        spacing: 16,
        runSpacing: 8,
        children: [
          _cell('Protein', protein),
          _cell('Carbs', carbs),
          _cell('Fat', fat),
          _cell('Fiber', fiber),
          _cell('Energy', energy, suffix: ' kcal'),
        ],
      ),
    );
  }
}
