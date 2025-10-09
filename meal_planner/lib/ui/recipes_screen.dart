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
      setState(() {});
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
    final recipesAsync = ref.watch(recipesProvider);
    final db = ref.read(databaseProvider);
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
                    final items = await recipesAsync.value
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
                      if (!_isSearching) _searchController.clear();
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
      body: recipesAsync.when(
        data: (items) {
          final filteredItems = _searchController.text.isEmpty
              ? items
              : items
                  .where((r) =>
                      r.name.toLowerCase().contains(_searchController.text.toLowerCase()))
                  .toList();

          if (items.isEmpty) {
            return const Center(child: Text('No recipes yet. Tap + to add one!'));
          }

          if (filteredItems.isEmpty && _searchController.text.isNotEmpty) {
            return const Center(child: Text('No recipes found.'));
          }

          final groupedRecipes = <String, List<Recipe>>{};
          for (final recipe in filteredItems) {
            final mealType = recipe.mealType?.isNotEmpty == true
                ? recipe.mealType!.toLowerCase()
                : 'uncategorized';
            (groupedRecipes[mealType] ??= []).add(recipe);
          }

          final groupOrder = [
            'pre breakfast',
            'breakfast',
            'lunch',
            'snack',
            'dinner',
            'uncategorized'
          ];

          final sortedGroups = groupedRecipes.keys.toList()
            ..sort((a, b) {
              final indexA = groupOrder.indexOf(a);
              final indexB = groupOrder.indexOf(b);
              return indexA.compareTo(indexB);
            });

          groupedRecipes.forEach((key, value) {
            value.sort((a, b) => a.name.toLowerCase().compareTo(b.name.toLowerCase()));
          });

          return ListView.builder(
            itemCount: sortedGroups.length,
            itemBuilder: (_, groupIndex) {
              final groupName = sortedGroups[groupIndex];
              final recipesInGroup = groupedRecipes[groupName]!;
              return ExpansionTile(
                title: Text(
                  groupName.toUpperCase(),
                  style: Theme.of(context).textTheme.titleSmall?.copyWith(
                        fontWeight: FontWeight.bold,
                        color: Theme.of(context).colorScheme.primary,
                      ),
                ),
                initiallyExpanded: true,
                children: recipesInGroup.map((recipe) {
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
                }).toList(),
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
