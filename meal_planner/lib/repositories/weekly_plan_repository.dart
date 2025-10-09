import '../data/app_database.dart';

class WeeklyPlanRepository {
  WeeklyPlanRepository(this.db);
  final AppDatabase db;

  Future<List<WeeklyPlanItem>> getFor(String day, String mealType) => db.getWeeklyPlanFor(day, mealType);
}
