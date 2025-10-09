import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:uuid/uuid.dart';
import '../providers.dart';
import '../data/app_database.dart';
import 'ingredient_edit_screen.dart';

class IngredientsScreen extends ConsumerStatefulWidget {
  const IngredientsScreen({super.key});

  @override
  ConsumerState<IngredientsScreen> createState() => _IngredientsScreenState();
}

class _IngredientsScreenState extends ConsumerState<IngredientsScreen> {
  final Set<String> _selectedIds = {};
  bool _isSelectionMode = false;

  Future<void> _deleteIngredients(List<Ingredient> ingredients) async {
    final ingredientRepo = ref.read(ingredientRepoProvider);
    if (ingredients.length == 1) {
      final ingredient = ingredients.first;
      final linkedRecipes = await ingredientRepo.getRecipesUsingIngredient(ingredient.id);
      if (linkedRecipes.isNotEmpty) {
        if (!mounted) return;
        final shouldDelete = await showDialog<bool>(
          context: context,
          builder: (context) => AlertDialog(
            title: const Text('Delete Ingredient?'),
            content: Text(
                'This ingredient is used in ${linkedRecipes.length} recipe(s). Deleting it will also delete those recipes. Are you sure you want to continue?'),
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
        
        // Delete recipes first, then ingredient
        final recipeRepo = ref.read(recipeRepoProvider);
        await recipeRepo.deleteMany(linkedRecipes.map((r) => r.id).toList());
      }
    } else {
      if (!mounted) return;
      final shouldDelete = await showDialog<bool>(
        context: context,
        builder: (context) => AlertDialog(
          title: const Text('Delete Ingredients?'),
          content: Text('Are you sure you want to delete ${ingredients.length} ingredients? This action cannot be undone.'),
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

    await ingredientRepo.deleteMany(ingredients.map((i) => i.id).toList());
    ref.invalidate(ingredientsProvider);
    setState(() {
      _selectedIds.clear();
      _isSelectionMode = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    final ingredientsAsync = ref.watch(ingredientsProvider);
    final db = ref.read(databaseProvider);
    return Scaffold(
      appBar: AppBar(
        title: Text(_isSelectionMode 
            ? '${_selectedIds.length} selected' 
            : 'Ingredients'),
        actions: [
          if (_isSelectionMode) ...[
            IconButton(
              tooltip: 'Delete Selected',
              icon: const Icon(Icons.delete),
              onPressed: () async {
                final items = await ingredientsAsync.value
                    ?.where((i) => _selectedIds.contains(i.id))
                    .toList();
                if (items != null && items.isNotEmpty) {
                  await _deleteIngredients(items);
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
              tooltip: 'Add Ingredient',
              icon: const Icon(Icons.add),
              onPressed: () async {
                final id = const Uuid().v4();
                await db.upsertIngredient(
                    IngredientsCompanion.insert(id: id, name: 'New Ingredient'));
                ref.invalidate(ingredientsProvider);
                if (context.mounted) {
                  Navigator.of(context).push(MaterialPageRoute(
                      builder: (_) => IngredientEditScreen(ingredientId: id)));
                }
              },
            ),
        ],
      ),
      body: ingredientsAsync.when(
        data: (items) => ListView.separated(
          itemCount: items.length,
          separatorBuilder: (_, __) => const Divider(height: 1),
          itemBuilder: (_, i) => ListTile(
            selected: _selectedIds.contains(items[i].id),
            title: Text(items[i].name),
            onTap: _isSelectionMode
                ? () => setState(() {
                      if (_selectedIds.contains(items[i].id)) {
                        _selectedIds.remove(items[i].id);
                        if (_selectedIds.isEmpty) {
                          _isSelectionMode = false;
                        }
                      } else {
                        _selectedIds.add(items[i].id);
                      }
                    })
                : () => Navigator.of(context).push(
                      MaterialPageRoute(builder: (_) => IngredientEditScreen(ingredientId: items[i].id)),
                    ),
            onLongPress: !_isSelectionMode
                ? () => setState(() {
                      _isSelectionMode = true;
                      _selectedIds.add(items[i].id);
                    })
                : null,
            trailing: _isSelectionMode
                ? Icon(_selectedIds.contains(items[i].id)
                    ? Icons.check_circle
                    : Icons.circle_outlined)
                : const Icon(Icons.chevron_right),
          ),
        ),
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text('Error: $e')),
      ),
    );
  }
}
