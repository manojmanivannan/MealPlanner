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
          return CustomScrollView(
            slivers: [
              SliverPadding(
                padding: const EdgeInsets.all(16),
                sliver: SliverList(
                  delegate: SliverChildListDelegate([
                    Text(r.name, style: Theme.of(context).textTheme.headlineMedium?.copyWith(fontWeight: FontWeight.w700)),
                    const SizedBox(height: 8),
                    Wrap(
                      spacing: 8,
                      runSpacing: 4,
                      children: [
                        Chip(label: Text('Serves: ${r.serves?.toString() ?? '-'}')),
                        Chip(label: Text('Meal: ${r.mealType ?? '-'}')),
                        if (r.isVegetarian == true) const Chip(label: Text('Vegetarian')),
                      ],
                    ),
                    const SizedBox(height: 16),
                    Text('Instructions', style: Theme.of(context).textTheme.titleLarge),
                    const SizedBox(height: 6),
                    Text(r.instructions ?? '—'),
                    const SizedBox(height: 16),
                    Text('Ingredients', style: Theme.of(context).textTheme.titleLarge),
                    const SizedBox(height: 8),
                  ]),
                ),
              ),
              SliverList.builder(
                itemCount: d.ingredients.length,
                itemBuilder: (context, index) {
                  final p = d.ingredients[index];
                  final ing = p.ingredient;
                  final u = p.usage;
                  final name = ing?.name ?? u.ingredientId;
                  final qty = u.quantity;
                  final unit = ing?.servingUnit ?? '';
                  return ListTile(
                    leading: const Icon(Icons.drag_handle), // Placeholder for reordering
                    title: Text(qty == null ? name : '$name ($qty $unit)'),
                  );
                },
              ),
              SliverPadding(
                padding: const EdgeInsets.all(16),
                sliver: SliverList(
                  delegate: SliverChildListDelegate([
                    const SizedBox(height: 16),
                    Text('Macronutrients', style: Theme.of(context).textTheme.titleLarge),
                    const SizedBox(height: 8),
                    Wrap(
                      spacing: 8,
                      runSpacing: 4,
                      children: [
                        Chip(
                          label: Text('Protein: ${r.protein?.toStringAsFixed(1) ?? '-'}g'),
                          backgroundColor: Colors.green[100],
                        ),
                        Chip(
                          label: Text('Carbs: ${r.carbs?.toStringAsFixed(1) ?? '-'}g'),
                          backgroundColor: Colors.orange[100],
                        ),
                        Chip(
                          label: Text('Fat: ${r.fat?.toStringAsFixed(1) ?? '-'}g'),
                          backgroundColor: Colors.red[100],
                        ),
                        Chip(
                          label: Text('Fiber: ${r.fiber?.toStringAsFixed(1) ?? '-'}g'),
                          backgroundColor: Colors.brown[100],
                        ),
                        Chip(
                          label: Text('Energy: ${r.energy?.toStringAsFixed(0) ?? '-'} kcal'),
                          backgroundColor: Colors.blue[100],
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),
                    Text('Micronutrients', style: Theme.of(context).textTheme.titleLarge),
                    const SizedBox(height: 8),
                    Wrap(
                      spacing: 8,
                      runSpacing: 4,
                      children: [
                        Chip(label: Text('Iron: ${r.ironMg?.toStringAsFixed(1) ?? '-'}mg')),
                        Chip(label: Text('Magnesium: ${r.magnesiumMg?.toStringAsFixed(1) ?? '-'}mg')),
                        Chip(label: Text('Calcium: ${r.calciumMg?.toStringAsFixed(1) ?? '-'}mg')),
                        Chip(label: Text('Potassium: ${r.potassiumMg?.toStringAsFixed(1) ?? '-'}mg')),
                        Chip(label: Text('Sodium: ${r.sodiumMg?.toStringAsFixed(1) ?? '-'}mg')),
                        Chip(label: Text('Vitamin C: ${r.vitaminCMg?.toStringAsFixed(1) ?? '-'}mg')),
                      ],
                    ),
                  ]),
                ),
              ),
            ],
          );
        },
      ),
    );
  }
}
