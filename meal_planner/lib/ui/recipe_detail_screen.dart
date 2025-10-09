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
                  spacing: 8,
                  runSpacing: 4,
                  children: [
                    Chip(label: Text('Serves: ${r.serves?.toString() ?? '-'}')),
                    Chip(label: Text('Meal: ${r.mealType ?? '-'}')),
                    if (r.isVegetarian == true)
                      const Chip(label: Text('Vegetarian'))
                  ],
                ),
                const SizedBox(height: 12),
                Card(
                  child: Padding(
                    padding: const EdgeInsets.all(12.0),
                    child: Wrap(
                      spacing: 16,
                      runSpacing: 8,
                      children: [
                        Text('Protein: ${r.protein?.toStringAsFixed(1) ?? '-'}g'),
                        Text('Carbs: ${r.carbs?.toStringAsFixed(1) ?? '-'}g'),
                        Text('Fat: ${r.fat?.toStringAsFixed(1) ?? '-'}g'),
                        Text('Fiber: ${r.fiber?.toStringAsFixed(1) ?? '-'}g'),
                        Text('Energy: ${r.energy?.toStringAsFixed(0) ?? '-'} kcal'),
                      ],
                    ),
                  ),
                ),
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
