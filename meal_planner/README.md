# Meal Planner (Flutter)

Offline-first Android app (Android 10+, minSdk 29) using Flutter, Riverpod, and Drift. Seeds data from CSV assets.

## Setup

- Install Flutter (stable).
- From `meal_planner/`:
  - `flutter pub get`
  - `flutter pub run build_runner build -d` (if codegen is added later)
  - `flutter run` (Android 10+ device/emulator)

## Assets

- Seeds from `assets/data/{ingredients,recipes,weekly_plan}.csv` on first run.

## Backup/Restore

- Settings tab → Export/Import JSON (uses platform file picker/SAF).

## Tests

- `flutter test`

## Notes

- Local SQLite via Drift. No network required.
- Target SDK set to latest; min SDK 29.
