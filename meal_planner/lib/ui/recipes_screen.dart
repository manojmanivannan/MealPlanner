import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:uuid/uuid.dart';
import '../providers.dart';
import '../data/app_database.dart';
import 'recipe_detail_screen.dart';
import 'recipe_edit_screen.dart';

class RecipesScreen extends ConsumerStatefulWidget {
  const RecipesScreen({super.key});

  @override
  ConsumerState<RecipesScreen> createState() => _RecipesScreenState();
}

class _RecipesScreenState extends ConsumerState<RecipesScreen> {
  final Set<String> _selectedIds = {};
  bool _isSelectionMode = false;

  Future<void> _deleteRecipes(List<Recipe> recipes) async {
    if (recipes.length == 1) {
      if (!mounted) return;
      final shouldDelete = await showDialog<bool>(
        context: context,
        builder: (context) => AlertDialog(
          title: const Text('Delete Recipe?'),
          content: Text('Are you sure you want to delete "${recipes.first.name}"?'),
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
    } else {
      if (!mounted) return;
      final shouldDelete = await showDialog<bool>(
        context: context,
        builder: (context) => AlertDialog(
          title: const Text('Delete Recipes?'),
          content: Text('Are you sure you want to delete ${recipes.length} recipes? This action cannot be undone.'),
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
    }

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
        title: Text(_isSelectionMode 
            ? '${_selectedIds.length} selected' 
            : 'Recipes'),
        actions: [
          if (_isSelectionMode) ...[
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
          ] else
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
        data: (items) => ListView.separated(
          itemCount: items.length,
          separatorBuilder: (_, __) => const Divider(height: 1),
          itemBuilder: (_, i) {
            final recipe = items[i];
            return ListTile(
              selected: _selectedIds.contains(recipe.id),
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
                        MaterialPageRoute(builder: (_) => RecipeDetailScreen(recipeId: recipe.id)),
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
                  : IconButton(
                      icon: const Icon(Icons.delete),
                      onPressed: () => _deleteRecipes([recipe]),
                    ),
            );
          },
        ),
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text('Error: $e')),
      ),
    );
  }
}
