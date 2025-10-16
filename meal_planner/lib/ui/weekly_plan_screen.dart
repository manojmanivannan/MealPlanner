import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:uuid/uuid.dart';
import 'package:drift/drift.dart' as d;
import '../providers.dart';
import '../data/app_database.dart';
import 'recipe_edit_screen.dart';

String mealLabel(String meal) {
  switch (meal) {
    case 'pre_breakfast':
      return 'Pre‑Breakfast';
    case 'breakfast':
      return 'Breakfast';
    case 'lunch':
      return 'Lunch';
    case 'snack':
      return 'Snack';
    case 'dinner':
      return 'Dinner';
    default:
      return meal;
  }
}

Color _colorForMeal(String meal, ColorScheme scheme) {
  switch (meal) {
    case 'pre_breakfast':
      return Colors.blue.shade100;
    case 'breakfast':
      return Colors.green.shade100;
    case 'lunch':
      return Colors.orange.shade100;
    case 'snack':
      return Colors.purple.shade100;
    case 'dinner':
      return Colors.red.shade100;
    default:
      return Colors.grey.shade200;
  }
}

class WeeklyPlanScreen extends ConsumerWidget {
  const WeeklyPlanScreen({super.key});

  static const _days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  static const _meals = ['pre_breakfast', 'breakfast', 'lunch', 'snack', 'dinner'];

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final planAsync = ref.watch(weeklyPlanViewProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Meal Planner')),
      body: planAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text('Error: $e')),
        data: (view) {
          final viewportHeight = MediaQuery.of(context).size.height -
              kToolbarHeight -
              MediaQuery.of(context).padding.vertical -
              24;
          return SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                for (int i = 0; i < _days.length; i++)
                  _DayColumn(
                    day: _days[i],
                    meals: _meals,
                    view: view,
                    height: viewportHeight,
                    onChangeMeal: (mealType) => _pickRecipe(context, ref, _days[i], mealType),
                    onShowRecipe: (recipe) => _showRecipeDetails(context, ref, recipe),
                  ),
              ],
            ),
          );
        },
      ),
    );
  }

  Future<void> _showRecipeDetails(BuildContext context, WidgetRef ref, Recipe recipe) async {
    await showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      builder: (ctx) {
        return DraggableScrollableSheet(
          expand: false,
          initialChildSize: 0.6,
          maxChildSize: 0.9,
          builder: (context, scrollController) {
            return Consumer(
              builder: (context, ref, child) {
                final detailAsync = ref.watch(recipeDetailProvider(recipe.id));
                return detailAsync.when(
                  loading: () => const Center(child: CircularProgressIndicator()),
                  error: (e, st) => Center(child: Text('Error: $e')),
                  data: (data) {
                    final r = data.recipe;
                    final ingredients = data.ingredients;
                    return Stack(
                      children: [
                        SingleChildScrollView(
                          controller: scrollController,
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
                                  if (r.isVegetarian == true) const Chip(label: Text('Vegetarian')),
                                ],
                              ),
                              const SizedBox(height: 16),
                              Text('Nutrition Information', style: Theme.of(context).textTheme.titleLarge),
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
                              Text('Ingredients', style: Theme.of(context).textTheme.titleLarge),
                              const SizedBox(height: 8),
                              Wrap(
                                spacing: 8,
                                runSpacing: 4,
                                children: ingredients.map((p) {
                                  final ing = p.ingredient;
                                  final u = p.usage;
                                  final name = ing?.name ?? u.ingredientId;
                                  final qty = u.quantity;
                                  final unit = ing?.servingUnit ?? '';
                                  return Chip(
                                    label: Text(qty == null ? name : '$name ($qty $unit)'),
                                  );
                                }).toList(),
                              ),
                              const SizedBox(height: 16),
                              Text('Instructions', style: Theme.of(context).textTheme.titleLarge),
                              const SizedBox(height: 6),
                              Text(r.instructions ?? '—'),
                            ],
                          ),
                        ),
                        Positioned(
                          top: 0,
                          right: 0,
                          child: IconButton(
                            icon: const Icon(Icons.edit),
                            onPressed: () {
                              Navigator.of(context).pop(); // Close the modal
                              Navigator.of(context).push(MaterialPageRoute(
                                builder: (_) => RecipeEditScreen(recipeId: recipe.id),
                              ));
                            },
                          ),
                        ),
                      ],
                    );
                  },
                );
              },
            );
          },
        );
      },
    );
  }

  Future<void> _pickRecipe(BuildContext context, WidgetRef ref, String day, String mealType) async {
    final db = ref.read(databaseProvider);
    final recipes = await db.getAllRecipes();
    final existing = await db.getWeeklyPlanFor(day, mealType);
    final initiallySelected = existing.map((e) => e.recipeId).toSet();

    await showModalBottomSheet<void>(
      context: context,
      showDragHandle: true,
      isScrollControlled: true,
      builder: (ctx) {
        final selected = ValueNotifier<Set<String>>({...initiallySelected});
        return SafeArea(
          child: Padding(
            padding: const EdgeInsets.all(12),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Expanded(
                        child: Text('Select recipes for ${mealLabel(mealType)}',
                            style: Theme.of(ctx).textTheme.titleLarge)),
                    IconButton(
                      icon: const Icon(Icons.done),
                      onPressed: () => Navigator.of(ctx).pop(),
                    )
                  ],
                ),
                const SizedBox(height: 8),
                Flexible(
                  child: ValueListenableBuilder<Set<String>>(
                    valueListenable: selected,
                    builder: (_, set, __) {
                      return ListView.separated(
                        shrinkWrap: true,
                        itemCount: recipes.length,
                        separatorBuilder: (_, __) => const Divider(height: 1),
                        itemBuilder: (_, i) {
                          final r = recipes[i];
                          final checked = set.contains(r.id);
                          return CheckboxListTile(
                            value: checked,
                            title: Text(r.name),
                            controlAffinity: ListTileControlAffinity.leading,
                            onChanged: (v) async {
                              if (v == true) {
                                // add
                                await db.addWeeklyPlanItem(WeeklyPlanItemsCompanion.insert(
                                  id: Uuid().v4(),
                                  day: day,
                                  mealType: mealType,
                                  recipeId: r.id,
                                ));
                                set.add(r.id);
                              } else {
                                // remove
                                await (db.delete(db.weeklyPlanItems)
                                      ..where((t) =>
                                          t.day.equals(day) &
                                          t.mealType.equals(mealType) &
                                          t.recipeId.equals(r.id)))
                                    .go();
                                set.remove(r.id);
                              }
                              selected.value = {...set};
                              ref.invalidate(weeklyPlanViewProvider);
                            },
                          );
                        },
                      );
                    },
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}

class _DayColumn extends StatelessWidget {
  const _DayColumn({
    required this.day,
    required this.meals,
    required this.view,
    required this.height,
    required this.onChangeMeal,
    required this.onShowRecipe,
  });
  final String day;
  final List<String> meals;
  final Map<String, Map<String, List<Recipe>>> view;
  final double height;
  final void Function(String mealType) onChangeMeal;
  final void Function(Recipe recipe) onShowRecipe;

  Future<void> _showRecipeSelectionDialog(
      BuildContext context, List<Recipe> recipes, void Function(Recipe recipe) onShowRecipe) async {
    await showDialog(
      context: context,
      builder: (context) {
        return AlertDialog(
          title: const Text('Select a recipe'),
          content: SizedBox(
            width: double.maxFinite,
            child: ListView.separated(
              shrinkWrap: true,
              itemCount: recipes.length,
              separatorBuilder: (context, index) => const Divider(),
              itemBuilder: (context, index) {
                final recipe = recipes[index];
                return ListTile(
                  title: Text(recipe.name),
                  onTap: () {
                    Navigator.of(context).pop();
                    onShowRecipe(recipe);
                  },
                );
              },
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(context).pop(),
              child: const Text('Close'),
            ),
          ],
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final dayMeals = view[day] ?? const {};
    final scheme = Theme.of(context).colorScheme;

    return SizedBox(
      width: 280,
      child: Card(
        margin: const EdgeInsets.only(right: 12),
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: SizedBox(
            height: height,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Padding(
                  padding: const EdgeInsets.only(bottom: 10),
                  child: Text(
                    day,
                    style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w700),
                  ),
                ),
                const SizedBox(height: 4),
                Expanded(
                  child: SingleChildScrollView(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        for (final meal in meals) ...[
                          _MealSection(
                            title: mealLabel(meal),
                            recipes: dayMeals[meal] ?? const [],
                            color: _colorForMeal(meal, scheme),
                            onEdit: () => onChangeMeal(meal),
                            onTap: () {
                              final recipeList = dayMeals[meal];
                              if (recipeList != null) {
                                if (recipeList.length == 1) {
                                  onShowRecipe(recipeList.first);
                                } else if (recipeList.length > 1) {
                                  _showRecipeSelectionDialog(context, recipeList, onShowRecipe);
                                }
                              }
                            },
                          ),
                          const SizedBox(height: 12),
                        ],
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _MealSection extends StatelessWidget {
  const _MealSection(
      {required this.title,
      required this.recipes,
      required this.color,
      required this.onEdit,
      required this.onTap});
  final String title;
  final List<Recipe> recipes;
  final Color color;
  final VoidCallback onEdit;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final titleStyle = Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700);
    final bodyStyle = Theme.of(context).textTheme.bodyMedium;
    final subBodyStyle =
        Theme.of(context).textTheme.bodySmall?.copyWith(color: Theme.of(context).colorScheme.onSurface.withOpacity(0.6));

    final totalEnergy = recipes.fold<double>(0, (prev, r) => prev + (r.energy ?? 0));
    final totalProtein = recipes.fold<double>(0, (prev, r) => prev + (r.protein ?? 0));
    final totalCarbs = recipes.fold<double>(0, (prev, r) => prev + (r.carbs ?? 0));
    final totalFat = recipes.fold<double>(0, (prev, r) => prev + (r.fat ?? 0));

    return Card(
      elevation: 0,
      color: color,
      child: InkWell(
        onTap: onTap,
        borderRadius: const BorderRadius.all(Radius.circular(12.0)),
        child: Padding(
          padding: const EdgeInsets.all(12.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(title, style: titleStyle),
                  IconButton(
                    icon: Icon(recipes.isEmpty ? Icons.add : Icons.edit),
                    onPressed: onEdit,
                    visualDensity: VisualDensity.compact,
                    padding: EdgeInsets.zero,
                  ),
                ],
              ),
              const SizedBox(height: 6),
              if (recipes.isEmpty)
                Text('—', style: bodyStyle)
              else ...[
                ...recipes.map((r) => Padding(
                      padding: const EdgeInsets.symmetric(vertical: 2),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text('• '),
                          Expanded(child: Text(r.name, style: bodyStyle, softWrap: true)),
                        ],
                      ),
                    )),
                const SizedBox(height: 8),
                Text(
                  'E: ${totalEnergy.toStringAsFixed(0)}kcal | P: ${totalProtein.toStringAsFixed(1)}g | C: ${totalCarbs.toStringAsFixed(1)}g | F: ${totalFat.toStringAsFixed(1)}g',
                  style: subBodyStyle,
                ),
              ]
            ],
          ),
        ),
      ),
    );
  }
}
