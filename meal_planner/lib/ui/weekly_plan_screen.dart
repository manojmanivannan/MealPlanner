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
      return scheme.primaryContainer.withOpacity(0.15);
    case 'breakfast':
      return scheme.tertiaryContainer.withOpacity(0.25);
    case 'lunch':
      return scheme.secondaryContainer.withOpacity(0.25);
    case 'snack':
      return scheme.primaryContainer.withOpacity(0.35);
    case 'dinner':
      return scheme.secondaryContainer.withOpacity(0.45);
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
      appBar: AppBar(title: const Text('Weekly Plan')),
      body: Container(
        color: Theme.of(context).colorScheme.surface,
        child: planAsync.when(
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
                              Text(r.name, style: Theme.of(context).textTheme.headlineMedium),
                              const SizedBox(height: 8),
                              Text('Serves: ${r.serves ?? 1}', style: Theme.of(context).textTheme.titleMedium),
                              const SizedBox(height: 16),
                              Text('Ingredients', style: Theme.of(context).textTheme.titleLarge),
                              const Divider(),
                              if (ingredients.isEmpty)
                                const Text('No ingredients listed.')
                              else
                                for (final item in ingredients)
                                  Padding(
                                    padding: const EdgeInsets.symmetric(vertical: 4.0),
                                    child: Text(
                                        '• ${item.usage.quantity} ${item.usage.servingUnit ?? ''} ${item.ingredient?.name ?? 'Unknown'}'),
                                  ),
                              const SizedBox(height: 16),
                              Text('Instructions', style: Theme.of(context).textTheme.titleLarge),
                              const Divider(),
                              Text(r.instructions ?? 'No instructions provided.'),
                              const SizedBox(height: 16),
                              Text('Nutrition (per serving)', style: Theme.of(context).textTheme.titleLarge),
                              const Divider(),
                              Text('Energy: ${r.energy?.toStringAsFixed(0) ?? '?'} kcal'),
                              Text('Protein: ${r.protein?.toStringAsFixed(1) ?? '?'} g'),
                              Text('Carbs: ${r.carbs?.toStringAsFixed(1) ?? '?'} g'),
                              Text('Fat: ${r.fat?.toStringAsFixed(1) ?? '?'} g'),
                              Text('Fiber: ${r.fiber?.toStringAsFixed(1) ?? '?'} g'),
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

  @override
  Widget build(BuildContext context) {
    final dayMeals = view[day] ?? const {};
    final cardBorder = Border.all(color: Theme.of(context).dividerColor.withOpacity(0.15));
    final scheme = Theme.of(context).colorScheme;

    return Container(
      width: 280,
      margin: const EdgeInsets.only(right: 12),
      child: Material(
        elevation: 2,
        color: Theme.of(context).colorScheme.surface,
        borderRadius: BorderRadius.circular(20),
        child: Container(
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(20),
            boxShadow: [
              BoxShadow(color: Colors.black.withOpacity(0.06), blurRadius: 12, offset: const Offset(0, 6)),
            ],
          ),
          child: ClipRRect(
            borderRadius: BorderRadius.circular(20),
            child: Container(
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
                                background: _colorForMeal(meal, scheme),
                                border: cardBorder,
                                onEdit: () => onChangeMeal(meal),
                                onTap: () {
                                  final recipeList = dayMeals[meal];
                                  if (recipeList != null && recipeList.length == 1) {
                                    onShowRecipe(recipeList.first);
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
        ),
      ),
    );
  }
}

class _MealSection extends StatelessWidget {
  const _MealSection(
      {required this.title,
      required this.recipes,
      required this.background,
      required this.border,
      required this.onEdit,
      required this.onTap});
  final String title;
  final List<Recipe> recipes;
  final Color background;
  final BoxBorder border;
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

    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: background,
          borderRadius: BorderRadius.circular(16),
          border: border,
        ),
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
    );
  }
}
