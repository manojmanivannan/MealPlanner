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
    case 'dinner':
      return 'Dinner';
    case 'snack':
      return 'Snack';
    case 'sides':
      return 'Sides';
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
    final pageController = PageController(initialPage: ref.watch(weeklyPlanPageIndexProvider));

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
          return PageView.builder(
            controller: pageController,
            itemCount: _days.length,
            onPageChanged: (index) => ref.read(weeklyPlanPageIndexProvider.notifier).state = index,
            itemBuilder: (context, index) {
              final day = _days[index];
              return Padding(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                child: _DayColumn(
                  key: ValueKey(day),
                  day: day,
                  meals: _meals,
                  view: view,
                  height: viewportHeight,
                  onChangeMeal: (mealType) => _pickRecipe(context, ref, day, mealType),
                  onShowRecipe: (recipe) => _showRecipeDetails(context, ref, recipe),
                ),
              );
            },
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
                        CustomScrollView(
                          controller: scrollController,
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
                              itemCount: ingredients.length,
                              itemBuilder: (context, index) {
                                final p = ingredients[index];
                                final ing = p.ingredient;
                                final u = p.usage;
                                final name = ing?.name ?? u.ingredientId;
                                final qty = u.quantity;
                                final unit = ing?.servingUnit ?? '';
                                return ListTile(
                                  title: Text(qty == null ? name : '$name ($qty $unit)'),
                                );
                              },
                            ),
                            SliverPadding(
                              padding: const EdgeInsets.all(16),
                              sliver: SliverList(delegate: SliverChildListDelegate([
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
                              ])),
                            ),
                          ],
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

    // Group recipes by meal type
    final groupedRecipes = <String, List<Recipe>>{};
    for (final recipe in recipes) {
      final type = recipe.mealType ?? 'Other';
      (groupedRecipes[type] ??= []).add(recipe);
    }

    // Sort meal types according to custom order, then sort recipes within each group alphabetically
    const mealOrder = ['pre_breakfast', 'breakfast', 'lunch', 'dinner', 'snack', 'sides'];
    final sortedMealTypes = groupedRecipes.keys.toList()
      ..sort((a, b) {
        final indexA = mealOrder.indexOf(a);
        final indexB = mealOrder.indexOf(b);
        final effectiveIndexA = indexA == -1 ? mealOrder.length : indexA;
        final effectiveIndexB = indexB == -1 ? mealOrder.length : indexB;

        final comparison = effectiveIndexA.compareTo(effectiveIndexB);
        if (comparison == 0) {
          return a.compareTo(b);
        }
        return comparison;
      });

    for (final key in sortedMealTypes) {
      groupedRecipes[key]!.sort((a, b) => a.name.compareTo(b.name));
    }

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
                      // Flatten the grouped and sorted recipes into a single list for the ListView
                      final List<dynamic> items = [];
                      for (final mealType in sortedMealTypes) {
                        items.add(mealType); // Header
                        items.addAll(groupedRecipes[mealType]!);
                      }

                      return ListView.builder(
                        shrinkWrap: true,
                        itemCount: items.length,
                        itemBuilder: (_, i) {
                          final item = items[i];
                          if (item is String) {
                            // It's a meal type header
                            return Padding(
                              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                              child: Text(
                                mealLabel(item),
                                style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold),
                              ),
                            );
                          } else {
                            // It's a Recipe item
                            final r = item as Recipe;
                            final isLastOfKind = (i + 1 == items.length) || (items[i + 1] is String);
                            final checked = set.contains(r.id);

                            return Column(
                              children: [
                                CheckboxListTile(
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
                                ),
                                if (!isLastOfKind) const Divider(height: 1),
                              ],
                            );
                          }
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

class _DayColumn extends StatefulWidget {
  const _DayColumn({
    super.key,
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
  State<_DayColumn> createState() => _DayColumnState();
}

class _DayColumnState extends State<_DayColumn> {

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
    final dayMeals = widget.view[widget.day] ?? const {};
    final scheme = Theme.of(context).colorScheme;

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: CustomScrollView(
          slivers: [
            SliverPersistentHeader(
              pinned: true,
              delegate: _SliverHeaderDelegate(
                child: Text(
                  widget.day,
                  style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                        fontWeight: FontWeight.w700,
                        backgroundColor: Theme.of(context).colorScheme.surface,
                      ),
                ),
              ),
            ),
            SliverList.builder(
              itemCount: widget.meals.length,
              itemBuilder: (context, index) {
                final meal = widget.meals[index];
                return Padding(
                  padding: const EdgeInsets.only(bottom: 12.0),
                  child: _MealSection(
                    title: mealLabel(meal),
                    recipes: dayMeals[meal] ?? const [],
                    color: _colorForMeal(meal, scheme),
                    onEdit: () => widget.onChangeMeal(meal),
                    onTap: () {
                      final recipeList = dayMeals[meal];
                      if (recipeList != null) {
                        if (recipeList.length == 1) {
                          widget.onShowRecipe(recipeList.first);
                        } else if (recipeList.length > 1) {
                          _showRecipeSelectionDialog(context, recipeList, widget.onShowRecipe);
                        }
                      }
                    },
                  ),
                );
              },
            ),
          ],
        ),
      ),
    );
  }
}

class _SliverHeaderDelegate extends SliverPersistentHeaderDelegate {
  _SliverHeaderDelegate({required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context, double shrinkOffset, bool overlapsContent) {
    return Container(
      color: Theme.of(context).colorScheme.surface,
      child: child,
      alignment: Alignment.centerLeft,
    );
  }

  @override
  double get maxExtent => 40;

  @override
  double get minExtent => 40;

  @override
  bool shouldRebuild(covariant SliverPersistentHeaderDelegate oldDelegate) => false;
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
