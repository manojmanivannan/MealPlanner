import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:uuid/uuid.dart';
import '../providers.dart';
import '../data/app_database.dart';
import 'recipe_detail_screen.dart';
import 'recipe_edit_screen.dart';

Color _colorFromString(String str) {
  return Colors.primaries[str.hashCode % Colors.primaries.length];
}

String _mealLabel(String meal) {
  switch (meal) {
    case 'pre_breakfast':
      return 'Pre-Breakfast';
    case 'breakfast':
      return 'Breakfast';
    case 'lunch':
      return 'Lunch';
    case 'snack':
      return 'Snack';
    case 'dinner':
      return 'Dinner';
    case 'uncategorized':
      return 'Uncategorized';
    default:
      if (meal.isEmpty) return 'Other';
      return meal[0].toUpperCase() + meal.substring(1);
  }
}

class RecipesScreen extends ConsumerStatefulWidget {
  const RecipesScreen({super.key});

  @override
  ConsumerState<RecipesScreen> createState() => _RecipesScreenState();
}

class _RecipesScreenState extends ConsumerState<RecipesScreen> {
  final Set<String> _selectedIds = {};
  bool _isSelectionMode = false;
  bool _isSearching = false;
  final _searchController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _searchController.addListener(() {
      ref.read(recipeSearchQueryProvider.notifier).state = _searchController.text;
    });
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _deleteRecipes(List<Recipe> recipes) async {
    final shouldDelete = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('Delete ${recipes.length} recipe(s)?'),
        content: Text(
            'Are you sure you want to delete ${recipes.length} recipe(s)? This action cannot be undone.'),
        actions: [
          TextButton(
            child: const Text('Cancel'),
            onPressed: () => Navigator.pop(context, false),
          ),
          TextButton(
            child: const Text('Delete'),
            onPressed: () => Navigator.pop(context, true),
          ),
        ],
      ),
    );
    if (shouldDelete != true) return;

    final recipeRepo = ref.read(recipeRepoProvider);
    await recipeRepo.deleteMany(recipes.map((r) => r.id).toList());
    ref.invalidate(recipesProvider);
    setState(() {
      _selectedIds.clear();
      _isSelectionMode = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    final flatListAsync = ref.watch(filteredRecipesProvider);
    final db = ref.read(databaseProvider);
    final allRecipes = ref.watch(recipesProvider);

    return Scaffold(
      appBar: AppBar(
        title: _isSearching
            ? TextField(
                controller: _searchController,
                autofocus: true,
                decoration: InputDecoration(
                  hintText: 'Search recipes...',
                  border: InputBorder.none,
                  hintStyle: TextStyle(color: Colors.black.withOpacity(0.5)),
                ),
                style: const TextStyle(color: Colors.black),
              )
            : Text(_isSelectionMode ? '${_selectedIds.length} selected' : 'Recipes'),
        actions: _isSelectionMode
            ? [
                IconButton(
                  tooltip: 'Delete Selected',
                  icon: const Icon(Icons.delete),
                  onPressed: () async {
                    final items = await allRecipes.value
                        ?.where((r) => _selectedIds.contains(r.id))
                        .toList();
                    if (items != null && items.isNotEmpty) {
                      await _deleteRecipes(items);
                    }
                  },
                ),
                IconButton(
                  tooltip: 'Cancel Selection',
                  icon: const Icon(Icons.close),
                  onPressed: () => setState(() {
                    _selectedIds.clear();
                    _isSelectionMode = false;
                  }),
                ),
              ]
            : [
                IconButton(
                  icon: Icon(_isSearching ? Icons.close : Icons.search),
                  tooltip: _isSearching ? 'Close Search' : 'Search',
                  onPressed: () {
                    setState(() {
                      _isSearching = !_isSearching;
                      if (!_isSearching) {
                        _searchController.clear();
                        ref.read(recipeSearchQueryProvider.notifier).state = '';
                      }
                      _isSelectionMode = false;
                      _selectedIds.clear();
                    });
                  },
                ),
                if (!_isSearching)
                  IconButton(
                    tooltip: 'Add Recipe',
                    icon: const Icon(Icons.add),
                    onPressed: () async {
                      final id = const Uuid().v4();
                      await db.upsertRecipe(RecipesCompanion.insert(
                        id: id,
                        name: 'New Recipe',
                      ));
                      ref.invalidate(recipesProvider);
                      if (context.mounted) {
                        Navigator.of(context).push(MaterialPageRoute(
                            builder: (_) => RecipeEditScreen(recipeId: id)));
                      }
                    },
                  ),
              ],
      ),
      body: flatListAsync.when(
        data: (flatList) {
          if (ref.read(recipesProvider).value?.isEmpty ?? true) {
            return const Center(child: Text('No recipes yet. Tap + to add one!'));
          }
          if (flatList.isEmpty && _searchController.text.isNotEmpty) {
            return const Center(child: Text('No recipes found.'));
          }
          return ListView.builder(
            itemCount: flatList.length,
            itemBuilder: (_, index) {
              final item = flatList[index];

              if (item is String) {
                // This is a header
                return Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 16.0),
                  child: Text(
                    _mealLabel(item),
                    style: Theme.of(context).textTheme.titleSmall?.copyWith(
                          fontWeight: FontWeight.bold,
                          color: Theme.of(context).colorScheme.primary,
                        ),
                  ),
                );
              }

              final recipe = item as Recipe;
              final color = _colorFromString(recipe.name);
              return ListTile(
                selected: _selectedIds.contains(recipe.id),
                leading: CircleAvatar(
                  backgroundColor: color,
                  child: Text(recipe.name.substring(0, 1),
                      style: const TextStyle(color: Colors.white)),
                ),
                title: Text(recipe.name),
                subtitle: Text(
                    'E: ${recipe.energy?.toStringAsFixed(0) ?? '?'}kcal | P: ${recipe.protein?.toStringAsFixed(1) ?? '?'}g | C: ${recipe.carbs?.toStringAsFixed(1) ?? '?'}g | F: ${recipe.fat?.toStringAsFixed(1) ?? '?'}g'),
                onTap: _isSelectionMode
                    ? () => setState(() {
                          if (_selectedIds.contains(recipe.id)) {
                            _selectedIds.remove(recipe.id);
                            if (_selectedIds.isEmpty) {
                              _isSelectionMode = false;
                            }
                          } else {
                            _selectedIds.add(recipe.id);
                          }
                        })
                    : () => Navigator.of(context).push(
                          MaterialPageRoute(
                              builder: (_) =>
                                  RecipeDetailScreen(recipeId: recipe.id)),
                        ),
                onLongPress: !_isSelectionMode
                    ? () => setState(() {
                          _isSelectionMode = true;
                          _selectedIds.add(recipe.id);
                        })
                    : null,
                trailing: _isSelectionMode
                    ? Icon(_selectedIds.contains(recipe.id)
                        ? Icons.check_circle
                        : Icons.circle_outlined)
                    : const Icon(Icons.chevron_right),
              );
            },
          );
        },
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text('Error: $e')),
      ),
    );
  }
}
