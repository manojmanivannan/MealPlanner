import 'package:flutter_test/flutter_test.dart';
import 'package:meal_planner/data/app_database.dart';

void main() {
  test('inserts and reads ingredient', () async {
    final db = makeInMemoryDatabase();
    await db.upsertIngredient(IngredientsCompanion.insert(id: '1', name: 'apple'));
    final all = await db.getAllIngredients();
    expect(all.map((e) => e.name).toList(), contains('apple'));
  });
}
