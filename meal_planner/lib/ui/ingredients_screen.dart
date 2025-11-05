import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:uuid/uuid.dart';
import 'package:collection/collection.dart';
import '../providers.dart';
import '../data/app_database.dart';
import 'ingredient_edit_screen.dart';

enum IngredientGrouping { alphabetically, byCategory }

class IngredientsScreen extends ConsumerStatefulWidget {
  const IngredientsScreen({super.key});

  @override
  ConsumerState<IngredientsScreen> createState() => _IngredientsScreenState();
}

class _IngredientsScreenState extends ConsumerState<IngredientsScreen> {
  final Set<String> _selectedIds = {};
  bool _isSelectionMode = false;
  bool _isSearching = false;
  IngredientGrouping _grouping = IngredientGrouping.alphabetically;
  final _searchController = TextEditingController();
  String _searchTerm = '';

  @override
  void initState() {
    super.initState();
    _searchController.addListener(() => setState(() => _searchTerm = _searchController.text));
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _deleteIngredients(List<Ingredient> ingredients) async {
    final ingredientRepo = ref.read(ingredientRepoProvider);
    final recipeRepo = ref.read(recipeRepoProvider);
    final ingredientIds = ingredients.map((i) => i.id).toList();

    final linkedRecipes = await ingredientRepo.getRecipesUsingIngredients(ingredientIds);

    if (linkedRecipes.isNotEmpty) {
      if (!mounted) return;
      final shouldDelete = await showDialog<bool>(
        context: context,
        builder: (context) => AlertDialog(
          title: const Text('Delete Ingredient(s)?'),
          content: Text(
              'One or more ingredients are used in ${linkedRecipes.length} recipe(s). Deleting them will remove them from those recipes. Are you sure you want to continue?'),
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

      await recipeRepo.removeIngredients(ingredientIds);
    } else {
      if (!mounted) return;
      final shouldDelete = await showDialog<bool>(
        context: context,
        builder: (context) => AlertDialog(
          title: const Text('Delete Ingredient(s)?'),
          content: Text(
              'Are you sure you want to delete ${ingredients.length} ingredient(s)? This action cannot be undone.'),
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

    await ingredientRepo.deleteMany(ingredientIds);
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
        title: _isSearching
            ? TextField(
                controller: _searchController,
                autofocus: true,
                decoration: InputDecoration(
                  hintText: 'Search ingredients...',
                  border: InputBorder.none,
                  hintStyle: TextStyle(color: Colors.black.withOpacity(0.5)),
                ),
                style: const TextStyle(color: Colors.black),
              )
            : Text(_isSelectionMode
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
          ] else ...[
            IconButton(
              icon: Icon(_isSearching ? Icons.close : Icons.search),
              tooltip: _isSearching ? 'Close Search' : 'Search',
              onPressed: () {
                setState(() {
                  _isSearching = !_isSearching;
                  if (!_isSearching) {
                    _searchController.clear();
                  }
                  _isSelectionMode = false;
                  _selectedIds.clear();
                });
              },
            ),
            if (!_isSearching)
              PopupMenuButton<IngredientGrouping>(
                onSelected: (IngredientGrouping result) {
                  setState(() {
                    _grouping = result;
                  });
                },
                itemBuilder: (BuildContext context) =>
                    <PopupMenuEntry<IngredientGrouping>>[
                  const PopupMenuItem<IngredientGrouping>(
                    value: IngredientGrouping.alphabetically,
                    child: Text('Alphabetically'),
                  ),
                  const PopupMenuItem<IngredientGrouping>(
                    value: IngredientGrouping.byCategory,
                    child: Text('By Category'),
                  ),
                ],
              ),
            if (!_isSearching)
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
          ]
        ],
      ),
      body: ingredientsAsync.when(
        data: (items) {
          final filteredItems = items
              .where((item) =>
                  _searchTerm.isEmpty ||
                  item.name.toLowerCase().contains(_searchTerm.toLowerCase()))
              .toList();

          if (_grouping == IngredientGrouping.byCategory) {
            final grouped = groupBy<Ingredient, String>(
              filteredItems,
              (item) => item.category ?? 'Uncategorized',
            );
            final sortedKeys = grouped.keys.toList()..sort();
            return ListView.builder(
              itemCount: sortedKeys.length,
              itemBuilder: (context, index) {
                final category = sortedKeys[index];
                final ingredients = grouped[category]!;
                ingredients.sort((a, b) => a.name.toLowerCase().compareTo(b.name.toLowerCase()));
                return Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Padding(
                      padding: const EdgeInsets.all(8.0),
                      child: Text(
                        category,
                        style: Theme.of(context).textTheme.titleLarge,
                      ),
                    ),
                    ListView.separated(
                      shrinkWrap: true,
                      physics: const ClampingScrollPhysics(),
                      itemCount: ingredients.length,
                      separatorBuilder: (_, __) => const Divider(height: 1),
                      itemBuilder: (_, i) {
                        final item = ingredients[i];
                        return ListTile(
                          selected: _selectedIds.contains(item.id),
                          title: Text(item.name),
                          onTap: _isSelectionMode
                              ? () => setState(() {
                                    if (_selectedIds.contains(item.id)) {
                                      _selectedIds.remove(item.id);
                                      if (_selectedIds.isEmpty) {
                                        _isSelectionMode = false;
                                      }
                                    } else {
                                      _selectedIds.add(item.id);
                                    }
                                  })
                              : () => Navigator.of(context).push(
                                    MaterialPageRoute(
                                        builder: (_) => IngredientEditScreen(
                                            ingredientId: item.id)),
                                  ),
                          onLongPress: !_isSelectionMode
                              ? () => setState(() {
                                    _isSelectionMode = true;
                                    _selectedIds.add(item.id);
                                  })
                              : null,
                          trailing: _isSelectionMode
                              ? Icon(_selectedIds.contains(item.id)
                                  ? Icons.check_circle
                                  : Icons.circle_outlined)
                              : const Icon(Icons.chevron_right),
                        );
                      },
                    ),
                  ],
                );
              },
            );
          } else {
            filteredItems.sort((a, b) => a.name.toLowerCase().compareTo(b.name.toLowerCase()));
            return ListView.separated(
              itemCount: filteredItems.length,
              separatorBuilder: (_, __) => const Divider(height: 1),
              itemBuilder: (_, i) => ListTile(
                selected: _selectedIds.contains(filteredItems[i].id),
                title: Text(filteredItems[i].name),
                onTap: _isSelectionMode
                    ? () => setState(() {
                          if (_selectedIds.contains(filteredItems[i].id)) {
                            _selectedIds.remove(filteredItems[i].id);
                            if (_selectedIds.isEmpty) {
                              _isSelectionMode = false;
                            }
                          } else {
                            _selectedIds.add(filteredItems[i].id);
                          }
                        })
                    : () => Navigator.of(context).push(
                          MaterialPageRoute(
                              builder: (_) =>
                                  IngredientEditScreen(ingredientId: filteredItems[i].id)),
                        ),
                onLongPress: !_isSelectionMode
                    ? () => setState(() {
                          _isSelectionMode = true;
                          _selectedIds.add(filteredItems[i].id);
                        })
                    : null,
                trailing: _isSelectionMode
                    ? Icon(_selectedIds.contains(filteredItems[i].id)
                        ? Icons.check_circle
                        : Icons.circle_outlined)
                    : const Icon(Icons.chevron_right),
              ),
            );
          }
        },
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text('Error: $e')),
      ),
    );
  }
}
