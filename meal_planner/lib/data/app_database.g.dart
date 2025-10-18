// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'app_database.dart';

// ignore_for_file: type=lint
class $IngredientsTable extends Ingredients
    with TableInfo<$IngredientsTable, Ingredient> {
  @override
  final GeneratedDatabase attachedDatabase;
  final String? _alias;
  $IngredientsTable(this.attachedDatabase, [this._alias]);
  static const VerificationMeta _idMeta = const VerificationMeta('id');
  @override
  late final GeneratedColumn<String> id = GeneratedColumn<String>(
      'id', aliasedName, false,
      type: DriftSqlType.string, requiredDuringInsert: true);
  static const VerificationMeta _nameMeta = const VerificationMeta('name');
  @override
  late final GeneratedColumn<String> name = GeneratedColumn<String>(
      'name', aliasedName, false,
      type: DriftSqlType.string, requiredDuringInsert: true);
  static const VerificationMeta _categoryMeta =
      const VerificationMeta('category');
  @override
  late final GeneratedColumn<String> category = GeneratedColumn<String>(
      'category', aliasedName, true,
      type: DriftSqlType.string, requiredDuringInsert: false);
  static const VerificationMeta _shelfLifeDaysMeta =
      const VerificationMeta('shelfLifeDays');
  @override
  late final GeneratedColumn<int> shelfLifeDays = GeneratedColumn<int>(
      'shelf_life_days', aliasedName, true,
      type: DriftSqlType.int, requiredDuringInsert: false);
  static const VerificationMeta _availableMeta =
      const VerificationMeta('available');
  @override
  late final GeneratedColumn<bool> available = GeneratedColumn<bool>(
      'available', aliasedName, false,
      type: DriftSqlType.bool,
      requiredDuringInsert: false,
      defaultConstraints:
          GeneratedColumn.constraintIsAlways('CHECK ("available" IN (0, 1))'),
      defaultValue: const Constant(false));
  static const VerificationMeta _lastAvailableMeta =
      const VerificationMeta('lastAvailable');
  @override
  late final GeneratedColumn<DateTime> lastAvailable =
      GeneratedColumn<DateTime>('last_available', aliasedName, true,
          type: DriftSqlType.dateTime, requiredDuringInsert: false);
  static const VerificationMeta _servingUnitMeta =
      const VerificationMeta('servingUnit');
  @override
  late final GeneratedColumn<String> servingUnit = GeneratedColumn<String>(
      'serving_unit', aliasedName, true,
      type: DriftSqlType.string, requiredDuringInsert: false);
  static const VerificationMeta _servingSizeMeta =
      const VerificationMeta('servingSize');
  @override
  late final GeneratedColumn<double> servingSize = GeneratedColumn<double>(
      'serving_size', aliasedName, true,
      type: DriftSqlType.double, requiredDuringInsert: false);
  static const VerificationMeta _proteinMeta =
      const VerificationMeta('protein');
  @override
  late final GeneratedColumn<double> protein = GeneratedColumn<double>(
      'protein', aliasedName, true,
      type: DriftSqlType.double, requiredDuringInsert: false);
  static const VerificationMeta _carbsMeta = const VerificationMeta('carbs');
  @override
  late final GeneratedColumn<double> carbs = GeneratedColumn<double>(
      'carbs', aliasedName, true,
      type: DriftSqlType.double, requiredDuringInsert: false);
  static const VerificationMeta _fatMeta = const VerificationMeta('fat');
  @override
  late final GeneratedColumn<double> fat = GeneratedColumn<double>(
      'fat', aliasedName, true,
      type: DriftSqlType.double, requiredDuringInsert: false);
  static const VerificationMeta _fiberMeta = const VerificationMeta('fiber');
  @override
  late final GeneratedColumn<double> fiber = GeneratedColumn<double>(
      'fiber', aliasedName, true,
      type: DriftSqlType.double, requiredDuringInsert: false);
  static const VerificationMeta _energyMeta = const VerificationMeta('energy');
  @override
  late final GeneratedColumn<double> energy = GeneratedColumn<double>(
      'energy', aliasedName, true,
      type: DriftSqlType.double, requiredDuringInsert: false);
  static const VerificationMeta _ironMgMeta = const VerificationMeta('ironMg');
  @override
  late final GeneratedColumn<double> ironMg = GeneratedColumn<double>(
      'iron_mg', aliasedName, true,
      type: DriftSqlType.double, requiredDuringInsert: false);
  static const VerificationMeta _magnesiumMgMeta =
      const VerificationMeta('magnesiumMg');
  @override
  late final GeneratedColumn<double> magnesiumMg = GeneratedColumn<double>(
      'magnesium_mg', aliasedName, true,
      type: DriftSqlType.double, requiredDuringInsert: false);
  static const VerificationMeta _calciumMgMeta =
      const VerificationMeta('calciumMg');
  @override
  late final GeneratedColumn<double> calciumMg = GeneratedColumn<double>(
      'calcium_mg', aliasedName, true,
      type: DriftSqlType.double, requiredDuringInsert: false);
  static const VerificationMeta _potassiumMgMeta =
      const VerificationMeta('potassiumMg');
  @override
  late final GeneratedColumn<double> potassiumMg = GeneratedColumn<double>(
      'potassium_mg', aliasedName, true,
      type: DriftSqlType.double, requiredDuringInsert: false);
  static const VerificationMeta _sodiumMgMeta =
      const VerificationMeta('sodiumMg');
  @override
  late final GeneratedColumn<double> sodiumMg = GeneratedColumn<double>(
      'sodium_mg', aliasedName, true,
      type: DriftSqlType.double, requiredDuringInsert: false);
  static const VerificationMeta _vitaminCMgMeta =
      const VerificationMeta('vitaminCMg');
  @override
  late final GeneratedColumn<double> vitaminCMg = GeneratedColumn<double>(
      'vitamin_c_mg', aliasedName, true,
      type: DriftSqlType.double, requiredDuringInsert: false);
  @override
  List<GeneratedColumn> get $columns => [
        id,
        name,
        category,
        shelfLifeDays,
        available,
        lastAvailable,
        servingUnit,
        servingSize,
        protein,
        carbs,
        fat,
        fiber,
        energy,
        ironMg,
        magnesiumMg,
        calciumMg,
        potassiumMg,
        sodiumMg,
        vitaminCMg
      ];
  @override
  String get aliasedName => _alias ?? actualTableName;
  @override
  String get actualTableName => $name;
  static const String $name = 'ingredients';
  @override
  VerificationContext validateIntegrity(Insertable<Ingredient> instance,
      {bool isInserting = false}) {
    final context = VerificationContext();
    final data = instance.toColumns(true);
    if (data.containsKey('id')) {
      context.handle(_idMeta, id.isAcceptableOrUnknown(data['id']!, _idMeta));
    } else if (isInserting) {
      context.missing(_idMeta);
    }
    if (data.containsKey('name')) {
      context.handle(
          _nameMeta, name.isAcceptableOrUnknown(data['name']!, _nameMeta));
    } else if (isInserting) {
      context.missing(_nameMeta);
    }
    if (data.containsKey('category')) {
      context.handle(_categoryMeta,
          category.isAcceptableOrUnknown(data['category']!, _categoryMeta));
    }
    if (data.containsKey('shelf_life_days')) {
      context.handle(
          _shelfLifeDaysMeta,
          shelfLifeDays.isAcceptableOrUnknown(
              data['shelf_life_days']!, _shelfLifeDaysMeta));
    }
    if (data.containsKey('available')) {
      context.handle(_availableMeta,
          available.isAcceptableOrUnknown(data['available']!, _availableMeta));
    }
    if (data.containsKey('last_available')) {
      context.handle(
          _lastAvailableMeta,
          lastAvailable.isAcceptableOrUnknown(
              data['last_available']!, _lastAvailableMeta));
    }
    if (data.containsKey('serving_unit')) {
      context.handle(
          _servingUnitMeta,
          servingUnit.isAcceptableOrUnknown(
              data['serving_unit']!, _servingUnitMeta));
    }
    if (data.containsKey('serving_size')) {
      context.handle(
          _servingSizeMeta,
          servingSize.isAcceptableOrUnknown(
              data['serving_size']!, _servingSizeMeta));
    }
    if (data.containsKey('protein')) {
      context.handle(_proteinMeta,
          protein.isAcceptableOrUnknown(data['protein']!, _proteinMeta));
    }
    if (data.containsKey('carbs')) {
      context.handle(
          _carbsMeta, carbs.isAcceptableOrUnknown(data['carbs']!, _carbsMeta));
    }
    if (data.containsKey('fat')) {
      context.handle(
          _fatMeta, fat.isAcceptableOrUnknown(data['fat']!, _fatMeta));
    }
    if (data.containsKey('fiber')) {
      context.handle(
          _fiberMeta, fiber.isAcceptableOrUnknown(data['fiber']!, _fiberMeta));
    }
    if (data.containsKey('energy')) {
      context.handle(_energyMeta,
          energy.isAcceptableOrUnknown(data['energy']!, _energyMeta));
    }
    if (data.containsKey('iron_mg')) {
      context.handle(_ironMgMeta,
          ironMg.isAcceptableOrUnknown(data['iron_mg']!, _ironMgMeta));
    }
    if (data.containsKey('magnesium_mg')) {
      context.handle(
          _magnesiumMgMeta,
          magnesiumMg.isAcceptableOrUnknown(
              data['magnesium_mg']!, _magnesiumMgMeta));
    }
    if (data.containsKey('calcium_mg')) {
      context.handle(_calciumMgMeta,
          calciumMg.isAcceptableOrUnknown(data['calcium_mg']!, _calciumMgMeta));
    }
    if (data.containsKey('potassium_mg')) {
      context.handle(
          _potassiumMgMeta,
          potassiumMg.isAcceptableOrUnknown(
              data['potassium_mg']!, _potassiumMgMeta));
    }
    if (data.containsKey('sodium_mg')) {
      context.handle(_sodiumMgMeta,
          sodiumMg.isAcceptableOrUnknown(data['sodium_mg']!, _sodiumMgMeta));
    }
    if (data.containsKey('vitamin_c_mg')) {
      context.handle(
          _vitaminCMgMeta,
          vitaminCMg.isAcceptableOrUnknown(
              data['vitamin_c_mg']!, _vitaminCMgMeta));
    }
    return context;
  }

  @override
  Set<GeneratedColumn> get $primaryKey => {id};
  @override
  Ingredient map(Map<String, dynamic> data, {String? tablePrefix}) {
    final effectivePrefix = tablePrefix != null ? '$tablePrefix.' : '';
    return Ingredient(
      id: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}id'])!,
      name: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}name'])!,
      category: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}category']),
      shelfLifeDays: attachedDatabase.typeMapping
          .read(DriftSqlType.int, data['${effectivePrefix}shelf_life_days']),
      available: attachedDatabase.typeMapping
          .read(DriftSqlType.bool, data['${effectivePrefix}available'])!,
      lastAvailable: attachedDatabase.typeMapping.read(
          DriftSqlType.dateTime, data['${effectivePrefix}last_available']),
      servingUnit: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}serving_unit']),
      servingSize: attachedDatabase.typeMapping
          .read(DriftSqlType.double, data['${effectivePrefix}serving_size']),
      protein: attachedDatabase.typeMapping
          .read(DriftSqlType.double, data['${effectivePrefix}protein']),
      carbs: attachedDatabase.typeMapping
          .read(DriftSqlType.double, data['${effectivePrefix}carbs']),
      fat: attachedDatabase.typeMapping
          .read(DriftSqlType.double, data['${effectivePrefix}fat']),
      fiber: attachedDatabase.typeMapping
          .read(DriftSqlType.double, data['${effectivePrefix}fiber']),
      energy: attachedDatabase.typeMapping
          .read(DriftSqlType.double, data['${effectivePrefix}energy']),
      ironMg: attachedDatabase.typeMapping
          .read(DriftSqlType.double, data['${effectivePrefix}iron_mg']),
      magnesiumMg: attachedDatabase.typeMapping
          .read(DriftSqlType.double, data['${effectivePrefix}magnesium_mg']),
      calciumMg: attachedDatabase.typeMapping
          .read(DriftSqlType.double, data['${effectivePrefix}calcium_mg']),
      potassiumMg: attachedDatabase.typeMapping
          .read(DriftSqlType.double, data['${effectivePrefix}potassium_mg']),
      sodiumMg: attachedDatabase.typeMapping
          .read(DriftSqlType.double, data['${effectivePrefix}sodium_mg']),
      vitaminCMg: attachedDatabase.typeMapping
          .read(DriftSqlType.double, data['${effectivePrefix}vitamin_c_mg']),
    );
  }

  @override
  $IngredientsTable createAlias(String alias) {
    return $IngredientsTable(attachedDatabase, alias);
  }
}

class Ingredient extends DataClass implements Insertable<Ingredient> {
  final String id;
  final String name;
  final String? category;
  final int? shelfLifeDays;
  final bool available;
  final DateTime? lastAvailable;
  final String? servingUnit;
  final double? servingSize;
  final double? protein;
  final double? carbs;
  final double? fat;
  final double? fiber;
  final double? energy;
  final double? ironMg;
  final double? magnesiumMg;
  final double? calciumMg;
  final double? potassiumMg;
  final double? sodiumMg;
  final double? vitaminCMg;
  const Ingredient(
      {required this.id,
      required this.name,
      this.category,
      this.shelfLifeDays,
      required this.available,
      this.lastAvailable,
      this.servingUnit,
      this.servingSize,
      this.protein,
      this.carbs,
      this.fat,
      this.fiber,
      this.energy,
      this.ironMg,
      this.magnesiumMg,
      this.calciumMg,
      this.potassiumMg,
      this.sodiumMg,
      this.vitaminCMg});
  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    map['id'] = Variable<String>(id);
    map['name'] = Variable<String>(name);
    if (!nullToAbsent || category != null) {
      map['category'] = Variable<String>(category);
    }
    if (!nullToAbsent || shelfLifeDays != null) {
      map['shelf_life_days'] = Variable<int>(shelfLifeDays);
    }
    map['available'] = Variable<bool>(available);
    if (!nullToAbsent || lastAvailable != null) {
      map['last_available'] = Variable<DateTime>(lastAvailable);
    }
    if (!nullToAbsent || servingUnit != null) {
      map['serving_unit'] = Variable<String>(servingUnit);
    }
    if (!nullToAbsent || servingSize != null) {
      map['serving_size'] = Variable<double>(servingSize);
    }
    if (!nullToAbsent || protein != null) {
      map['protein'] = Variable<double>(protein);
    }
    if (!nullToAbsent || carbs != null) {
      map['carbs'] = Variable<double>(carbs);
    }
    if (!nullToAbsent || fat != null) {
      map['fat'] = Variable<double>(fat);
    }
    if (!nullToAbsent || fiber != null) {
      map['fiber'] = Variable<double>(fiber);
    }
    if (!nullToAbsent || energy != null) {
      map['energy'] = Variable<double>(energy);
    }
    if (!nullToAbsent || ironMg != null) {
      map['iron_mg'] = Variable<double>(ironMg);
    }
    if (!nullToAbsent || magnesiumMg != null) {
      map['magnesium_mg'] = Variable<double>(magnesiumMg);
    }
    if (!nullToAbsent || calciumMg != null) {
      map['calcium_mg'] = Variable<double>(calciumMg);
    }
    if (!nullToAbsent || potassiumMg != null) {
      map['potassium_mg'] = Variable<double>(potassiumMg);
    }
    if (!nullToAbsent || sodiumMg != null) {
      map['sodium_mg'] = Variable<double>(sodiumMg);
    }
    if (!nullToAbsent || vitaminCMg != null) {
      map['vitamin_c_mg'] = Variable<double>(vitaminCMg);
    }
    return map;
  }

  IngredientsCompanion toCompanion(bool nullToAbsent) {
    return IngredientsCompanion(
      id: Value(id),
      name: Value(name),
      category: category == null && nullToAbsent
          ? const Value.absent()
          : Value(category),
      shelfLifeDays: shelfLifeDays == null && nullToAbsent
          ? const Value.absent()
          : Value(shelfLifeDays),
      available: Value(available),
      lastAvailable: lastAvailable == null && nullToAbsent
          ? const Value.absent()
          : Value(lastAvailable),
      servingUnit: servingUnit == null && nullToAbsent
          ? const Value.absent()
          : Value(servingUnit),
      servingSize: servingSize == null && nullToAbsent
          ? const Value.absent()
          : Value(servingSize),
      protein: protein == null && nullToAbsent
          ? const Value.absent()
          : Value(protein),
      carbs:
          carbs == null && nullToAbsent ? const Value.absent() : Value(carbs),
      fat: fat == null && nullToAbsent ? const Value.absent() : Value(fat),
      fiber:
          fiber == null && nullToAbsent ? const Value.absent() : Value(fiber),
      energy:
          energy == null && nullToAbsent ? const Value.absent() : Value(energy),
      ironMg:
          ironMg == null && nullToAbsent ? const Value.absent() : Value(ironMg),
      magnesiumMg: magnesiumMg == null && nullToAbsent
          ? const Value.absent()
          : Value(magnesiumMg),
      calciumMg: calciumMg == null && nullToAbsent
          ? const Value.absent()
          : Value(calciumMg),
      potassiumMg: potassiumMg == null && nullToAbsent
          ? const Value.absent()
          : Value(potassiumMg),
      sodiumMg: sodiumMg == null && nullToAbsent
          ? const Value.absent()
          : Value(sodiumMg),
      vitaminCMg: vitaminCMg == null && nullToAbsent
          ? const Value.absent()
          : Value(vitaminCMg),
    );
  }

  factory Ingredient.fromJson(Map<String, dynamic> json,
      {ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return Ingredient(
      id: serializer.fromJson<String>(json['id']),
      name: serializer.fromJson<String>(json['name']),
      category: serializer.fromJson<String?>(json['category']),
      shelfLifeDays: serializer.fromJson<int?>(json['shelfLifeDays']),
      available: serializer.fromJson<bool>(json['available']),
      lastAvailable: serializer.fromJson<DateTime?>(json['lastAvailable']),
      servingUnit: serializer.fromJson<String?>(json['servingUnit']),
      servingSize: serializer.fromJson<double?>(json['servingSize']),
      protein: serializer.fromJson<double?>(json['protein']),
      carbs: serializer.fromJson<double?>(json['carbs']),
      fat: serializer.fromJson<double?>(json['fat']),
      fiber: serializer.fromJson<double?>(json['fiber']),
      energy: serializer.fromJson<double?>(json['energy']),
      ironMg: serializer.fromJson<double?>(json['ironMg']),
      magnesiumMg: serializer.fromJson<double?>(json['magnesiumMg']),
      calciumMg: serializer.fromJson<double?>(json['calciumMg']),
      potassiumMg: serializer.fromJson<double?>(json['potassiumMg']),
      sodiumMg: serializer.fromJson<double?>(json['sodiumMg']),
      vitaminCMg: serializer.fromJson<double?>(json['vitaminCMg']),
    );
  }
  @override
  Map<String, dynamic> toJson({ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return <String, dynamic>{
      'id': serializer.toJson<String>(id),
      'name': serializer.toJson<String>(name),
      'category': serializer.toJson<String?>(category),
      'shelfLifeDays': serializer.toJson<int?>(shelfLifeDays),
      'available': serializer.toJson<bool>(available),
      'lastAvailable': serializer.toJson<DateTime?>(lastAvailable),
      'servingUnit': serializer.toJson<String?>(servingUnit),
      'servingSize': serializer.toJson<double?>(servingSize),
      'protein': serializer.toJson<double?>(protein),
      'carbs': serializer.toJson<double?>(carbs),
      'fat': serializer.toJson<double?>(fat),
      'fiber': serializer.toJson<double?>(fiber),
      'energy': serializer.toJson<double?>(energy),
      'ironMg': serializer.toJson<double?>(ironMg),
      'magnesiumMg': serializer.toJson<double?>(magnesiumMg),
      'calciumMg': serializer.toJson<double?>(calciumMg),
      'potassiumMg': serializer.toJson<double?>(potassiumMg),
      'sodiumMg': serializer.toJson<double?>(sodiumMg),
      'vitaminCMg': serializer.toJson<double?>(vitaminCMg),
    };
  }

  Ingredient copyWith(
          {String? id,
          String? name,
          Value<String?> category = const Value.absent(),
          Value<int?> shelfLifeDays = const Value.absent(),
          bool? available,
          Value<DateTime?> lastAvailable = const Value.absent(),
          Value<String?> servingUnit = const Value.absent(),
          Value<double?> servingSize = const Value.absent(),
          Value<double?> protein = const Value.absent(),
          Value<double?> carbs = const Value.absent(),
          Value<double?> fat = const Value.absent(),
          Value<double?> fiber = const Value.absent(),
          Value<double?> energy = const Value.absent(),
          Value<double?> ironMg = const Value.absent(),
          Value<double?> magnesiumMg = const Value.absent(),
          Value<double?> calciumMg = const Value.absent(),
          Value<double?> potassiumMg = const Value.absent(),
          Value<double?> sodiumMg = const Value.absent(),
          Value<double?> vitaminCMg = const Value.absent()}) =>
      Ingredient(
        id: id ?? this.id,
        name: name ?? this.name,
        category: category.present ? category.value : this.category,
        shelfLifeDays:
            shelfLifeDays.present ? shelfLifeDays.value : this.shelfLifeDays,
        available: available ?? this.available,
        lastAvailable:
            lastAvailable.present ? lastAvailable.value : this.lastAvailable,
        servingUnit: servingUnit.present ? servingUnit.value : this.servingUnit,
        servingSize: servingSize.present ? servingSize.value : this.servingSize,
        protein: protein.present ? protein.value : this.protein,
        carbs: carbs.present ? carbs.value : this.carbs,
        fat: fat.present ? fat.value : this.fat,
        fiber: fiber.present ? fiber.value : this.fiber,
        energy: energy.present ? energy.value : this.energy,
        ironMg: ironMg.present ? ironMg.value : this.ironMg,
        magnesiumMg: magnesiumMg.present ? magnesiumMg.value : this.magnesiumMg,
        calciumMg: calciumMg.present ? calciumMg.value : this.calciumMg,
        potassiumMg: potassiumMg.present ? potassiumMg.value : this.potassiumMg,
        sodiumMg: sodiumMg.present ? sodiumMg.value : this.sodiumMg,
        vitaminCMg: vitaminCMg.present ? vitaminCMg.value : this.vitaminCMg,
      );
  Ingredient copyWithCompanion(IngredientsCompanion data) {
    return Ingredient(
      id: data.id.present ? data.id.value : this.id,
      name: data.name.present ? data.name.value : this.name,
      category: data.category.present ? data.category.value : this.category,
      shelfLifeDays: data.shelfLifeDays.present
          ? data.shelfLifeDays.value
          : this.shelfLifeDays,
      available: data.available.present ? data.available.value : this.available,
      lastAvailable: data.lastAvailable.present
          ? data.lastAvailable.value
          : this.lastAvailable,
      servingUnit:
          data.servingUnit.present ? data.servingUnit.value : this.servingUnit,
      servingSize:
          data.servingSize.present ? data.servingSize.value : this.servingSize,
      protein: data.protein.present ? data.protein.value : this.protein,
      carbs: data.carbs.present ? data.carbs.value : this.carbs,
      fat: data.fat.present ? data.fat.value : this.fat,
      fiber: data.fiber.present ? data.fiber.value : this.fiber,
      energy: data.energy.present ? data.energy.value : this.energy,
      ironMg: data.ironMg.present ? data.ironMg.value : this.ironMg,
      magnesiumMg:
          data.magnesiumMg.present ? data.magnesiumMg.value : this.magnesiumMg,
      calciumMg: data.calciumMg.present ? data.calciumMg.value : this.calciumMg,
      potassiumMg:
          data.potassiumMg.present ? data.potassiumMg.value : this.potassiumMg,
      sodiumMg: data.sodiumMg.present ? data.sodiumMg.value : this.sodiumMg,
      vitaminCMg:
          data.vitaminCMg.present ? data.vitaminCMg.value : this.vitaminCMg,
    );
  }

  @override
  String toString() {
    return (StringBuffer('Ingredient(')
          ..write('id: $id, ')
          ..write('name: $name, ')
          ..write('category: $category, ')
          ..write('shelfLifeDays: $shelfLifeDays, ')
          ..write('available: $available, ')
          ..write('lastAvailable: $lastAvailable, ')
          ..write('servingUnit: $servingUnit, ')
          ..write('servingSize: $servingSize, ')
          ..write('protein: $protein, ')
          ..write('carbs: $carbs, ')
          ..write('fat: $fat, ')
          ..write('fiber: $fiber, ')
          ..write('energy: $energy, ')
          ..write('ironMg: $ironMg, ')
          ..write('magnesiumMg: $magnesiumMg, ')
          ..write('calciumMg: $calciumMg, ')
          ..write('potassiumMg: $potassiumMg, ')
          ..write('sodiumMg: $sodiumMg, ')
          ..write('vitaminCMg: $vitaminCMg')
          ..write(')'))
        .toString();
  }

  @override
  int get hashCode => Object.hash(
      id,
      name,
      category,
      shelfLifeDays,
      available,
      lastAvailable,
      servingUnit,
      servingSize,
      protein,
      carbs,
      fat,
      fiber,
      energy,
      ironMg,
      magnesiumMg,
      calciumMg,
      potassiumMg,
      sodiumMg,
      vitaminCMg);
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is Ingredient &&
          other.id == this.id &&
          other.name == this.name &&
          other.category == this.category &&
          other.shelfLifeDays == this.shelfLifeDays &&
          other.available == this.available &&
          other.lastAvailable == this.lastAvailable &&
          other.servingUnit == this.servingUnit &&
          other.servingSize == this.servingSize &&
          other.protein == this.protein &&
          other.carbs == this.carbs &&
          other.fat == this.fat &&
          other.fiber == this.fiber &&
          other.energy == this.energy &&
          other.ironMg == this.ironMg &&
          other.magnesiumMg == this.magnesiumMg &&
          other.calciumMg == this.calciumMg &&
          other.potassiumMg == this.potassiumMg &&
          other.sodiumMg == this.sodiumMg &&
          other.vitaminCMg == this.vitaminCMg);
}

class IngredientsCompanion extends UpdateCompanion<Ingredient> {
  final Value<String> id;
  final Value<String> name;
  final Value<String?> category;
  final Value<int?> shelfLifeDays;
  final Value<bool> available;
  final Value<DateTime?> lastAvailable;
  final Value<String?> servingUnit;
  final Value<double?> servingSize;
  final Value<double?> protein;
  final Value<double?> carbs;
  final Value<double?> fat;
  final Value<double?> fiber;
  final Value<double?> energy;
  final Value<double?> ironMg;
  final Value<double?> magnesiumMg;
  final Value<double?> calciumMg;
  final Value<double?> potassiumMg;
  final Value<double?> sodiumMg;
  final Value<double?> vitaminCMg;
  final Value<int> rowid;
  const IngredientsCompanion({
    this.id = const Value.absent(),
    this.name = const Value.absent(),
    this.category = const Value.absent(),
    this.shelfLifeDays = const Value.absent(),
    this.available = const Value.absent(),
    this.lastAvailable = const Value.absent(),
    this.servingUnit = const Value.absent(),
    this.servingSize = const Value.absent(),
    this.protein = const Value.absent(),
    this.carbs = const Value.absent(),
    this.fat = const Value.absent(),
    this.fiber = const Value.absent(),
    this.energy = const Value.absent(),
    this.ironMg = const Value.absent(),
    this.magnesiumMg = const Value.absent(),
    this.calciumMg = const Value.absent(),
    this.potassiumMg = const Value.absent(),
    this.sodiumMg = const Value.absent(),
    this.vitaminCMg = const Value.absent(),
    this.rowid = const Value.absent(),
  });
  IngredientsCompanion.insert({
    required String id,
    required String name,
    this.category = const Value.absent(),
    this.shelfLifeDays = const Value.absent(),
    this.available = const Value.absent(),
    this.lastAvailable = const Value.absent(),
    this.servingUnit = const Value.absent(),
    this.servingSize = const Value.absent(),
    this.protein = const Value.absent(),
    this.carbs = const Value.absent(),
    this.fat = const Value.absent(),
    this.fiber = const Value.absent(),
    this.energy = const Value.absent(),
    this.ironMg = const Value.absent(),
    this.magnesiumMg = const Value.absent(),
    this.calciumMg = const Value.absent(),
    this.potassiumMg = const Value.absent(),
    this.sodiumMg = const Value.absent(),
    this.vitaminCMg = const Value.absent(),
    this.rowid = const Value.absent(),
  })  : id = Value(id),
        name = Value(name);
  static Insertable<Ingredient> custom({
    Expression<String>? id,
    Expression<String>? name,
    Expression<String>? category,
    Expression<int>? shelfLifeDays,
    Expression<bool>? available,
    Expression<DateTime>? lastAvailable,
    Expression<String>? servingUnit,
    Expression<double>? servingSize,
    Expression<double>? protein,
    Expression<double>? carbs,
    Expression<double>? fat,
    Expression<double>? fiber,
    Expression<double>? energy,
    Expression<double>? ironMg,
    Expression<double>? magnesiumMg,
    Expression<double>? calciumMg,
    Expression<double>? potassiumMg,
    Expression<double>? sodiumMg,
    Expression<double>? vitaminCMg,
    Expression<int>? rowid,
  }) {
    return RawValuesInsertable({
      if (id != null) 'id': id,
      if (name != null) 'name': name,
      if (category != null) 'category': category,
      if (shelfLifeDays != null) 'shelf_life_days': shelfLifeDays,
      if (available != null) 'available': available,
      if (lastAvailable != null) 'last_available': lastAvailable,
      if (servingUnit != null) 'serving_unit': servingUnit,
      if (servingSize != null) 'serving_size': servingSize,
      if (protein != null) 'protein': protein,
      if (carbs != null) 'carbs': carbs,
      if (fat != null) 'fat': fat,
      if (fiber != null) 'fiber': fiber,
      if (energy != null) 'energy': energy,
      if (ironMg != null) 'iron_mg': ironMg,
      if (magnesiumMg != null) 'magnesium_mg': magnesiumMg,
      if (calciumMg != null) 'calcium_mg': calciumMg,
      if (potassiumMg != null) 'potassium_mg': potassiumMg,
      if (sodiumMg != null) 'sodium_mg': sodiumMg,
      if (vitaminCMg != null) 'vitamin_c_mg': vitaminCMg,
      if (rowid != null) 'rowid': rowid,
    });
  }

  IngredientsCompanion copyWith(
      {Value<String>? id,
      Value<String>? name,
      Value<String?>? category,
      Value<int?>? shelfLifeDays,
      Value<bool>? available,
      Value<DateTime?>? lastAvailable,
      Value<String?>? servingUnit,
      Value<double?>? servingSize,
      Value<double?>? protein,
      Value<double?>? carbs,
      Value<double?>? fat,
      Value<double?>? fiber,
      Value<double?>? energy,
      Value<double?>? ironMg,
      Value<double?>? magnesiumMg,
      Value<double?>? calciumMg,
      Value<double?>? potassiumMg,
      Value<double?>? sodiumMg,
      Value<double?>? vitaminCMg,
      Value<int>? rowid}) {
    return IngredientsCompanion(
      id: id ?? this.id,
      name: name ?? this.name,
      category: category ?? this.category,
      shelfLifeDays: shelfLifeDays ?? this.shelfLifeDays,
      available: available ?? this.available,
      lastAvailable: lastAvailable ?? this.lastAvailable,
      servingUnit: servingUnit ?? this.servingUnit,
      servingSize: servingSize ?? this.servingSize,
      protein: protein ?? this.protein,
      carbs: carbs ?? this.carbs,
      fat: fat ?? this.fat,
      fiber: fiber ?? this.fiber,
      energy: energy ?? this.energy,
      ironMg: ironMg ?? this.ironMg,
      magnesiumMg: magnesiumMg ?? this.magnesiumMg,
      calciumMg: calciumMg ?? this.calciumMg,
      potassiumMg: potassiumMg ?? this.potassiumMg,
      sodiumMg: sodiumMg ?? this.sodiumMg,
      vitaminCMg: vitaminCMg ?? this.vitaminCMg,
      rowid: rowid ?? this.rowid,
    );
  }

  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    if (id.present) {
      map['id'] = Variable<String>(id.value);
    }
    if (name.present) {
      map['name'] = Variable<String>(name.value);
    }
    if (category.present) {
      map['category'] = Variable<String>(category.value);
    }
    if (shelfLifeDays.present) {
      map['shelf_life_days'] = Variable<int>(shelfLifeDays.value);
    }
    if (available.present) {
      map['available'] = Variable<bool>(available.value);
    }
    if (lastAvailable.present) {
      map['last_available'] = Variable<DateTime>(lastAvailable.value);
    }
    if (servingUnit.present) {
      map['serving_unit'] = Variable<String>(servingUnit.value);
    }
    if (servingSize.present) {
      map['serving_size'] = Variable<double>(servingSize.value);
    }
    if (protein.present) {
      map['protein'] = Variable<double>(protein.value);
    }
    if (carbs.present) {
      map['carbs'] = Variable<double>(carbs.value);
    }
    if (fat.present) {
      map['fat'] = Variable<double>(fat.value);
    }
    if (fiber.present) {
      map['fiber'] = Variable<double>(fiber.value);
    }
    if (energy.present) {
      map['energy'] = Variable<double>(energy.value);
    }
    if (ironMg.present) {
      map['iron_mg'] = Variable<double>(ironMg.value);
    }
    if (magnesiumMg.present) {
      map['magnesium_mg'] = Variable<double>(magnesiumMg.value);
    }
    if (calciumMg.present) {
      map['calcium_mg'] = Variable<double>(calciumMg.value);
    }
    if (potassiumMg.present) {
      map['potassium_mg'] = Variable<double>(potassiumMg.value);
    }
    if (sodiumMg.present) {
      map['sodium_mg'] = Variable<double>(sodiumMg.value);
    }
    if (vitaminCMg.present) {
      map['vitamin_c_mg'] = Variable<double>(vitaminCMg.value);
    }
    if (rowid.present) {
      map['rowid'] = Variable<int>(rowid.value);
    }
    return map;
  }

  @override
  String toString() {
    return (StringBuffer('IngredientsCompanion(')
          ..write('id: $id, ')
          ..write('name: $name, ')
          ..write('category: $category, ')
          ..write('shelfLifeDays: $shelfLifeDays, ')
          ..write('available: $available, ')
          ..write('lastAvailable: $lastAvailable, ')
          ..write('servingUnit: $servingUnit, ')
          ..write('servingSize: $servingSize, ')
          ..write('protein: $protein, ')
          ..write('carbs: $carbs, ')
          ..write('fat: $fat, ')
          ..write('fiber: $fiber, ')
          ..write('energy: $energy, ')
          ..write('ironMg: $ironMg, ')
          ..write('magnesiumMg: $magnesiumMg, ')
          ..write('calciumMg: $calciumMg, ')
          ..write('potassiumMg: $potassiumMg, ')
          ..write('sodiumMg: $sodiumMg, ')
          ..write('vitaminCMg: $vitaminCMg, ')
          ..write('rowid: $rowid')
          ..write(')'))
        .toString();
  }
}

class $RecipesTable extends Recipes with TableInfo<$RecipesTable, Recipe> {
  @override
  final GeneratedDatabase attachedDatabase;
  final String? _alias;
  $RecipesTable(this.attachedDatabase, [this._alias]);
  static const VerificationMeta _idMeta = const VerificationMeta('id');
  @override
  late final GeneratedColumn<String> id = GeneratedColumn<String>(
      'id', aliasedName, false,
      type: DriftSqlType.string, requiredDuringInsert: true);
  static const VerificationMeta _nameMeta = const VerificationMeta('name');
  @override
  late final GeneratedColumn<String> name = GeneratedColumn<String>(
      'name', aliasedName, false,
      type: DriftSqlType.string, requiredDuringInsert: true);
  static const VerificationMeta _servesMeta = const VerificationMeta('serves');
  @override
  late final GeneratedColumn<int> serves = GeneratedColumn<int>(
      'serves', aliasedName, true,
      type: DriftSqlType.int, requiredDuringInsert: false);
  static const VerificationMeta _instructionsMeta =
      const VerificationMeta('instructions');
  @override
  late final GeneratedColumn<String> instructions = GeneratedColumn<String>(
      'instructions', aliasedName, true,
      type: DriftSqlType.string, requiredDuringInsert: false);
  static const VerificationMeta _mealTypeMeta =
      const VerificationMeta('mealType');
  @override
  late final GeneratedColumn<String> mealType = GeneratedColumn<String>(
      'meal_type', aliasedName, true,
      type: DriftSqlType.string, requiredDuringInsert: false);
  static const VerificationMeta _isVegetarianMeta =
      const VerificationMeta('isVegetarian');
  @override
  late final GeneratedColumn<bool> isVegetarian = GeneratedColumn<bool>(
      'is_vegetarian', aliasedName, true,
      type: DriftSqlType.bool,
      requiredDuringInsert: false,
      defaultConstraints: GeneratedColumn.constraintIsAlways(
          'CHECK ("is_vegetarian" IN (0, 1))'));
  static const VerificationMeta _proteinMeta =
      const VerificationMeta('protein');
  @override
  late final GeneratedColumn<double> protein = GeneratedColumn<double>(
      'protein', aliasedName, true,
      type: DriftSqlType.double, requiredDuringInsert: false);
  static const VerificationMeta _carbsMeta = const VerificationMeta('carbs');
  @override
  late final GeneratedColumn<double> carbs = GeneratedColumn<double>(
      'carbs', aliasedName, true,
      type: DriftSqlType.double, requiredDuringInsert: false);
  static const VerificationMeta _fatMeta = const VerificationMeta('fat');
  @override
  late final GeneratedColumn<double> fat = GeneratedColumn<double>(
      'fat', aliasedName, true,
      type: DriftSqlType.double, requiredDuringInsert: false);
  static const VerificationMeta _fiberMeta = const VerificationMeta('fiber');
  @override
  late final GeneratedColumn<double> fiber = GeneratedColumn<double>(
      'fiber', aliasedName, true,
      type: DriftSqlType.double, requiredDuringInsert: false);
  static const VerificationMeta _energyMeta = const VerificationMeta('energy');
  @override
  late final GeneratedColumn<double> energy = GeneratedColumn<double>(
      'energy', aliasedName, true,
      type: DriftSqlType.double, requiredDuringInsert: false);
  static const VerificationMeta _ironMgMeta = const VerificationMeta('ironMg');
  @override
  late final GeneratedColumn<double> ironMg = GeneratedColumn<double>(
      'iron_mg', aliasedName, true,
      type: DriftSqlType.double, requiredDuringInsert: false);
  static const VerificationMeta _magnesiumMgMeta =
      const VerificationMeta('magnesiumMg');
  @override
  late final GeneratedColumn<double> magnesiumMg = GeneratedColumn<double>(
      'magnesium_mg', aliasedName, true,
      type: DriftSqlType.double, requiredDuringInsert: false);
  static const VerificationMeta _calciumMgMeta =
      const VerificationMeta('calciumMg');
  @override
  late final GeneratedColumn<double> calciumMg = GeneratedColumn<double>(
      'calcium_mg', aliasedName, true,
      type: DriftSqlType.double, requiredDuringInsert: false);
  static const VerificationMeta _potassiumMgMeta =
      const VerificationMeta('potassiumMg');
  @override
  late final GeneratedColumn<double> potassiumMg = GeneratedColumn<double>(
      'potassium_mg', aliasedName, true,
      type: DriftSqlType.double, requiredDuringInsert: false);
  static const VerificationMeta _sodiumMgMeta =
      const VerificationMeta('sodiumMg');
  @override
  late final GeneratedColumn<double> sodiumMg = GeneratedColumn<double>(
      'sodium_mg', aliasedName, true,
      type: DriftSqlType.double, requiredDuringInsert: false);
  static const VerificationMeta _vitaminCMgMeta =
      const VerificationMeta('vitaminCMg');
  @override
  late final GeneratedColumn<double> vitaminCMg = GeneratedColumn<double>(
      'vitamin_c_mg', aliasedName, true,
      type: DriftSqlType.double, requiredDuringInsert: false);
  @override
  List<GeneratedColumn> get $columns => [
        id,
        name,
        serves,
        instructions,
        mealType,
        isVegetarian,
        protein,
        carbs,
        fat,
        fiber,
        energy,
        ironMg,
        magnesiumMg,
        calciumMg,
        potassiumMg,
        sodiumMg,
        vitaminCMg
      ];
  @override
  String get aliasedName => _alias ?? actualTableName;
  @override
  String get actualTableName => $name;
  static const String $name = 'recipes';
  @override
  VerificationContext validateIntegrity(Insertable<Recipe> instance,
      {bool isInserting = false}) {
    final context = VerificationContext();
    final data = instance.toColumns(true);
    if (data.containsKey('id')) {
      context.handle(_idMeta, id.isAcceptableOrUnknown(data['id']!, _idMeta));
    } else if (isInserting) {
      context.missing(_idMeta);
    }
    if (data.containsKey('name')) {
      context.handle(
          _nameMeta, name.isAcceptableOrUnknown(data['name']!, _nameMeta));
    } else if (isInserting) {
      context.missing(_nameMeta);
    }
    if (data.containsKey('serves')) {
      context.handle(_servesMeta,
          serves.isAcceptableOrUnknown(data['serves']!, _servesMeta));
    }
    if (data.containsKey('instructions')) {
      context.handle(
          _instructionsMeta,
          instructions.isAcceptableOrUnknown(
              data['instructions']!, _instructionsMeta));
    }
    if (data.containsKey('meal_type')) {
      context.handle(_mealTypeMeta,
          mealType.isAcceptableOrUnknown(data['meal_type']!, _mealTypeMeta));
    }
    if (data.containsKey('is_vegetarian')) {
      context.handle(
          _isVegetarianMeta,
          isVegetarian.isAcceptableOrUnknown(
              data['is_vegetarian']!, _isVegetarianMeta));
    }
    if (data.containsKey('protein')) {
      context.handle(_proteinMeta,
          protein.isAcceptableOrUnknown(data['protein']!, _proteinMeta));
    }
    if (data.containsKey('carbs')) {
      context.handle(
          _carbsMeta, carbs.isAcceptableOrUnknown(data['carbs']!, _carbsMeta));
    }
    if (data.containsKey('fat')) {
      context.handle(
          _fatMeta, fat.isAcceptableOrUnknown(data['fat']!, _fatMeta));
    }
    if (data.containsKey('fiber')) {
      context.handle(
          _fiberMeta, fiber.isAcceptableOrUnknown(data['fiber']!, _fiberMeta));
    }
    if (data.containsKey('energy')) {
      context.handle(_energyMeta,
          energy.isAcceptableOrUnknown(data['energy']!, _energyMeta));
    }
    if (data.containsKey('iron_mg')) {
      context.handle(_ironMgMeta,
          ironMg.isAcceptableOrUnknown(data['iron_mg']!, _ironMgMeta));
    }
    if (data.containsKey('magnesium_mg')) {
      context.handle(
          _magnesiumMgMeta,
          magnesiumMg.isAcceptableOrUnknown(
              data['magnesium_mg']!, _magnesiumMgMeta));
    }
    if (data.containsKey('calcium_mg')) {
      context.handle(_calciumMgMeta,
          calciumMg.isAcceptableOrUnknown(data['calcium_mg']!, _calciumMgMeta));
    }
    if (data.containsKey('potassium_mg')) {
      context.handle(
          _potassiumMgMeta,
          potassiumMg.isAcceptableOrUnknown(
              data['potassium_mg']!, _potassiumMgMeta));
    }
    if (data.containsKey('sodium_mg')) {
      context.handle(_sodiumMgMeta,
          sodiumMg.isAcceptableOrUnknown(data['sodium_mg']!, _sodiumMgMeta));
    }
    if (data.containsKey('vitamin_c_mg')) {
      context.handle(
          _vitaminCMgMeta,
          vitaminCMg.isAcceptableOrUnknown(
              data['vitamin_c_mg']!, _vitaminCMgMeta));
    }
    return context;
  }

  @override
  Set<GeneratedColumn> get $primaryKey => {id};
  @override
  Recipe map(Map<String, dynamic> data, {String? tablePrefix}) {
    final effectivePrefix = tablePrefix != null ? '$tablePrefix.' : '';
    return Recipe(
      id: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}id'])!,
      name: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}name'])!,
      serves: attachedDatabase.typeMapping
          .read(DriftSqlType.int, data['${effectivePrefix}serves']),
      instructions: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}instructions']),
      mealType: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}meal_type']),
      isVegetarian: attachedDatabase.typeMapping
          .read(DriftSqlType.bool, data['${effectivePrefix}is_vegetarian']),
      protein: attachedDatabase.typeMapping
          .read(DriftSqlType.double, data['${effectivePrefix}protein']),
      carbs: attachedDatabase.typeMapping
          .read(DriftSqlType.double, data['${effectivePrefix}carbs']),
      fat: attachedDatabase.typeMapping
          .read(DriftSqlType.double, data['${effectivePrefix}fat']),
      fiber: attachedDatabase.typeMapping
          .read(DriftSqlType.double, data['${effectivePrefix}fiber']),
      energy: attachedDatabase.typeMapping
          .read(DriftSqlType.double, data['${effectivePrefix}energy']),
      ironMg: attachedDatabase.typeMapping
          .read(DriftSqlType.double, data['${effectivePrefix}iron_mg']),
      magnesiumMg: attachedDatabase.typeMapping
          .read(DriftSqlType.double, data['${effectivePrefix}magnesium_mg']),
      calciumMg: attachedDatabase.typeMapping
          .read(DriftSqlType.double, data['${effectivePrefix}calcium_mg']),
      potassiumMg: attachedDatabase.typeMapping
          .read(DriftSqlType.double, data['${effectivePrefix}potassium_mg']),
      sodiumMg: attachedDatabase.typeMapping
          .read(DriftSqlType.double, data['${effectivePrefix}sodium_mg']),
      vitaminCMg: attachedDatabase.typeMapping
          .read(DriftSqlType.double, data['${effectivePrefix}vitamin_c_mg']),
    );
  }

  @override
  $RecipesTable createAlias(String alias) {
    return $RecipesTable(attachedDatabase, alias);
  }
}

class Recipe extends DataClass implements Insertable<Recipe> {
  final String id;
  final String name;
  final int? serves;
  final String? instructions;
  final String? mealType;
  final bool? isVegetarian;
  final double? protein;
  final double? carbs;
  final double? fat;
  final double? fiber;
  final double? energy;
  final double? ironMg;
  final double? magnesiumMg;
  final double? calciumMg;
  final double? potassiumMg;
  final double? sodiumMg;
  final double? vitaminCMg;
  const Recipe(
      {required this.id,
      required this.name,
      this.serves,
      this.instructions,
      this.mealType,
      this.isVegetarian,
      this.protein,
      this.carbs,
      this.fat,
      this.fiber,
      this.energy,
      this.ironMg,
      this.magnesiumMg,
      this.calciumMg,
      this.potassiumMg,
      this.sodiumMg,
      this.vitaminCMg});
  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    map['id'] = Variable<String>(id);
    map['name'] = Variable<String>(name);
    if (!nullToAbsent || serves != null) {
      map['serves'] = Variable<int>(serves);
    }
    if (!nullToAbsent || instructions != null) {
      map['instructions'] = Variable<String>(instructions);
    }
    if (!nullToAbsent || mealType != null) {
      map['meal_type'] = Variable<String>(mealType);
    }
    if (!nullToAbsent || isVegetarian != null) {
      map['is_vegetarian'] = Variable<bool>(isVegetarian);
    }
    if (!nullToAbsent || protein != null) {
      map['protein'] = Variable<double>(protein);
    }
    if (!nullToAbsent || carbs != null) {
      map['carbs'] = Variable<double>(carbs);
    }
    if (!nullToAbsent || fat != null) {
      map['fat'] = Variable<double>(fat);
    }
    if (!nullToAbsent || fiber != null) {
      map['fiber'] = Variable<double>(fiber);
    }
    if (!nullToAbsent || energy != null) {
      map['energy'] = Variable<double>(energy);
    }
    if (!nullToAbsent || ironMg != null) {
      map['iron_mg'] = Variable<double>(ironMg);
    }
    if (!nullToAbsent || magnesiumMg != null) {
      map['magnesium_mg'] = Variable<double>(magnesiumMg);
    }
    if (!nullToAbsent || calciumMg != null) {
      map['calcium_mg'] = Variable<double>(calciumMg);
    }
    if (!nullToAbsent || potassiumMg != null) {
      map['potassium_mg'] = Variable<double>(potassiumMg);
    }
    if (!nullToAbsent || sodiumMg != null) {
      map['sodium_mg'] = Variable<double>(sodiumMg);
    }
    if (!nullToAbsent || vitaminCMg != null) {
      map['vitamin_c_mg'] = Variable<double>(vitaminCMg);
    }
    return map;
  }

  RecipesCompanion toCompanion(bool nullToAbsent) {
    return RecipesCompanion(
      id: Value(id),
      name: Value(name),
      serves:
          serves == null && nullToAbsent ? const Value.absent() : Value(serves),
      instructions: instructions == null && nullToAbsent
          ? const Value.absent()
          : Value(instructions),
      mealType: mealType == null && nullToAbsent
          ? const Value.absent()
          : Value(mealType),
      isVegetarian: isVegetarian == null && nullToAbsent
          ? const Value.absent()
          : Value(isVegetarian),
      protein: protein == null && nullToAbsent
          ? const Value.absent()
          : Value(protein),
      carbs:
          carbs == null && nullToAbsent ? const Value.absent() : Value(carbs),
      fat: fat == null && nullToAbsent ? const Value.absent() : Value(fat),
      fiber:
          fiber == null && nullToAbsent ? const Value.absent() : Value(fiber),
      energy:
          energy == null && nullToAbsent ? const Value.absent() : Value(energy),
      ironMg:
          ironMg == null && nullToAbsent ? const Value.absent() : Value(ironMg),
      magnesiumMg: magnesiumMg == null && nullToAbsent
          ? const Value.absent()
          : Value(magnesiumMg),
      calciumMg: calciumMg == null && nullToAbsent
          ? const Value.absent()
          : Value(calciumMg),
      potassiumMg: potassiumMg == null && nullToAbsent
          ? const Value.absent()
          : Value(potassiumMg),
      sodiumMg: sodiumMg == null && nullToAbsent
          ? const Value.absent()
          : Value(sodiumMg),
      vitaminCMg: vitaminCMg == null && nullToAbsent
          ? const Value.absent()
          : Value(vitaminCMg),
    );
  }

  factory Recipe.fromJson(Map<String, dynamic> json,
      {ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return Recipe(
      id: serializer.fromJson<String>(json['id']),
      name: serializer.fromJson<String>(json['name']),
      serves: serializer.fromJson<int?>(json['serves']),
      instructions: serializer.fromJson<String?>(json['instructions']),
      mealType: serializer.fromJson<String?>(json['mealType']),
      isVegetarian: serializer.fromJson<bool?>(json['isVegetarian']),
      protein: serializer.fromJson<double?>(json['protein']),
      carbs: serializer.fromJson<double?>(json['carbs']),
      fat: serializer.fromJson<double?>(json['fat']),
      fiber: serializer.fromJson<double?>(json['fiber']),
      energy: serializer.fromJson<double?>(json['energy']),
      ironMg: serializer.fromJson<double?>(json['ironMg']),
      magnesiumMg: serializer.fromJson<double?>(json['magnesiumMg']),
      calciumMg: serializer.fromJson<double?>(json['calciumMg']),
      potassiumMg: serializer.fromJson<double?>(json['potassiumMg']),
      sodiumMg: serializer.fromJson<double?>(json['sodiumMg']),
      vitaminCMg: serializer.fromJson<double?>(json['vitaminCMg']),
    );
  }
  @override
  Map<String, dynamic> toJson({ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return <String, dynamic>{
      'id': serializer.toJson<String>(id),
      'name': serializer.toJson<String>(name),
      'serves': serializer.toJson<int?>(serves),
      'instructions': serializer.toJson<String?>(instructions),
      'mealType': serializer.toJson<String?>(mealType),
      'isVegetarian': serializer.toJson<bool?>(isVegetarian),
      'protein': serializer.toJson<double?>(protein),
      'carbs': serializer.toJson<double?>(carbs),
      'fat': serializer.toJson<double?>(fat),
      'fiber': serializer.toJson<double?>(fiber),
      'energy': serializer.toJson<double?>(energy),
      'ironMg': serializer.toJson<double?>(ironMg),
      'magnesiumMg': serializer.toJson<double?>(magnesiumMg),
      'calciumMg': serializer.toJson<double?>(calciumMg),
      'potassiumMg': serializer.toJson<double?>(potassiumMg),
      'sodiumMg': serializer.toJson<double?>(sodiumMg),
      'vitaminCMg': serializer.toJson<double?>(vitaminCMg),
    };
  }

  Recipe copyWith(
          {String? id,
          String? name,
          Value<int?> serves = const Value.absent(),
          Value<String?> instructions = const Value.absent(),
          Value<String?> mealType = const Value.absent(),
          Value<bool?> isVegetarian = const Value.absent(),
          Value<double?> protein = const Value.absent(),
          Value<double?> carbs = const Value.absent(),
          Value<double?> fat = const Value.absent(),
          Value<double?> fiber = const Value.absent(),
          Value<double?> energy = const Value.absent(),
          Value<double?> ironMg = const Value.absent(),
          Value<double?> magnesiumMg = const Value.absent(),
          Value<double?> calciumMg = const Value.absent(),
          Value<double?> potassiumMg = const Value.absent(),
          Value<double?> sodiumMg = const Value.absent(),
          Value<double?> vitaminCMg = const Value.absent()}) =>
      Recipe(
        id: id ?? this.id,
        name: name ?? this.name,
        serves: serves.present ? serves.value : this.serves,
        instructions:
            instructions.present ? instructions.value : this.instructions,
        mealType: mealType.present ? mealType.value : this.mealType,
        isVegetarian:
            isVegetarian.present ? isVegetarian.value : this.isVegetarian,
        protein: protein.present ? protein.value : this.protein,
        carbs: carbs.present ? carbs.value : this.carbs,
        fat: fat.present ? fat.value : this.fat,
        fiber: fiber.present ? fiber.value : this.fiber,
        energy: energy.present ? energy.value : this.energy,
        ironMg: ironMg.present ? ironMg.value : this.ironMg,
        magnesiumMg: magnesiumMg.present ? magnesiumMg.value : this.magnesiumMg,
        calciumMg: calciumMg.present ? calciumMg.value : this.calciumMg,
        potassiumMg: potassiumMg.present ? potassiumMg.value : this.potassiumMg,
        sodiumMg: sodiumMg.present ? sodiumMg.value : this.sodiumMg,
        vitaminCMg: vitaminCMg.present ? vitaminCMg.value : this.vitaminCMg,
      );
  Recipe copyWithCompanion(RecipesCompanion data) {
    return Recipe(
      id: data.id.present ? data.id.value : this.id,
      name: data.name.present ? data.name.value : this.name,
      serves: data.serves.present ? data.serves.value : this.serves,
      instructions: data.instructions.present
          ? data.instructions.value
          : this.instructions,
      mealType: data.mealType.present ? data.mealType.value : this.mealType,
      isVegetarian: data.isVegetarian.present
          ? data.isVegetarian.value
          : this.isVegetarian,
      protein: data.protein.present ? data.protein.value : this.protein,
      carbs: data.carbs.present ? data.carbs.value : this.carbs,
      fat: data.fat.present ? data.fat.value : this.fat,
      fiber: data.fiber.present ? data.fiber.value : this.fiber,
      energy: data.energy.present ? data.energy.value : this.energy,
      ironMg: data.ironMg.present ? data.ironMg.value : this.ironMg,
      magnesiumMg:
          data.magnesiumMg.present ? data.magnesiumMg.value : this.magnesiumMg,
      calciumMg: data.calciumMg.present ? data.calciumMg.value : this.calciumMg,
      potassiumMg:
          data.potassiumMg.present ? data.potassiumMg.value : this.potassiumMg,
      sodiumMg: data.sodiumMg.present ? data.sodiumMg.value : this.sodiumMg,
      vitaminCMg:
          data.vitaminCMg.present ? data.vitaminCMg.value : this.vitaminCMg,
    );
  }

  @override
  String toString() {
    return (StringBuffer('Recipe(')
          ..write('id: $id, ')
          ..write('name: $name, ')
          ..write('serves: $serves, ')
          ..write('instructions: $instructions, ')
          ..write('mealType: $mealType, ')
          ..write('isVegetarian: $isVegetarian, ')
          ..write('protein: $protein, ')
          ..write('carbs: $carbs, ')
          ..write('fat: $fat, ')
          ..write('fiber: $fiber, ')
          ..write('energy: $energy, ')
          ..write('ironMg: $ironMg, ')
          ..write('magnesiumMg: $magnesiumMg, ')
          ..write('calciumMg: $calciumMg, ')
          ..write('potassiumMg: $potassiumMg, ')
          ..write('sodiumMg: $sodiumMg, ')
          ..write('vitaminCMg: $vitaminCMg')
          ..write(')'))
        .toString();
  }

  @override
  int get hashCode => Object.hash(
      id,
      name,
      serves,
      instructions,
      mealType,
      isVegetarian,
      protein,
      carbs,
      fat,
      fiber,
      energy,
      ironMg,
      magnesiumMg,
      calciumMg,
      potassiumMg,
      sodiumMg,
      vitaminCMg);
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is Recipe &&
          other.id == this.id &&
          other.name == this.name &&
          other.serves == this.serves &&
          other.instructions == this.instructions &&
          other.mealType == this.mealType &&
          other.isVegetarian == this.isVegetarian &&
          other.protein == this.protein &&
          other.carbs == this.carbs &&
          other.fat == this.fat &&
          other.fiber == this.fiber &&
          other.energy == this.energy &&
          other.ironMg == this.ironMg &&
          other.magnesiumMg == this.magnesiumMg &&
          other.calciumMg == this.calciumMg &&
          other.potassiumMg == this.potassiumMg &&
          other.sodiumMg == this.sodiumMg &&
          other.vitaminCMg == this.vitaminCMg);
}

class RecipesCompanion extends UpdateCompanion<Recipe> {
  final Value<String> id;
  final Value<String> name;
  final Value<int?> serves;
  final Value<String?> instructions;
  final Value<String?> mealType;
  final Value<bool?> isVegetarian;
  final Value<double?> protein;
  final Value<double?> carbs;
  final Value<double?> fat;
  final Value<double?> fiber;
  final Value<double?> energy;
  final Value<double?> ironMg;
  final Value<double?> magnesiumMg;
  final Value<double?> calciumMg;
  final Value<double?> potassiumMg;
  final Value<double?> sodiumMg;
  final Value<double?> vitaminCMg;
  final Value<int> rowid;
  const RecipesCompanion({
    this.id = const Value.absent(),
    this.name = const Value.absent(),
    this.serves = const Value.absent(),
    this.instructions = const Value.absent(),
    this.mealType = const Value.absent(),
    this.isVegetarian = const Value.absent(),
    this.protein = const Value.absent(),
    this.carbs = const Value.absent(),
    this.fat = const Value.absent(),
    this.fiber = const Value.absent(),
    this.energy = const Value.absent(),
    this.ironMg = const Value.absent(),
    this.magnesiumMg = const Value.absent(),
    this.calciumMg = const Value.absent(),
    this.potassiumMg = const Value.absent(),
    this.sodiumMg = const Value.absent(),
    this.vitaminCMg = const Value.absent(),
    this.rowid = const Value.absent(),
  });
  RecipesCompanion.insert({
    required String id,
    required String name,
    this.serves = const Value.absent(),
    this.instructions = const Value.absent(),
    this.mealType = const Value.absent(),
    this.isVegetarian = const Value.absent(),
    this.protein = const Value.absent(),
    this.carbs = const Value.absent(),
    this.fat = const Value.absent(),
    this.fiber = const Value.absent(),
    this.energy = const Value.absent(),
    this.ironMg = const Value.absent(),
    this.magnesiumMg = const Value.absent(),
    this.calciumMg = const Value.absent(),
    this.potassiumMg = const Value.absent(),
    this.sodiumMg = const Value.absent(),
    this.vitaminCMg = const Value.absent(),
    this.rowid = const Value.absent(),
  })  : id = Value(id),
        name = Value(name);
  static Insertable<Recipe> custom({
    Expression<String>? id,
    Expression<String>? name,
    Expression<int>? serves,
    Expression<String>? instructions,
    Expression<String>? mealType,
    Expression<bool>? isVegetarian,
    Expression<double>? protein,
    Expression<double>? carbs,
    Expression<double>? fat,
    Expression<double>? fiber,
    Expression<double>? energy,
    Expression<double>? ironMg,
    Expression<double>? magnesiumMg,
    Expression<double>? calciumMg,
    Expression<double>? potassiumMg,
    Expression<double>? sodiumMg,
    Expression<double>? vitaminCMg,
    Expression<int>? rowid,
  }) {
    return RawValuesInsertable({
      if (id != null) 'id': id,
      if (name != null) 'name': name,
      if (serves != null) 'serves': serves,
      if (instructions != null) 'instructions': instructions,
      if (mealType != null) 'meal_type': mealType,
      if (isVegetarian != null) 'is_vegetarian': isVegetarian,
      if (protein != null) 'protein': protein,
      if (carbs != null) 'carbs': carbs,
      if (fat != null) 'fat': fat,
      if (fiber != null) 'fiber': fiber,
      if (energy != null) 'energy': energy,
      if (ironMg != null) 'iron_mg': ironMg,
      if (magnesiumMg != null) 'magnesium_mg': magnesiumMg,
      if (calciumMg != null) 'calcium_mg': calciumMg,
      if (potassiumMg != null) 'potassium_mg': potassiumMg,
      if (sodiumMg != null) 'sodium_mg': sodiumMg,
      if (vitaminCMg != null) 'vitamin_c_mg': vitaminCMg,
      if (rowid != null) 'rowid': rowid,
    });
  }

  RecipesCompanion copyWith(
      {Value<String>? id,
      Value<String>? name,
      Value<int?>? serves,
      Value<String?>? instructions,
      Value<String?>? mealType,
      Value<bool?>? isVegetarian,
      Value<double?>? protein,
      Value<double?>? carbs,
      Value<double?>? fat,
      Value<double?>? fiber,
      Value<double?>? energy,
      Value<double?>? ironMg,
      Value<double?>? magnesiumMg,
      Value<double?>? calciumMg,
      Value<double?>? potassiumMg,
      Value<double?>? sodiumMg,
      Value<double?>? vitaminCMg,
      Value<int>? rowid}) {
    return RecipesCompanion(
      id: id ?? this.id,
      name: name ?? this.name,
      serves: serves ?? this.serves,
      instructions: instructions ?? this.instructions,
      mealType: mealType ?? this.mealType,
      isVegetarian: isVegetarian ?? this.isVegetarian,
      protein: protein ?? this.protein,
      carbs: carbs ?? this.carbs,
      fat: fat ?? this.fat,
      fiber: fiber ?? this.fiber,
      energy: energy ?? this.energy,
      ironMg: ironMg ?? this.ironMg,
      magnesiumMg: magnesiumMg ?? this.magnesiumMg,
      calciumMg: calciumMg ?? this.calciumMg,
      potassiumMg: potassiumMg ?? this.potassiumMg,
      sodiumMg: sodiumMg ?? this.sodiumMg,
      vitaminCMg: vitaminCMg ?? this.vitaminCMg,
      rowid: rowid ?? this.rowid,
    );
  }

  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    if (id.present) {
      map['id'] = Variable<String>(id.value);
    }
    if (name.present) {
      map['name'] = Variable<String>(name.value);
    }
    if (serves.present) {
      map['serves'] = Variable<int>(serves.value);
    }
    if (instructions.present) {
      map['instructions'] = Variable<String>(instructions.value);
    }
    if (mealType.present) {
      map['meal_type'] = Variable<String>(mealType.value);
    }
    if (isVegetarian.present) {
      map['is_vegetarian'] = Variable<bool>(isVegetarian.value);
    }
    if (protein.present) {
      map['protein'] = Variable<double>(protein.value);
    }
    if (carbs.present) {
      map['carbs'] = Variable<double>(carbs.value);
    }
    if (fat.present) {
      map['fat'] = Variable<double>(fat.value);
    }
    if (fiber.present) {
      map['fiber'] = Variable<double>(fiber.value);
    }
    if (energy.present) {
      map['energy'] = Variable<double>(energy.value);
    }
    if (ironMg.present) {
      map['iron_mg'] = Variable<double>(ironMg.value);
    }
    if (magnesiumMg.present) {
      map['magnesium_mg'] = Variable<double>(magnesiumMg.value);
    }
    if (calciumMg.present) {
      map['calcium_mg'] = Variable<double>(calciumMg.value);
    }
    if (potassiumMg.present) {
      map['potassium_mg'] = Variable<double>(potassiumMg.value);
    }
    if (sodiumMg.present) {
      map['sodium_mg'] = Variable<double>(sodiumMg.value);
    }
    if (vitaminCMg.present) {
      map['vitamin_c_mg'] = Variable<double>(vitaminCMg.value);
    }
    if (rowid.present) {
      map['rowid'] = Variable<int>(rowid.value);
    }
    return map;
  }

  @override
  String toString() {
    return (StringBuffer('RecipesCompanion(')
          ..write('id: $id, ')
          ..write('name: $name, ')
          ..write('serves: $serves, ')
          ..write('instructions: $instructions, ')
          ..write('mealType: $mealType, ')
          ..write('isVegetarian: $isVegetarian, ')
          ..write('protein: $protein, ')
          ..write('carbs: $carbs, ')
          ..write('fat: $fat, ')
          ..write('fiber: $fiber, ')
          ..write('energy: $energy, ')
          ..write('ironMg: $ironMg, ')
          ..write('magnesiumMg: $magnesiumMg, ')
          ..write('calciumMg: $calciumMg, ')
          ..write('potassiumMg: $potassiumMg, ')
          ..write('sodiumMg: $sodiumMg, ')
          ..write('vitaminCMg: $vitaminCMg, ')
          ..write('rowid: $rowid')
          ..write(')'))
        .toString();
  }
}

class $RecipeIngredientsTable extends RecipeIngredients
    with TableInfo<$RecipeIngredientsTable, RecipeIngredient> {
  @override
  final GeneratedDatabase attachedDatabase;
  final String? _alias;
  $RecipeIngredientsTable(this.attachedDatabase, [this._alias]);
  static const VerificationMeta _idMeta = const VerificationMeta('id');
  @override
  late final GeneratedColumn<String> id = GeneratedColumn<String>(
      'id', aliasedName, false,
      type: DriftSqlType.string, requiredDuringInsert: true);
  static const VerificationMeta _recipeIdMeta =
      const VerificationMeta('recipeId');
  @override
  late final GeneratedColumn<String> recipeId = GeneratedColumn<String>(
      'recipe_id', aliasedName, false,
      type: DriftSqlType.string,
      requiredDuringInsert: true,
      defaultConstraints:
          GeneratedColumn.constraintIsAlways('REFERENCES recipes (id)'));
  static const VerificationMeta _ingredientIdMeta =
      const VerificationMeta('ingredientId');
  @override
  late final GeneratedColumn<String> ingredientId = GeneratedColumn<String>(
      'ingredient_id', aliasedName, false,
      type: DriftSqlType.string,
      requiredDuringInsert: true,
      defaultConstraints:
          GeneratedColumn.constraintIsAlways('REFERENCES ingredients (id)'));
  static const VerificationMeta _quantityMeta =
      const VerificationMeta('quantity');
  @override
  late final GeneratedColumn<double> quantity = GeneratedColumn<double>(
      'quantity', aliasedName, false,
      type: DriftSqlType.double, requiredDuringInsert: true);
  static const VerificationMeta _servingUnitMeta =
      const VerificationMeta('servingUnit');
  @override
  late final GeneratedColumn<String> servingUnit = GeneratedColumn<String>(
      'serving_unit', aliasedName, true,
      type: DriftSqlType.string, requiredDuringInsert: false);
  @override
  List<GeneratedColumn> get $columns =>
      [id, recipeId, ingredientId, quantity, servingUnit];
  @override
  String get aliasedName => _alias ?? actualTableName;
  @override
  String get actualTableName => $name;
  static const String $name = 'recipe_ingredients';
  @override
  VerificationContext validateIntegrity(Insertable<RecipeIngredient> instance,
      {bool isInserting = false}) {
    final context = VerificationContext();
    final data = instance.toColumns(true);
    if (data.containsKey('id')) {
      context.handle(_idMeta, id.isAcceptableOrUnknown(data['id']!, _idMeta));
    } else if (isInserting) {
      context.missing(_idMeta);
    }
    if (data.containsKey('recipe_id')) {
      context.handle(_recipeIdMeta,
          recipeId.isAcceptableOrUnknown(data['recipe_id']!, _recipeIdMeta));
    } else if (isInserting) {
      context.missing(_recipeIdMeta);
    }
    if (data.containsKey('ingredient_id')) {
      context.handle(
          _ingredientIdMeta,
          ingredientId.isAcceptableOrUnknown(
              data['ingredient_id']!, _ingredientIdMeta));
    } else if (isInserting) {
      context.missing(_ingredientIdMeta);
    }
    if (data.containsKey('quantity')) {
      context.handle(_quantityMeta,
          quantity.isAcceptableOrUnknown(data['quantity']!, _quantityMeta));
    } else if (isInserting) {
      context.missing(_quantityMeta);
    }
    if (data.containsKey('serving_unit')) {
      context.handle(
          _servingUnitMeta,
          servingUnit.isAcceptableOrUnknown(
              data['serving_unit']!, _servingUnitMeta));
    }
    return context;
  }

  @override
  Set<GeneratedColumn> get $primaryKey => {id};
  @override
  RecipeIngredient map(Map<String, dynamic> data, {String? tablePrefix}) {
    final effectivePrefix = tablePrefix != null ? '$tablePrefix.' : '';
    return RecipeIngredient(
      id: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}id'])!,
      recipeId: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}recipe_id'])!,
      ingredientId: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}ingredient_id'])!,
      quantity: attachedDatabase.typeMapping
          .read(DriftSqlType.double, data['${effectivePrefix}quantity'])!,
      servingUnit: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}serving_unit']),
    );
  }

  @override
  $RecipeIngredientsTable createAlias(String alias) {
    return $RecipeIngredientsTable(attachedDatabase, alias);
  }
}

class RecipeIngredient extends DataClass
    implements Insertable<RecipeIngredient> {
  final String id;
  final String recipeId;
  final String ingredientId;
  final double quantity;
  final String? servingUnit;
  const RecipeIngredient(
      {required this.id,
      required this.recipeId,
      required this.ingredientId,
      required this.quantity,
      this.servingUnit});
  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    map['id'] = Variable<String>(id);
    map['recipe_id'] = Variable<String>(recipeId);
    map['ingredient_id'] = Variable<String>(ingredientId);
    map['quantity'] = Variable<double>(quantity);
    if (!nullToAbsent || servingUnit != null) {
      map['serving_unit'] = Variable<String>(servingUnit);
    }
    return map;
  }

  RecipeIngredientsCompanion toCompanion(bool nullToAbsent) {
    return RecipeIngredientsCompanion(
      id: Value(id),
      recipeId: Value(recipeId),
      ingredientId: Value(ingredientId),
      quantity: Value(quantity),
      servingUnit: servingUnit == null && nullToAbsent
          ? const Value.absent()
          : Value(servingUnit),
    );
  }

  factory RecipeIngredient.fromJson(Map<String, dynamic> json,
      {ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return RecipeIngredient(
      id: serializer.fromJson<String>(json['id']),
      recipeId: serializer.fromJson<String>(json['recipeId']),
      ingredientId: serializer.fromJson<String>(json['ingredientId']),
      quantity: serializer.fromJson<double>(json['quantity']),
      servingUnit: serializer.fromJson<String?>(json['servingUnit']),
    );
  }
  @override
  Map<String, dynamic> toJson({ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return <String, dynamic>{
      'id': serializer.toJson<String>(id),
      'recipeId': serializer.toJson<String>(recipeId),
      'ingredientId': serializer.toJson<String>(ingredientId),
      'quantity': serializer.toJson<double>(quantity),
      'servingUnit': serializer.toJson<String?>(servingUnit),
    };
  }

  RecipeIngredient copyWith(
          {String? id,
          String? recipeId,
          String? ingredientId,
          double? quantity,
          Value<String?> servingUnit = const Value.absent()}) =>
      RecipeIngredient(
        id: id ?? this.id,
        recipeId: recipeId ?? this.recipeId,
        ingredientId: ingredientId ?? this.ingredientId,
        quantity: quantity ?? this.quantity,
        servingUnit: servingUnit.present ? servingUnit.value : this.servingUnit,
      );
  RecipeIngredient copyWithCompanion(RecipeIngredientsCompanion data) {
    return RecipeIngredient(
      id: data.id.present ? data.id.value : this.id,
      recipeId: data.recipeId.present ? data.recipeId.value : this.recipeId,
      ingredientId: data.ingredientId.present
          ? data.ingredientId.value
          : this.ingredientId,
      quantity: data.quantity.present ? data.quantity.value : this.quantity,
      servingUnit:
          data.servingUnit.present ? data.servingUnit.value : this.servingUnit,
    );
  }

  @override
  String toString() {
    return (StringBuffer('RecipeIngredient(')
          ..write('id: $id, ')
          ..write('recipeId: $recipeId, ')
          ..write('ingredientId: $ingredientId, ')
          ..write('quantity: $quantity, ')
          ..write('servingUnit: $servingUnit')
          ..write(')'))
        .toString();
  }

  @override
  int get hashCode =>
      Object.hash(id, recipeId, ingredientId, quantity, servingUnit);
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is RecipeIngredient &&
          other.id == this.id &&
          other.recipeId == this.recipeId &&
          other.ingredientId == this.ingredientId &&
          other.quantity == this.quantity &&
          other.servingUnit == this.servingUnit);
}

class RecipeIngredientsCompanion extends UpdateCompanion<RecipeIngredient> {
  final Value<String> id;
  final Value<String> recipeId;
  final Value<String> ingredientId;
  final Value<double> quantity;
  final Value<String?> servingUnit;
  final Value<int> rowid;
  const RecipeIngredientsCompanion({
    this.id = const Value.absent(),
    this.recipeId = const Value.absent(),
    this.ingredientId = const Value.absent(),
    this.quantity = const Value.absent(),
    this.servingUnit = const Value.absent(),
    this.rowid = const Value.absent(),
  });
  RecipeIngredientsCompanion.insert({
    required String id,
    required String recipeId,
    required String ingredientId,
    required double quantity,
    this.servingUnit = const Value.absent(),
    this.rowid = const Value.absent(),
  })  : id = Value(id),
        recipeId = Value(recipeId),
        ingredientId = Value(ingredientId),
        quantity = Value(quantity);
  static Insertable<RecipeIngredient> custom({
    Expression<String>? id,
    Expression<String>? recipeId,
    Expression<String>? ingredientId,
    Expression<double>? quantity,
    Expression<String>? servingUnit,
    Expression<int>? rowid,
  }) {
    return RawValuesInsertable({
      if (id != null) 'id': id,
      if (recipeId != null) 'recipe_id': recipeId,
      if (ingredientId != null) 'ingredient_id': ingredientId,
      if (quantity != null) 'quantity': quantity,
      if (servingUnit != null) 'serving_unit': servingUnit,
      if (rowid != null) 'rowid': rowid,
    });
  }

  RecipeIngredientsCompanion copyWith(
      {Value<String>? id,
      Value<String>? recipeId,
      Value<String>? ingredientId,
      Value<double>? quantity,
      Value<String?>? servingUnit,
      Value<int>? rowid}) {
    return RecipeIngredientsCompanion(
      id: id ?? this.id,
      recipeId: recipeId ?? this.recipeId,
      ingredientId: ingredientId ?? this.ingredientId,
      quantity: quantity ?? this.quantity,
      servingUnit: servingUnit ?? this.servingUnit,
      rowid: rowid ?? this.rowid,
    );
  }

  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    if (id.present) {
      map['id'] = Variable<String>(id.value);
    }
    if (recipeId.present) {
      map['recipe_id'] = Variable<String>(recipeId.value);
    }
    if (ingredientId.present) {
      map['ingredient_id'] = Variable<String>(ingredientId.value);
    }
    if (quantity.present) {
      map['quantity'] = Variable<double>(quantity.value);
    }
    if (servingUnit.present) {
      map['serving_unit'] = Variable<String>(servingUnit.value);
    }
    if (rowid.present) {
      map['rowid'] = Variable<int>(rowid.value);
    }
    return map;
  }

  @override
  String toString() {
    return (StringBuffer('RecipeIngredientsCompanion(')
          ..write('id: $id, ')
          ..write('recipeId: $recipeId, ')
          ..write('ingredientId: $ingredientId, ')
          ..write('quantity: $quantity, ')
          ..write('servingUnit: $servingUnit, ')
          ..write('rowid: $rowid')
          ..write(')'))
        .toString();
  }
}

class $WeeklyPlanItemsTable extends WeeklyPlanItems
    with TableInfo<$WeeklyPlanItemsTable, WeeklyPlanItem> {
  @override
  final GeneratedDatabase attachedDatabase;
  final String? _alias;
  $WeeklyPlanItemsTable(this.attachedDatabase, [this._alias]);
  static const VerificationMeta _idMeta = const VerificationMeta('id');
  @override
  late final GeneratedColumn<String> id = GeneratedColumn<String>(
      'id', aliasedName, false,
      type: DriftSqlType.string, requiredDuringInsert: true);
  static const VerificationMeta _dayMeta = const VerificationMeta('day');
  @override
  late final GeneratedColumn<String> day = GeneratedColumn<String>(
      'day', aliasedName, false,
      type: DriftSqlType.string, requiredDuringInsert: true);
  static const VerificationMeta _mealTypeMeta =
      const VerificationMeta('mealType');
  @override
  late final GeneratedColumn<String> mealType = GeneratedColumn<String>(
      'meal_type', aliasedName, false,
      type: DriftSqlType.string, requiredDuringInsert: true);
  static const VerificationMeta _recipeIdMeta =
      const VerificationMeta('recipeId');
  @override
  late final GeneratedColumn<String> recipeId = GeneratedColumn<String>(
      'recipe_id', aliasedName, false,
      type: DriftSqlType.string,
      requiredDuringInsert: true,
      defaultConstraints:
          GeneratedColumn.constraintIsAlways('REFERENCES recipes (id)'));
  @override
  List<GeneratedColumn> get $columns => [id, day, mealType, recipeId];
  @override
  String get aliasedName => _alias ?? actualTableName;
  @override
  String get actualTableName => $name;
  static const String $name = 'weekly_plan_items';
  @override
  VerificationContext validateIntegrity(Insertable<WeeklyPlanItem> instance,
      {bool isInserting = false}) {
    final context = VerificationContext();
    final data = instance.toColumns(true);
    if (data.containsKey('id')) {
      context.handle(_idMeta, id.isAcceptableOrUnknown(data['id']!, _idMeta));
    } else if (isInserting) {
      context.missing(_idMeta);
    }
    if (data.containsKey('day')) {
      context.handle(
          _dayMeta, day.isAcceptableOrUnknown(data['day']!, _dayMeta));
    } else if (isInserting) {
      context.missing(_dayMeta);
    }
    if (data.containsKey('meal_type')) {
      context.handle(_mealTypeMeta,
          mealType.isAcceptableOrUnknown(data['meal_type']!, _mealTypeMeta));
    } else if (isInserting) {
      context.missing(_mealTypeMeta);
    }
    if (data.containsKey('recipe_id')) {
      context.handle(_recipeIdMeta,
          recipeId.isAcceptableOrUnknown(data['recipe_id']!, _recipeIdMeta));
    } else if (isInserting) {
      context.missing(_recipeIdMeta);
    }
    return context;
  }

  @override
  Set<GeneratedColumn> get $primaryKey => {id};
  @override
  WeeklyPlanItem map(Map<String, dynamic> data, {String? tablePrefix}) {
    final effectivePrefix = tablePrefix != null ? '$tablePrefix.' : '';
    return WeeklyPlanItem(
      id: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}id'])!,
      day: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}day'])!,
      mealType: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}meal_type'])!,
      recipeId: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}recipe_id'])!,
    );
  }

  @override
  $WeeklyPlanItemsTable createAlias(String alias) {
    return $WeeklyPlanItemsTable(attachedDatabase, alias);
  }
}

class WeeklyPlanItem extends DataClass implements Insertable<WeeklyPlanItem> {
  final String id;
  final String day;
  final String mealType;
  final String recipeId;
  const WeeklyPlanItem(
      {required this.id,
      required this.day,
      required this.mealType,
      required this.recipeId});
  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    map['id'] = Variable<String>(id);
    map['day'] = Variable<String>(day);
    map['meal_type'] = Variable<String>(mealType);
    map['recipe_id'] = Variable<String>(recipeId);
    return map;
  }

  WeeklyPlanItemsCompanion toCompanion(bool nullToAbsent) {
    return WeeklyPlanItemsCompanion(
      id: Value(id),
      day: Value(day),
      mealType: Value(mealType),
      recipeId: Value(recipeId),
    );
  }

  factory WeeklyPlanItem.fromJson(Map<String, dynamic> json,
      {ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return WeeklyPlanItem(
      id: serializer.fromJson<String>(json['id']),
      day: serializer.fromJson<String>(json['day']),
      mealType: serializer.fromJson<String>(json['mealType']),
      recipeId: serializer.fromJson<String>(json['recipeId']),
    );
  }
  @override
  Map<String, dynamic> toJson({ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return <String, dynamic>{
      'id': serializer.toJson<String>(id),
      'day': serializer.toJson<String>(day),
      'mealType': serializer.toJson<String>(mealType),
      'recipeId': serializer.toJson<String>(recipeId),
    };
  }

  WeeklyPlanItem copyWith(
          {String? id, String? day, String? mealType, String? recipeId}) =>
      WeeklyPlanItem(
        id: id ?? this.id,
        day: day ?? this.day,
        mealType: mealType ?? this.mealType,
        recipeId: recipeId ?? this.recipeId,
      );
  WeeklyPlanItem copyWithCompanion(WeeklyPlanItemsCompanion data) {
    return WeeklyPlanItem(
      id: data.id.present ? data.id.value : this.id,
      day: data.day.present ? data.day.value : this.day,
      mealType: data.mealType.present ? data.mealType.value : this.mealType,
      recipeId: data.recipeId.present ? data.recipeId.value : this.recipeId,
    );
  }

  @override
  String toString() {
    return (StringBuffer('WeeklyPlanItem(')
          ..write('id: $id, ')
          ..write('day: $day, ')
          ..write('mealType: $mealType, ')
          ..write('recipeId: $recipeId')
          ..write(')'))
        .toString();
  }

  @override
  int get hashCode => Object.hash(id, day, mealType, recipeId);
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is WeeklyPlanItem &&
          other.id == this.id &&
          other.day == this.day &&
          other.mealType == this.mealType &&
          other.recipeId == this.recipeId);
}

class WeeklyPlanItemsCompanion extends UpdateCompanion<WeeklyPlanItem> {
  final Value<String> id;
  final Value<String> day;
  final Value<String> mealType;
  final Value<String> recipeId;
  final Value<int> rowid;
  const WeeklyPlanItemsCompanion({
    this.id = const Value.absent(),
    this.day = const Value.absent(),
    this.mealType = const Value.absent(),
    this.recipeId = const Value.absent(),
    this.rowid = const Value.absent(),
  });
  WeeklyPlanItemsCompanion.insert({
    required String id,
    required String day,
    required String mealType,
    required String recipeId,
    this.rowid = const Value.absent(),
  })  : id = Value(id),
        day = Value(day),
        mealType = Value(mealType),
        recipeId = Value(recipeId);
  static Insertable<WeeklyPlanItem> custom({
    Expression<String>? id,
    Expression<String>? day,
    Expression<String>? mealType,
    Expression<String>? recipeId,
    Expression<int>? rowid,
  }) {
    return RawValuesInsertable({
      if (id != null) 'id': id,
      if (day != null) 'day': day,
      if (mealType != null) 'meal_type': mealType,
      if (recipeId != null) 'recipe_id': recipeId,
      if (rowid != null) 'rowid': rowid,
    });
  }

  WeeklyPlanItemsCompanion copyWith(
      {Value<String>? id,
      Value<String>? day,
      Value<String>? mealType,
      Value<String>? recipeId,
      Value<int>? rowid}) {
    return WeeklyPlanItemsCompanion(
      id: id ?? this.id,
      day: day ?? this.day,
      mealType: mealType ?? this.mealType,
      recipeId: recipeId ?? this.recipeId,
      rowid: rowid ?? this.rowid,
    );
  }

  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    if (id.present) {
      map['id'] = Variable<String>(id.value);
    }
    if (day.present) {
      map['day'] = Variable<String>(day.value);
    }
    if (mealType.present) {
      map['meal_type'] = Variable<String>(mealType.value);
    }
    if (recipeId.present) {
      map['recipe_id'] = Variable<String>(recipeId.value);
    }
    if (rowid.present) {
      map['rowid'] = Variable<int>(rowid.value);
    }
    return map;
  }

  @override
  String toString() {
    return (StringBuffer('WeeklyPlanItemsCompanion(')
          ..write('id: $id, ')
          ..write('day: $day, ')
          ..write('mealType: $mealType, ')
          ..write('recipeId: $recipeId, ')
          ..write('rowid: $rowid')
          ..write(')'))
        .toString();
  }
}

class $KeyValuesTable extends KeyValues
    with TableInfo<$KeyValuesTable, KeyValue> {
  @override
  final GeneratedDatabase attachedDatabase;
  final String? _alias;
  $KeyValuesTable(this.attachedDatabase, [this._alias]);
  static const VerificationMeta _keyMeta = const VerificationMeta('key');
  @override
  late final GeneratedColumn<String> key = GeneratedColumn<String>(
      'key', aliasedName, false,
      type: DriftSqlType.string, requiredDuringInsert: true);
  static const VerificationMeta _valueMeta = const VerificationMeta('value');
  @override
  late final GeneratedColumn<String> value = GeneratedColumn<String>(
      'value', aliasedName, true,
      type: DriftSqlType.string, requiredDuringInsert: false);
  @override
  List<GeneratedColumn> get $columns => [key, value];
  @override
  String get aliasedName => _alias ?? actualTableName;
  @override
  String get actualTableName => $name;
  static const String $name = 'key_values';
  @override
  VerificationContext validateIntegrity(Insertable<KeyValue> instance,
      {bool isInserting = false}) {
    final context = VerificationContext();
    final data = instance.toColumns(true);
    if (data.containsKey('key')) {
      context.handle(
          _keyMeta, key.isAcceptableOrUnknown(data['key']!, _keyMeta));
    } else if (isInserting) {
      context.missing(_keyMeta);
    }
    if (data.containsKey('value')) {
      context.handle(
          _valueMeta, value.isAcceptableOrUnknown(data['value']!, _valueMeta));
    }
    return context;
  }

  @override
  Set<GeneratedColumn> get $primaryKey => {key};
  @override
  KeyValue map(Map<String, dynamic> data, {String? tablePrefix}) {
    final effectivePrefix = tablePrefix != null ? '$tablePrefix.' : '';
    return KeyValue(
      key: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}key'])!,
      value: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}value']),
    );
  }

  @override
  $KeyValuesTable createAlias(String alias) {
    return $KeyValuesTable(attachedDatabase, alias);
  }
}

class KeyValue extends DataClass implements Insertable<KeyValue> {
  final String key;
  final String? value;
  const KeyValue({required this.key, this.value});
  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    map['key'] = Variable<String>(key);
    if (!nullToAbsent || value != null) {
      map['value'] = Variable<String>(value);
    }
    return map;
  }

  KeyValuesCompanion toCompanion(bool nullToAbsent) {
    return KeyValuesCompanion(
      key: Value(key),
      value:
          value == null && nullToAbsent ? const Value.absent() : Value(value),
    );
  }

  factory KeyValue.fromJson(Map<String, dynamic> json,
      {ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return KeyValue(
      key: serializer.fromJson<String>(json['key']),
      value: serializer.fromJson<String?>(json['value']),
    );
  }
  @override
  Map<String, dynamic> toJson({ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return <String, dynamic>{
      'key': serializer.toJson<String>(key),
      'value': serializer.toJson<String?>(value),
    };
  }

  KeyValue copyWith(
          {String? key, Value<String?> value = const Value.absent()}) =>
      KeyValue(
        key: key ?? this.key,
        value: value.present ? value.value : this.value,
      );
  KeyValue copyWithCompanion(KeyValuesCompanion data) {
    return KeyValue(
      key: data.key.present ? data.key.value : this.key,
      value: data.value.present ? data.value.value : this.value,
    );
  }

  @override
  String toString() {
    return (StringBuffer('KeyValue(')
          ..write('key: $key, ')
          ..write('value: $value')
          ..write(')'))
        .toString();
  }

  @override
  int get hashCode => Object.hash(key, value);
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is KeyValue && other.key == this.key && other.value == this.value);
}

class KeyValuesCompanion extends UpdateCompanion<KeyValue> {
  final Value<String> key;
  final Value<String?> value;
  final Value<int> rowid;
  const KeyValuesCompanion({
    this.key = const Value.absent(),
    this.value = const Value.absent(),
    this.rowid = const Value.absent(),
  });
  KeyValuesCompanion.insert({
    required String key,
    this.value = const Value.absent(),
    this.rowid = const Value.absent(),
  }) : key = Value(key);
  static Insertable<KeyValue> custom({
    Expression<String>? key,
    Expression<String>? value,
    Expression<int>? rowid,
  }) {
    return RawValuesInsertable({
      if (key != null) 'key': key,
      if (value != null) 'value': value,
      if (rowid != null) 'rowid': rowid,
    });
  }

  KeyValuesCompanion copyWith(
      {Value<String>? key, Value<String?>? value, Value<int>? rowid}) {
    return KeyValuesCompanion(
      key: key ?? this.key,
      value: value ?? this.value,
      rowid: rowid ?? this.rowid,
    );
  }

  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    if (key.present) {
      map['key'] = Variable<String>(key.value);
    }
    if (value.present) {
      map['value'] = Variable<String>(value.value);
    }
    if (rowid.present) {
      map['rowid'] = Variable<int>(rowid.value);
    }
    return map;
  }

  @override
  String toString() {
    return (StringBuffer('KeyValuesCompanion(')
          ..write('key: $key, ')
          ..write('value: $value, ')
          ..write('rowid: $rowid')
          ..write(')'))
        .toString();
  }
}

abstract class _$AppDatabase extends GeneratedDatabase {
  _$AppDatabase(QueryExecutor e) : super(e);
  $AppDatabaseManager get managers => $AppDatabaseManager(this);
  late final $IngredientsTable ingredients = $IngredientsTable(this);
  late final $RecipesTable recipes = $RecipesTable(this);
  late final $RecipeIngredientsTable recipeIngredients =
      $RecipeIngredientsTable(this);
  late final $WeeklyPlanItemsTable weeklyPlanItems =
      $WeeklyPlanItemsTable(this);
  late final $KeyValuesTable keyValues = $KeyValuesTable(this);
  @override
  Iterable<TableInfo<Table, Object?>> get allTables =>
      allSchemaEntities.whereType<TableInfo<Table, Object?>>();
  @override
  List<DatabaseSchemaEntity> get allSchemaEntities =>
      [ingredients, recipes, recipeIngredients, weeklyPlanItems, keyValues];
}

typedef $$IngredientsTableCreateCompanionBuilder = IngredientsCompanion
    Function({
  required String id,
  required String name,
  Value<String?> category,
  Value<int?> shelfLifeDays,
  Value<bool> available,
  Value<DateTime?> lastAvailable,
  Value<String?> servingUnit,
  Value<double?> servingSize,
  Value<double?> protein,
  Value<double?> carbs,
  Value<double?> fat,
  Value<double?> fiber,
  Value<double?> energy,
  Value<double?> ironMg,
  Value<double?> magnesiumMg,
  Value<double?> calciumMg,
  Value<double?> potassiumMg,
  Value<double?> sodiumMg,
  Value<double?> vitaminCMg,
  Value<int> rowid,
});
typedef $$IngredientsTableUpdateCompanionBuilder = IngredientsCompanion
    Function({
  Value<String> id,
  Value<String> name,
  Value<String?> category,
  Value<int?> shelfLifeDays,
  Value<bool> available,
  Value<DateTime?> lastAvailable,
  Value<String?> servingUnit,
  Value<double?> servingSize,
  Value<double?> protein,
  Value<double?> carbs,
  Value<double?> fat,
  Value<double?> fiber,
  Value<double?> energy,
  Value<double?> ironMg,
  Value<double?> magnesiumMg,
  Value<double?> calciumMg,
  Value<double?> potassiumMg,
  Value<double?> sodiumMg,
  Value<double?> vitaminCMg,
  Value<int> rowid,
});

final class $$IngredientsTableReferences
    extends BaseReferences<_$AppDatabase, $IngredientsTable, Ingredient> {
  $$IngredientsTableReferences(super.$_db, super.$_table, super.$_typedResult);

  static MultiTypedResultKey<$RecipeIngredientsTable, List<RecipeIngredient>>
      _recipeIngredientsRefsTable(_$AppDatabase db) =>
          MultiTypedResultKey.fromTable(db.recipeIngredients,
              aliasName: $_aliasNameGenerator(
                  db.ingredients.id, db.recipeIngredients.ingredientId));

  $$RecipeIngredientsTableProcessedTableManager get recipeIngredientsRefs {
    final manager = $$RecipeIngredientsTableTableManager(
            $_db, $_db.recipeIngredients)
        .filter(
            (f) => f.ingredientId.id.sqlEquals($_itemColumn<String>('id')!));

    final cache =
        $_typedResult.readTableOrNull(_recipeIngredientsRefsTable($_db));
    return ProcessedTableManager(
        manager.$state.copyWith(prefetchedData: cache));
  }
}

class $$IngredientsTableFilterComposer
    extends Composer<_$AppDatabase, $IngredientsTable> {
  $$IngredientsTableFilterComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnFilters<String> get id => $composableBuilder(
      column: $table.id, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get name => $composableBuilder(
      column: $table.name, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get category => $composableBuilder(
      column: $table.category, builder: (column) => ColumnFilters(column));

  ColumnFilters<int> get shelfLifeDays => $composableBuilder(
      column: $table.shelfLifeDays, builder: (column) => ColumnFilters(column));

  ColumnFilters<bool> get available => $composableBuilder(
      column: $table.available, builder: (column) => ColumnFilters(column));

  ColumnFilters<DateTime> get lastAvailable => $composableBuilder(
      column: $table.lastAvailable, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get servingUnit => $composableBuilder(
      column: $table.servingUnit, builder: (column) => ColumnFilters(column));

  ColumnFilters<double> get servingSize => $composableBuilder(
      column: $table.servingSize, builder: (column) => ColumnFilters(column));

  ColumnFilters<double> get protein => $composableBuilder(
      column: $table.protein, builder: (column) => ColumnFilters(column));

  ColumnFilters<double> get carbs => $composableBuilder(
      column: $table.carbs, builder: (column) => ColumnFilters(column));

  ColumnFilters<double> get fat => $composableBuilder(
      column: $table.fat, builder: (column) => ColumnFilters(column));

  ColumnFilters<double> get fiber => $composableBuilder(
      column: $table.fiber, builder: (column) => ColumnFilters(column));

  ColumnFilters<double> get energy => $composableBuilder(
      column: $table.energy, builder: (column) => ColumnFilters(column));

  ColumnFilters<double> get ironMg => $composableBuilder(
      column: $table.ironMg, builder: (column) => ColumnFilters(column));

  ColumnFilters<double> get magnesiumMg => $composableBuilder(
      column: $table.magnesiumMg, builder: (column) => ColumnFilters(column));

  ColumnFilters<double> get calciumMg => $composableBuilder(
      column: $table.calciumMg, builder: (column) => ColumnFilters(column));

  ColumnFilters<double> get potassiumMg => $composableBuilder(
      column: $table.potassiumMg, builder: (column) => ColumnFilters(column));

  ColumnFilters<double> get sodiumMg => $composableBuilder(
      column: $table.sodiumMg, builder: (column) => ColumnFilters(column));

  ColumnFilters<double> get vitaminCMg => $composableBuilder(
      column: $table.vitaminCMg, builder: (column) => ColumnFilters(column));

  Expression<bool> recipeIngredientsRefs(
      Expression<bool> Function($$RecipeIngredientsTableFilterComposer f) f) {
    final $$RecipeIngredientsTableFilterComposer composer = $composerBuilder(
        composer: this,
        getCurrentColumn: (t) => t.id,
        referencedTable: $db.recipeIngredients,
        getReferencedColumn: (t) => t.ingredientId,
        builder: (joinBuilder,
                {$addJoinBuilderToRootComposer,
                $removeJoinBuilderFromRootComposer}) =>
            $$RecipeIngredientsTableFilterComposer(
              $db: $db,
              $table: $db.recipeIngredients,
              $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
              joinBuilder: joinBuilder,
              $removeJoinBuilderFromRootComposer:
                  $removeJoinBuilderFromRootComposer,
            ));
    return f(composer);
  }
}

class $$IngredientsTableOrderingComposer
    extends Composer<_$AppDatabase, $IngredientsTable> {
  $$IngredientsTableOrderingComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnOrderings<String> get id => $composableBuilder(
      column: $table.id, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get name => $composableBuilder(
      column: $table.name, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get category => $composableBuilder(
      column: $table.category, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<int> get shelfLifeDays => $composableBuilder(
      column: $table.shelfLifeDays,
      builder: (column) => ColumnOrderings(column));

  ColumnOrderings<bool> get available => $composableBuilder(
      column: $table.available, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<DateTime> get lastAvailable => $composableBuilder(
      column: $table.lastAvailable,
      builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get servingUnit => $composableBuilder(
      column: $table.servingUnit, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<double> get servingSize => $composableBuilder(
      column: $table.servingSize, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<double> get protein => $composableBuilder(
      column: $table.protein, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<double> get carbs => $composableBuilder(
      column: $table.carbs, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<double> get fat => $composableBuilder(
      column: $table.fat, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<double> get fiber => $composableBuilder(
      column: $table.fiber, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<double> get energy => $composableBuilder(
      column: $table.energy, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<double> get ironMg => $composableBuilder(
      column: $table.ironMg, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<double> get magnesiumMg => $composableBuilder(
      column: $table.magnesiumMg, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<double> get calciumMg => $composableBuilder(
      column: $table.calciumMg, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<double> get potassiumMg => $composableBuilder(
      column: $table.potassiumMg, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<double> get sodiumMg => $composableBuilder(
      column: $table.sodiumMg, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<double> get vitaminCMg => $composableBuilder(
      column: $table.vitaminCMg, builder: (column) => ColumnOrderings(column));
}

class $$IngredientsTableAnnotationComposer
    extends Composer<_$AppDatabase, $IngredientsTable> {
  $$IngredientsTableAnnotationComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  GeneratedColumn<String> get id =>
      $composableBuilder(column: $table.id, builder: (column) => column);

  GeneratedColumn<String> get name =>
      $composableBuilder(column: $table.name, builder: (column) => column);

  GeneratedColumn<String> get category =>
      $composableBuilder(column: $table.category, builder: (column) => column);

  GeneratedColumn<int> get shelfLifeDays => $composableBuilder(
      column: $table.shelfLifeDays, builder: (column) => column);

  GeneratedColumn<bool> get available =>
      $composableBuilder(column: $table.available, builder: (column) => column);

  GeneratedColumn<DateTime> get lastAvailable => $composableBuilder(
      column: $table.lastAvailable, builder: (column) => column);

  GeneratedColumn<String> get servingUnit => $composableBuilder(
      column: $table.servingUnit, builder: (column) => column);

  GeneratedColumn<double> get servingSize => $composableBuilder(
      column: $table.servingSize, builder: (column) => column);

  GeneratedColumn<double> get protein =>
      $composableBuilder(column: $table.protein, builder: (column) => column);

  GeneratedColumn<double> get carbs =>
      $composableBuilder(column: $table.carbs, builder: (column) => column);

  GeneratedColumn<double> get fat =>
      $composableBuilder(column: $table.fat, builder: (column) => column);

  GeneratedColumn<double> get fiber =>
      $composableBuilder(column: $table.fiber, builder: (column) => column);

  GeneratedColumn<double> get energy =>
      $composableBuilder(column: $table.energy, builder: (column) => column);

  GeneratedColumn<double> get ironMg =>
      $composableBuilder(column: $table.ironMg, builder: (column) => column);

  GeneratedColumn<double> get magnesiumMg => $composableBuilder(
      column: $table.magnesiumMg, builder: (column) => column);

  GeneratedColumn<double> get calciumMg =>
      $composableBuilder(column: $table.calciumMg, builder: (column) => column);

  GeneratedColumn<double> get potassiumMg => $composableBuilder(
      column: $table.potassiumMg, builder: (column) => column);

  GeneratedColumn<double> get sodiumMg =>
      $composableBuilder(column: $table.sodiumMg, builder: (column) => column);

  GeneratedColumn<double> get vitaminCMg => $composableBuilder(
      column: $table.vitaminCMg, builder: (column) => column);

  Expression<T> recipeIngredientsRefs<T extends Object>(
      Expression<T> Function($$RecipeIngredientsTableAnnotationComposer a) f) {
    final $$RecipeIngredientsTableAnnotationComposer composer =
        $composerBuilder(
            composer: this,
            getCurrentColumn: (t) => t.id,
            referencedTable: $db.recipeIngredients,
            getReferencedColumn: (t) => t.ingredientId,
            builder: (joinBuilder,
                    {$addJoinBuilderToRootComposer,
                    $removeJoinBuilderFromRootComposer}) =>
                $$RecipeIngredientsTableAnnotationComposer(
                  $db: $db,
                  $table: $db.recipeIngredients,
                  $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
                  joinBuilder: joinBuilder,
                  $removeJoinBuilderFromRootComposer:
                      $removeJoinBuilderFromRootComposer,
                ));
    return f(composer);
  }
}

class $$IngredientsTableTableManager extends RootTableManager<
    _$AppDatabase,
    $IngredientsTable,
    Ingredient,
    $$IngredientsTableFilterComposer,
    $$IngredientsTableOrderingComposer,
    $$IngredientsTableAnnotationComposer,
    $$IngredientsTableCreateCompanionBuilder,
    $$IngredientsTableUpdateCompanionBuilder,
    (Ingredient, $$IngredientsTableReferences),
    Ingredient,
    PrefetchHooks Function({bool recipeIngredientsRefs})> {
  $$IngredientsTableTableManager(_$AppDatabase db, $IngredientsTable table)
      : super(TableManagerState(
          db: db,
          table: table,
          createFilteringComposer: () =>
              $$IngredientsTableFilterComposer($db: db, $table: table),
          createOrderingComposer: () =>
              $$IngredientsTableOrderingComposer($db: db, $table: table),
          createComputedFieldComposer: () =>
              $$IngredientsTableAnnotationComposer($db: db, $table: table),
          updateCompanionCallback: ({
            Value<String> id = const Value.absent(),
            Value<String> name = const Value.absent(),
            Value<String?> category = const Value.absent(),
            Value<int?> shelfLifeDays = const Value.absent(),
            Value<bool> available = const Value.absent(),
            Value<DateTime?> lastAvailable = const Value.absent(),
            Value<String?> servingUnit = const Value.absent(),
            Value<double?> servingSize = const Value.absent(),
            Value<double?> protein = const Value.absent(),
            Value<double?> carbs = const Value.absent(),
            Value<double?> fat = const Value.absent(),
            Value<double?> fiber = const Value.absent(),
            Value<double?> energy = const Value.absent(),
            Value<double?> ironMg = const Value.absent(),
            Value<double?> magnesiumMg = const Value.absent(),
            Value<double?> calciumMg = const Value.absent(),
            Value<double?> potassiumMg = const Value.absent(),
            Value<double?> sodiumMg = const Value.absent(),
            Value<double?> vitaminCMg = const Value.absent(),
            Value<int> rowid = const Value.absent(),
          }) =>
              IngredientsCompanion(
            id: id,
            name: name,
            category: category,
            shelfLifeDays: shelfLifeDays,
            available: available,
            lastAvailable: lastAvailable,
            servingUnit: servingUnit,
            servingSize: servingSize,
            protein: protein,
            carbs: carbs,
            fat: fat,
            fiber: fiber,
            energy: energy,
            ironMg: ironMg,
            magnesiumMg: magnesiumMg,
            calciumMg: calciumMg,
            potassiumMg: potassiumMg,
            sodiumMg: sodiumMg,
            vitaminCMg: vitaminCMg,
            rowid: rowid,
          ),
          createCompanionCallback: ({
            required String id,
            required String name,
            Value<String?> category = const Value.absent(),
            Value<int?> shelfLifeDays = const Value.absent(),
            Value<bool> available = const Value.absent(),
            Value<DateTime?> lastAvailable = const Value.absent(),
            Value<String?> servingUnit = const Value.absent(),
            Value<double?> servingSize = const Value.absent(),
            Value<double?> protein = const Value.absent(),
            Value<double?> carbs = const Value.absent(),
            Value<double?> fat = const Value.absent(),
            Value<double?> fiber = const Value.absent(),
            Value<double?> energy = const Value.absent(),
            Value<double?> ironMg = const Value.absent(),
            Value<double?> magnesiumMg = const Value.absent(),
            Value<double?> calciumMg = const Value.absent(),
            Value<double?> potassiumMg = const Value.absent(),
            Value<double?> sodiumMg = const Value.absent(),
            Value<double?> vitaminCMg = const Value.absent(),
            Value<int> rowid = const Value.absent(),
          }) =>
              IngredientsCompanion.insert(
            id: id,
            name: name,
            category: category,
            shelfLifeDays: shelfLifeDays,
            available: available,
            lastAvailable: lastAvailable,
            servingUnit: servingUnit,
            servingSize: servingSize,
            protein: protein,
            carbs: carbs,
            fat: fat,
            fiber: fiber,
            energy: energy,
            ironMg: ironMg,
            magnesiumMg: magnesiumMg,
            calciumMg: calciumMg,
            potassiumMg: potassiumMg,
            sodiumMg: sodiumMg,
            vitaminCMg: vitaminCMg,
            rowid: rowid,
          ),
          withReferenceMapper: (p0) => p0
              .map((e) => (
                    e.readTable(table),
                    $$IngredientsTableReferences(db, table, e)
                  ))
              .toList(),
          prefetchHooksCallback: ({recipeIngredientsRefs = false}) {
            return PrefetchHooks(
              db: db,
              explicitlyWatchedTables: [
                if (recipeIngredientsRefs) db.recipeIngredients
              ],
              addJoins: null,
              getPrefetchedDataCallback: (items) async {
                return [
                  if (recipeIngredientsRefs)
                    await $_getPrefetchedData<Ingredient, $IngredientsTable,
                            RecipeIngredient>(
                        currentTable: table,
                        referencedTable: $$IngredientsTableReferences
                            ._recipeIngredientsRefsTable(db),
                        managerFromTypedResult: (p0) =>
                            $$IngredientsTableReferences(db, table, p0)
                                .recipeIngredientsRefs,
                        referencedItemsForCurrentItem:
                            (item, referencedItems) => referencedItems
                                .where((e) => e.ingredientId == item.id),
                        typedResults: items)
                ];
              },
            );
          },
        ));
}

typedef $$IngredientsTableProcessedTableManager = ProcessedTableManager<
    _$AppDatabase,
    $IngredientsTable,
    Ingredient,
    $$IngredientsTableFilterComposer,
    $$IngredientsTableOrderingComposer,
    $$IngredientsTableAnnotationComposer,
    $$IngredientsTableCreateCompanionBuilder,
    $$IngredientsTableUpdateCompanionBuilder,
    (Ingredient, $$IngredientsTableReferences),
    Ingredient,
    PrefetchHooks Function({bool recipeIngredientsRefs})>;
typedef $$RecipesTableCreateCompanionBuilder = RecipesCompanion Function({
  required String id,
  required String name,
  Value<int?> serves,
  Value<String?> instructions,
  Value<String?> mealType,
  Value<bool?> isVegetarian,
  Value<double?> protein,
  Value<double?> carbs,
  Value<double?> fat,
  Value<double?> fiber,
  Value<double?> energy,
  Value<double?> ironMg,
  Value<double?> magnesiumMg,
  Value<double?> calciumMg,
  Value<double?> potassiumMg,
  Value<double?> sodiumMg,
  Value<double?> vitaminCMg,
  Value<int> rowid,
});
typedef $$RecipesTableUpdateCompanionBuilder = RecipesCompanion Function({
  Value<String> id,
  Value<String> name,
  Value<int?> serves,
  Value<String?> instructions,
  Value<String?> mealType,
  Value<bool?> isVegetarian,
  Value<double?> protein,
  Value<double?> carbs,
  Value<double?> fat,
  Value<double?> fiber,
  Value<double?> energy,
  Value<double?> ironMg,
  Value<double?> magnesiumMg,
  Value<double?> calciumMg,
  Value<double?> potassiumMg,
  Value<double?> sodiumMg,
  Value<double?> vitaminCMg,
  Value<int> rowid,
});

final class $$RecipesTableReferences
    extends BaseReferences<_$AppDatabase, $RecipesTable, Recipe> {
  $$RecipesTableReferences(super.$_db, super.$_table, super.$_typedResult);

  static MultiTypedResultKey<$RecipeIngredientsTable, List<RecipeIngredient>>
      _recipeIngredientsRefsTable(_$AppDatabase db) =>
          MultiTypedResultKey.fromTable(db.recipeIngredients,
              aliasName: $_aliasNameGenerator(
                  db.recipes.id, db.recipeIngredients.recipeId));

  $$RecipeIngredientsTableProcessedTableManager get recipeIngredientsRefs {
    final manager = $$RecipeIngredientsTableTableManager(
            $_db, $_db.recipeIngredients)
        .filter((f) => f.recipeId.id.sqlEquals($_itemColumn<String>('id')!));

    final cache =
        $_typedResult.readTableOrNull(_recipeIngredientsRefsTable($_db));
    return ProcessedTableManager(
        manager.$state.copyWith(prefetchedData: cache));
  }

  static MultiTypedResultKey<$WeeklyPlanItemsTable, List<WeeklyPlanItem>>
      _weeklyPlanItemsRefsTable(_$AppDatabase db) =>
          MultiTypedResultKey.fromTable(db.weeklyPlanItems,
              aliasName: $_aliasNameGenerator(
                  db.recipes.id, db.weeklyPlanItems.recipeId));

  $$WeeklyPlanItemsTableProcessedTableManager get weeklyPlanItemsRefs {
    final manager = $$WeeklyPlanItemsTableTableManager(
            $_db, $_db.weeklyPlanItems)
        .filter((f) => f.recipeId.id.sqlEquals($_itemColumn<String>('id')!));

    final cache =
        $_typedResult.readTableOrNull(_weeklyPlanItemsRefsTable($_db));
    return ProcessedTableManager(
        manager.$state.copyWith(prefetchedData: cache));
  }
}

class $$RecipesTableFilterComposer
    extends Composer<_$AppDatabase, $RecipesTable> {
  $$RecipesTableFilterComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnFilters<String> get id => $composableBuilder(
      column: $table.id, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get name => $composableBuilder(
      column: $table.name, builder: (column) => ColumnFilters(column));

  ColumnFilters<int> get serves => $composableBuilder(
      column: $table.serves, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get instructions => $composableBuilder(
      column: $table.instructions, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get mealType => $composableBuilder(
      column: $table.mealType, builder: (column) => ColumnFilters(column));

  ColumnFilters<bool> get isVegetarian => $composableBuilder(
      column: $table.isVegetarian, builder: (column) => ColumnFilters(column));

  ColumnFilters<double> get protein => $composableBuilder(
      column: $table.protein, builder: (column) => ColumnFilters(column));

  ColumnFilters<double> get carbs => $composableBuilder(
      column: $table.carbs, builder: (column) => ColumnFilters(column));

  ColumnFilters<double> get fat => $composableBuilder(
      column: $table.fat, builder: (column) => ColumnFilters(column));

  ColumnFilters<double> get fiber => $composableBuilder(
      column: $table.fiber, builder: (column) => ColumnFilters(column));

  ColumnFilters<double> get energy => $composableBuilder(
      column: $table.energy, builder: (column) => ColumnFilters(column));

  ColumnFilters<double> get ironMg => $composableBuilder(
      column: $table.ironMg, builder: (column) => ColumnFilters(column));

  ColumnFilters<double> get magnesiumMg => $composableBuilder(
      column: $table.magnesiumMg, builder: (column) => ColumnFilters(column));

  ColumnFilters<double> get calciumMg => $composableBuilder(
      column: $table.calciumMg, builder: (column) => ColumnFilters(column));

  ColumnFilters<double> get potassiumMg => $composableBuilder(
      column: $table.potassiumMg, builder: (column) => ColumnFilters(column));

  ColumnFilters<double> get sodiumMg => $composableBuilder(
      column: $table.sodiumMg, builder: (column) => ColumnFilters(column));

  ColumnFilters<double> get vitaminCMg => $composableBuilder(
      column: $table.vitaminCMg, builder: (column) => ColumnFilters(column));

  Expression<bool> recipeIngredientsRefs(
      Expression<bool> Function($$RecipeIngredientsTableFilterComposer f) f) {
    final $$RecipeIngredientsTableFilterComposer composer = $composerBuilder(
        composer: this,
        getCurrentColumn: (t) => t.id,
        referencedTable: $db.recipeIngredients,
        getReferencedColumn: (t) => t.recipeId,
        builder: (joinBuilder,
                {$addJoinBuilderToRootComposer,
                $removeJoinBuilderFromRootComposer}) =>
            $$RecipeIngredientsTableFilterComposer(
              $db: $db,
              $table: $db.recipeIngredients,
              $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
              joinBuilder: joinBuilder,
              $removeJoinBuilderFromRootComposer:
                  $removeJoinBuilderFromRootComposer,
            ));
    return f(composer);
  }

  Expression<bool> weeklyPlanItemsRefs(
      Expression<bool> Function($$WeeklyPlanItemsTableFilterComposer f) f) {
    final $$WeeklyPlanItemsTableFilterComposer composer = $composerBuilder(
        composer: this,
        getCurrentColumn: (t) => t.id,
        referencedTable: $db.weeklyPlanItems,
        getReferencedColumn: (t) => t.recipeId,
        builder: (joinBuilder,
                {$addJoinBuilderToRootComposer,
                $removeJoinBuilderFromRootComposer}) =>
            $$WeeklyPlanItemsTableFilterComposer(
              $db: $db,
              $table: $db.weeklyPlanItems,
              $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
              joinBuilder: joinBuilder,
              $removeJoinBuilderFromRootComposer:
                  $removeJoinBuilderFromRootComposer,
            ));
    return f(composer);
  }
}

class $$RecipesTableOrderingComposer
    extends Composer<_$AppDatabase, $RecipesTable> {
  $$RecipesTableOrderingComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnOrderings<String> get id => $composableBuilder(
      column: $table.id, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get name => $composableBuilder(
      column: $table.name, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<int> get serves => $composableBuilder(
      column: $table.serves, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get instructions => $composableBuilder(
      column: $table.instructions,
      builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get mealType => $composableBuilder(
      column: $table.mealType, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<bool> get isVegetarian => $composableBuilder(
      column: $table.isVegetarian,
      builder: (column) => ColumnOrderings(column));

  ColumnOrderings<double> get protein => $composableBuilder(
      column: $table.protein, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<double> get carbs => $composableBuilder(
      column: $table.carbs, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<double> get fat => $composableBuilder(
      column: $table.fat, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<double> get fiber => $composableBuilder(
      column: $table.fiber, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<double> get energy => $composableBuilder(
      column: $table.energy, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<double> get ironMg => $composableBuilder(
      column: $table.ironMg, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<double> get magnesiumMg => $composableBuilder(
      column: $table.magnesiumMg, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<double> get calciumMg => $composableBuilder(
      column: $table.calciumMg, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<double> get potassiumMg => $composableBuilder(
      column: $table.potassiumMg, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<double> get sodiumMg => $composableBuilder(
      column: $table.sodiumMg, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<double> get vitaminCMg => $composableBuilder(
      column: $table.vitaminCMg, builder: (column) => ColumnOrderings(column));
}

class $$RecipesTableAnnotationComposer
    extends Composer<_$AppDatabase, $RecipesTable> {
  $$RecipesTableAnnotationComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  GeneratedColumn<String> get id =>
      $composableBuilder(column: $table.id, builder: (column) => column);

  GeneratedColumn<String> get name =>
      $composableBuilder(column: $table.name, builder: (column) => column);

  GeneratedColumn<int> get serves =>
      $composableBuilder(column: $table.serves, builder: (column) => column);

  GeneratedColumn<String> get instructions => $composableBuilder(
      column: $table.instructions, builder: (column) => column);

  GeneratedColumn<String> get mealType =>
      $composableBuilder(column: $table.mealType, builder: (column) => column);

  GeneratedColumn<bool> get isVegetarian => $composableBuilder(
      column: $table.isVegetarian, builder: (column) => column);

  GeneratedColumn<double> get protein =>
      $composableBuilder(column: $table.protein, builder: (column) => column);

  GeneratedColumn<double> get carbs =>
      $composableBuilder(column: $table.carbs, builder: (column) => column);

  GeneratedColumn<double> get fat =>
      $composableBuilder(column: $table.fat, builder: (column) => column);

  GeneratedColumn<double> get fiber =>
      $composableBuilder(column: $table.fiber, builder: (column) => column);

  GeneratedColumn<double> get energy =>
      $composableBuilder(column: $table.energy, builder: (column) => column);

  GeneratedColumn<double> get ironMg =>
      $composableBuilder(column: $table.ironMg, builder: (column) => column);

  GeneratedColumn<double> get magnesiumMg => $composableBuilder(
      column: $table.magnesiumMg, builder: (column) => column);

  GeneratedColumn<double> get calciumMg =>
      $composableBuilder(column: $table.calciumMg, builder: (column) => column);

  GeneratedColumn<double> get potassiumMg => $composableBuilder(
      column: $table.potassiumMg, builder: (column) => column);

  GeneratedColumn<double> get sodiumMg =>
      $composableBuilder(column: $table.sodiumMg, builder: (column) => column);

  GeneratedColumn<double> get vitaminCMg => $composableBuilder(
      column: $table.vitaminCMg, builder: (column) => column);

  Expression<T> recipeIngredientsRefs<T extends Object>(
      Expression<T> Function($$RecipeIngredientsTableAnnotationComposer a) f) {
    final $$RecipeIngredientsTableAnnotationComposer composer =
        $composerBuilder(
            composer: this,
            getCurrentColumn: (t) => t.id,
            referencedTable: $db.recipeIngredients,
            getReferencedColumn: (t) => t.recipeId,
            builder: (joinBuilder,
                    {$addJoinBuilderToRootComposer,
                    $removeJoinBuilderFromRootComposer}) =>
                $$RecipeIngredientsTableAnnotationComposer(
                  $db: $db,
                  $table: $db.recipeIngredients,
                  $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
                  joinBuilder: joinBuilder,
                  $removeJoinBuilderFromRootComposer:
                      $removeJoinBuilderFromRootComposer,
                ));
    return f(composer);
  }

  Expression<T> weeklyPlanItemsRefs<T extends Object>(
      Expression<T> Function($$WeeklyPlanItemsTableAnnotationComposer a) f) {
    final $$WeeklyPlanItemsTableAnnotationComposer composer = $composerBuilder(
        composer: this,
        getCurrentColumn: (t) => t.id,
        referencedTable: $db.weeklyPlanItems,
        getReferencedColumn: (t) => t.recipeId,
        builder: (joinBuilder,
                {$addJoinBuilderToRootComposer,
                $removeJoinBuilderFromRootComposer}) =>
            $$WeeklyPlanItemsTableAnnotationComposer(
              $db: $db,
              $table: $db.weeklyPlanItems,
              $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
              joinBuilder: joinBuilder,
              $removeJoinBuilderFromRootComposer:
                  $removeJoinBuilderFromRootComposer,
            ));
    return f(composer);
  }
}

class $$RecipesTableTableManager extends RootTableManager<
    _$AppDatabase,
    $RecipesTable,
    Recipe,
    $$RecipesTableFilterComposer,
    $$RecipesTableOrderingComposer,
    $$RecipesTableAnnotationComposer,
    $$RecipesTableCreateCompanionBuilder,
    $$RecipesTableUpdateCompanionBuilder,
    (Recipe, $$RecipesTableReferences),
    Recipe,
    PrefetchHooks Function(
        {bool recipeIngredientsRefs, bool weeklyPlanItemsRefs})> {
  $$RecipesTableTableManager(_$AppDatabase db, $RecipesTable table)
      : super(TableManagerState(
          db: db,
          table: table,
          createFilteringComposer: () =>
              $$RecipesTableFilterComposer($db: db, $table: table),
          createOrderingComposer: () =>
              $$RecipesTableOrderingComposer($db: db, $table: table),
          createComputedFieldComposer: () =>
              $$RecipesTableAnnotationComposer($db: db, $table: table),
          updateCompanionCallback: ({
            Value<String> id = const Value.absent(),
            Value<String> name = const Value.absent(),
            Value<int?> serves = const Value.absent(),
            Value<String?> instructions = const Value.absent(),
            Value<String?> mealType = const Value.absent(),
            Value<bool?> isVegetarian = const Value.absent(),
            Value<double?> protein = const Value.absent(),
            Value<double?> carbs = const Value.absent(),
            Value<double?> fat = const Value.absent(),
            Value<double?> fiber = const Value.absent(),
            Value<double?> energy = const Value.absent(),
            Value<double?> ironMg = const Value.absent(),
            Value<double?> magnesiumMg = const Value.absent(),
            Value<double?> calciumMg = const Value.absent(),
            Value<double?> potassiumMg = const Value.absent(),
            Value<double?> sodiumMg = const Value.absent(),
            Value<double?> vitaminCMg = const Value.absent(),
            Value<int> rowid = const Value.absent(),
          }) =>
              RecipesCompanion(
            id: id,
            name: name,
            serves: serves,
            instructions: instructions,
            mealType: mealType,
            isVegetarian: isVegetarian,
            protein: protein,
            carbs: carbs,
            fat: fat,
            fiber: fiber,
            energy: energy,
            ironMg: ironMg,
            magnesiumMg: magnesiumMg,
            calciumMg: calciumMg,
            potassiumMg: potassiumMg,
            sodiumMg: sodiumMg,
            vitaminCMg: vitaminCMg,
            rowid: rowid,
          ),
          createCompanionCallback: ({
            required String id,
            required String name,
            Value<int?> serves = const Value.absent(),
            Value<String?> instructions = const Value.absent(),
            Value<String?> mealType = const Value.absent(),
            Value<bool?> isVegetarian = const Value.absent(),
            Value<double?> protein = const Value.absent(),
            Value<double?> carbs = const Value.absent(),
            Value<double?> fat = const Value.absent(),
            Value<double?> fiber = const Value.absent(),
            Value<double?> energy = const Value.absent(),
            Value<double?> ironMg = const Value.absent(),
            Value<double?> magnesiumMg = const Value.absent(),
            Value<double?> calciumMg = const Value.absent(),
            Value<double?> potassiumMg = const Value.absent(),
            Value<double?> sodiumMg = const Value.absent(),
            Value<double?> vitaminCMg = const Value.absent(),
            Value<int> rowid = const Value.absent(),
          }) =>
              RecipesCompanion.insert(
            id: id,
            name: name,
            serves: serves,
            instructions: instructions,
            mealType: mealType,
            isVegetarian: isVegetarian,
            protein: protein,
            carbs: carbs,
            fat: fat,
            fiber: fiber,
            energy: energy,
            ironMg: ironMg,
            magnesiumMg: magnesiumMg,
            calciumMg: calciumMg,
            potassiumMg: potassiumMg,
            sodiumMg: sodiumMg,
            vitaminCMg: vitaminCMg,
            rowid: rowid,
          ),
          withReferenceMapper: (p0) => p0
              .map((e) =>
                  (e.readTable(table), $$RecipesTableReferences(db, table, e)))
              .toList(),
          prefetchHooksCallback: (
              {recipeIngredientsRefs = false, weeklyPlanItemsRefs = false}) {
            return PrefetchHooks(
              db: db,
              explicitlyWatchedTables: [
                if (recipeIngredientsRefs) db.recipeIngredients,
                if (weeklyPlanItemsRefs) db.weeklyPlanItems
              ],
              addJoins: null,
              getPrefetchedDataCallback: (items) async {
                return [
                  if (recipeIngredientsRefs)
                    await $_getPrefetchedData<Recipe, $RecipesTable,
                            RecipeIngredient>(
                        currentTable: table,
                        referencedTable: $$RecipesTableReferences
                            ._recipeIngredientsRefsTable(db),
                        managerFromTypedResult: (p0) =>
                            $$RecipesTableReferences(db, table, p0)
                                .recipeIngredientsRefs,
                        referencedItemsForCurrentItem: (item,
                                referencedItems) =>
                            referencedItems.where((e) => e.recipeId == item.id),
                        typedResults: items),
                  if (weeklyPlanItemsRefs)
                    await $_getPrefetchedData<Recipe, $RecipesTable,
                            WeeklyPlanItem>(
                        currentTable: table,
                        referencedTable: $$RecipesTableReferences
                            ._weeklyPlanItemsRefsTable(db),
                        managerFromTypedResult: (p0) =>
                            $$RecipesTableReferences(db, table, p0)
                                .weeklyPlanItemsRefs,
                        referencedItemsForCurrentItem: (item,
                                referencedItems) =>
                            referencedItems.where((e) => e.recipeId == item.id),
                        typedResults: items)
                ];
              },
            );
          },
        ));
}

typedef $$RecipesTableProcessedTableManager = ProcessedTableManager<
    _$AppDatabase,
    $RecipesTable,
    Recipe,
    $$RecipesTableFilterComposer,
    $$RecipesTableOrderingComposer,
    $$RecipesTableAnnotationComposer,
    $$RecipesTableCreateCompanionBuilder,
    $$RecipesTableUpdateCompanionBuilder,
    (Recipe, $$RecipesTableReferences),
    Recipe,
    PrefetchHooks Function(
        {bool recipeIngredientsRefs, bool weeklyPlanItemsRefs})>;
typedef $$RecipeIngredientsTableCreateCompanionBuilder
    = RecipeIngredientsCompanion Function({
  required String id,
  required String recipeId,
  required String ingredientId,
  required double quantity,
  Value<String?> servingUnit,
  Value<int> rowid,
});
typedef $$RecipeIngredientsTableUpdateCompanionBuilder
    = RecipeIngredientsCompanion Function({
  Value<String> id,
  Value<String> recipeId,
  Value<String> ingredientId,
  Value<double> quantity,
  Value<String?> servingUnit,
  Value<int> rowid,
});

final class $$RecipeIngredientsTableReferences extends BaseReferences<
    _$AppDatabase, $RecipeIngredientsTable, RecipeIngredient> {
  $$RecipeIngredientsTableReferences(
      super.$_db, super.$_table, super.$_typedResult);

  static $RecipesTable _recipeIdTable(_$AppDatabase db) =>
      db.recipes.createAlias(
          $_aliasNameGenerator(db.recipeIngredients.recipeId, db.recipes.id));

  $$RecipesTableProcessedTableManager get recipeId {
    final $_column = $_itemColumn<String>('recipe_id')!;

    final manager = $$RecipesTableTableManager($_db, $_db.recipes)
        .filter((f) => f.id.sqlEquals($_column));
    final item = $_typedResult.readTableOrNull(_recipeIdTable($_db));
    if (item == null) return manager;
    return ProcessedTableManager(
        manager.$state.copyWith(prefetchedData: [item]));
  }

  static $IngredientsTable _ingredientIdTable(_$AppDatabase db) =>
      db.ingredients.createAlias($_aliasNameGenerator(
          db.recipeIngredients.ingredientId, db.ingredients.id));

  $$IngredientsTableProcessedTableManager get ingredientId {
    final $_column = $_itemColumn<String>('ingredient_id')!;

    final manager = $$IngredientsTableTableManager($_db, $_db.ingredients)
        .filter((f) => f.id.sqlEquals($_column));
    final item = $_typedResult.readTableOrNull(_ingredientIdTable($_db));
    if (item == null) return manager;
    return ProcessedTableManager(
        manager.$state.copyWith(prefetchedData: [item]));
  }
}

class $$RecipeIngredientsTableFilterComposer
    extends Composer<_$AppDatabase, $RecipeIngredientsTable> {
  $$RecipeIngredientsTableFilterComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnFilters<String> get id => $composableBuilder(
      column: $table.id, builder: (column) => ColumnFilters(column));

  ColumnFilters<double> get quantity => $composableBuilder(
      column: $table.quantity, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get servingUnit => $composableBuilder(
      column: $table.servingUnit, builder: (column) => ColumnFilters(column));

  $$RecipesTableFilterComposer get recipeId {
    final $$RecipesTableFilterComposer composer = $composerBuilder(
        composer: this,
        getCurrentColumn: (t) => t.recipeId,
        referencedTable: $db.recipes,
        getReferencedColumn: (t) => t.id,
        builder: (joinBuilder,
                {$addJoinBuilderToRootComposer,
                $removeJoinBuilderFromRootComposer}) =>
            $$RecipesTableFilterComposer(
              $db: $db,
              $table: $db.recipes,
              $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
              joinBuilder: joinBuilder,
              $removeJoinBuilderFromRootComposer:
                  $removeJoinBuilderFromRootComposer,
            ));
    return composer;
  }

  $$IngredientsTableFilterComposer get ingredientId {
    final $$IngredientsTableFilterComposer composer = $composerBuilder(
        composer: this,
        getCurrentColumn: (t) => t.ingredientId,
        referencedTable: $db.ingredients,
        getReferencedColumn: (t) => t.id,
        builder: (joinBuilder,
                {$addJoinBuilderToRootComposer,
                $removeJoinBuilderFromRootComposer}) =>
            $$IngredientsTableFilterComposer(
              $db: $db,
              $table: $db.ingredients,
              $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
              joinBuilder: joinBuilder,
              $removeJoinBuilderFromRootComposer:
                  $removeJoinBuilderFromRootComposer,
            ));
    return composer;
  }
}

class $$RecipeIngredientsTableOrderingComposer
    extends Composer<_$AppDatabase, $RecipeIngredientsTable> {
  $$RecipeIngredientsTableOrderingComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnOrderings<String> get id => $composableBuilder(
      column: $table.id, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<double> get quantity => $composableBuilder(
      column: $table.quantity, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get servingUnit => $composableBuilder(
      column: $table.servingUnit, builder: (column) => ColumnOrderings(column));

  $$RecipesTableOrderingComposer get recipeId {
    final $$RecipesTableOrderingComposer composer = $composerBuilder(
        composer: this,
        getCurrentColumn: (t) => t.recipeId,
        referencedTable: $db.recipes,
        getReferencedColumn: (t) => t.id,
        builder: (joinBuilder,
                {$addJoinBuilderToRootComposer,
                $removeJoinBuilderFromRootComposer}) =>
            $$RecipesTableOrderingComposer(
              $db: $db,
              $table: $db.recipes,
              $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
              joinBuilder: joinBuilder,
              $removeJoinBuilderFromRootComposer:
                  $removeJoinBuilderFromRootComposer,
            ));
    return composer;
  }

  $$IngredientsTableOrderingComposer get ingredientId {
    final $$IngredientsTableOrderingComposer composer = $composerBuilder(
        composer: this,
        getCurrentColumn: (t) => t.ingredientId,
        referencedTable: $db.ingredients,
        getReferencedColumn: (t) => t.id,
        builder: (joinBuilder,
                {$addJoinBuilderToRootComposer,
                $removeJoinBuilderFromRootComposer}) =>
            $$IngredientsTableOrderingComposer(
              $db: $db,
              $table: $db.ingredients,
              $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
              joinBuilder: joinBuilder,
              $removeJoinBuilderFromRootComposer:
                  $removeJoinBuilderFromRootComposer,
            ));
    return composer;
  }
}

class $$RecipeIngredientsTableAnnotationComposer
    extends Composer<_$AppDatabase, $RecipeIngredientsTable> {
  $$RecipeIngredientsTableAnnotationComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  GeneratedColumn<String> get id =>
      $composableBuilder(column: $table.id, builder: (column) => column);

  GeneratedColumn<double> get quantity =>
      $composableBuilder(column: $table.quantity, builder: (column) => column);

  GeneratedColumn<String> get servingUnit => $composableBuilder(
      column: $table.servingUnit, builder: (column) => column);

  $$RecipesTableAnnotationComposer get recipeId {
    final $$RecipesTableAnnotationComposer composer = $composerBuilder(
        composer: this,
        getCurrentColumn: (t) => t.recipeId,
        referencedTable: $db.recipes,
        getReferencedColumn: (t) => t.id,
        builder: (joinBuilder,
                {$addJoinBuilderToRootComposer,
                $removeJoinBuilderFromRootComposer}) =>
            $$RecipesTableAnnotationComposer(
              $db: $db,
              $table: $db.recipes,
              $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
              joinBuilder: joinBuilder,
              $removeJoinBuilderFromRootComposer:
                  $removeJoinBuilderFromRootComposer,
            ));
    return composer;
  }

  $$IngredientsTableAnnotationComposer get ingredientId {
    final $$IngredientsTableAnnotationComposer composer = $composerBuilder(
        composer: this,
        getCurrentColumn: (t) => t.ingredientId,
        referencedTable: $db.ingredients,
        getReferencedColumn: (t) => t.id,
        builder: (joinBuilder,
                {$addJoinBuilderToRootComposer,
                $removeJoinBuilderFromRootComposer}) =>
            $$IngredientsTableAnnotationComposer(
              $db: $db,
              $table: $db.ingredients,
              $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
              joinBuilder: joinBuilder,
              $removeJoinBuilderFromRootComposer:
                  $removeJoinBuilderFromRootComposer,
            ));
    return composer;
  }
}

class $$RecipeIngredientsTableTableManager extends RootTableManager<
    _$AppDatabase,
    $RecipeIngredientsTable,
    RecipeIngredient,
    $$RecipeIngredientsTableFilterComposer,
    $$RecipeIngredientsTableOrderingComposer,
    $$RecipeIngredientsTableAnnotationComposer,
    $$RecipeIngredientsTableCreateCompanionBuilder,
    $$RecipeIngredientsTableUpdateCompanionBuilder,
    (RecipeIngredient, $$RecipeIngredientsTableReferences),
    RecipeIngredient,
    PrefetchHooks Function({bool recipeId, bool ingredientId})> {
  $$RecipeIngredientsTableTableManager(
      _$AppDatabase db, $RecipeIngredientsTable table)
      : super(TableManagerState(
          db: db,
          table: table,
          createFilteringComposer: () =>
              $$RecipeIngredientsTableFilterComposer($db: db, $table: table),
          createOrderingComposer: () =>
              $$RecipeIngredientsTableOrderingComposer($db: db, $table: table),
          createComputedFieldComposer: () =>
              $$RecipeIngredientsTableAnnotationComposer(
                  $db: db, $table: table),
          updateCompanionCallback: ({
            Value<String> id = const Value.absent(),
            Value<String> recipeId = const Value.absent(),
            Value<String> ingredientId = const Value.absent(),
            Value<double> quantity = const Value.absent(),
            Value<String?> servingUnit = const Value.absent(),
            Value<int> rowid = const Value.absent(),
          }) =>
              RecipeIngredientsCompanion(
            id: id,
            recipeId: recipeId,
            ingredientId: ingredientId,
            quantity: quantity,
            servingUnit: servingUnit,
            rowid: rowid,
          ),
          createCompanionCallback: ({
            required String id,
            required String recipeId,
            required String ingredientId,
            required double quantity,
            Value<String?> servingUnit = const Value.absent(),
            Value<int> rowid = const Value.absent(),
          }) =>
              RecipeIngredientsCompanion.insert(
            id: id,
            recipeId: recipeId,
            ingredientId: ingredientId,
            quantity: quantity,
            servingUnit: servingUnit,
            rowid: rowid,
          ),
          withReferenceMapper: (p0) => p0
              .map((e) => (
                    e.readTable(table),
                    $$RecipeIngredientsTableReferences(db, table, e)
                  ))
              .toList(),
          prefetchHooksCallback: ({recipeId = false, ingredientId = false}) {
            return PrefetchHooks(
              db: db,
              explicitlyWatchedTables: [],
              addJoins: <
                  T extends TableManagerState<
                      dynamic,
                      dynamic,
                      dynamic,
                      dynamic,
                      dynamic,
                      dynamic,
                      dynamic,
                      dynamic,
                      dynamic,
                      dynamic,
                      dynamic>>(state) {
                if (recipeId) {
                  state = state.withJoin(
                    currentTable: table,
                    currentColumn: table.recipeId,
                    referencedTable:
                        $$RecipeIngredientsTableReferences._recipeIdTable(db),
                    referencedColumn: $$RecipeIngredientsTableReferences
                        ._recipeIdTable(db)
                        .id,
                  ) as T;
                }
                if (ingredientId) {
                  state = state.withJoin(
                    currentTable: table,
                    currentColumn: table.ingredientId,
                    referencedTable: $$RecipeIngredientsTableReferences
                        ._ingredientIdTable(db),
                    referencedColumn: $$RecipeIngredientsTableReferences
                        ._ingredientIdTable(db)
                        .id,
                  ) as T;
                }

                return state;
              },
              getPrefetchedDataCallback: (items) async {
                return [];
              },
            );
          },
        ));
}

typedef $$RecipeIngredientsTableProcessedTableManager = ProcessedTableManager<
    _$AppDatabase,
    $RecipeIngredientsTable,
    RecipeIngredient,
    $$RecipeIngredientsTableFilterComposer,
    $$RecipeIngredientsTableOrderingComposer,
    $$RecipeIngredientsTableAnnotationComposer,
    $$RecipeIngredientsTableCreateCompanionBuilder,
    $$RecipeIngredientsTableUpdateCompanionBuilder,
    (RecipeIngredient, $$RecipeIngredientsTableReferences),
    RecipeIngredient,
    PrefetchHooks Function({bool recipeId, bool ingredientId})>;
typedef $$WeeklyPlanItemsTableCreateCompanionBuilder = WeeklyPlanItemsCompanion
    Function({
  required String id,
  required String day,
  required String mealType,
  required String recipeId,
  Value<int> rowid,
});
typedef $$WeeklyPlanItemsTableUpdateCompanionBuilder = WeeklyPlanItemsCompanion
    Function({
  Value<String> id,
  Value<String> day,
  Value<String> mealType,
  Value<String> recipeId,
  Value<int> rowid,
});

final class $$WeeklyPlanItemsTableReferences extends BaseReferences<
    _$AppDatabase, $WeeklyPlanItemsTable, WeeklyPlanItem> {
  $$WeeklyPlanItemsTableReferences(
      super.$_db, super.$_table, super.$_typedResult);

  static $RecipesTable _recipeIdTable(_$AppDatabase db) =>
      db.recipes.createAlias(
          $_aliasNameGenerator(db.weeklyPlanItems.recipeId, db.recipes.id));

  $$RecipesTableProcessedTableManager get recipeId {
    final $_column = $_itemColumn<String>('recipe_id')!;

    final manager = $$RecipesTableTableManager($_db, $_db.recipes)
        .filter((f) => f.id.sqlEquals($_column));
    final item = $_typedResult.readTableOrNull(_recipeIdTable($_db));
    if (item == null) return manager;
    return ProcessedTableManager(
        manager.$state.copyWith(prefetchedData: [item]));
  }
}

class $$WeeklyPlanItemsTableFilterComposer
    extends Composer<_$AppDatabase, $WeeklyPlanItemsTable> {
  $$WeeklyPlanItemsTableFilterComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnFilters<String> get id => $composableBuilder(
      column: $table.id, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get day => $composableBuilder(
      column: $table.day, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get mealType => $composableBuilder(
      column: $table.mealType, builder: (column) => ColumnFilters(column));

  $$RecipesTableFilterComposer get recipeId {
    final $$RecipesTableFilterComposer composer = $composerBuilder(
        composer: this,
        getCurrentColumn: (t) => t.recipeId,
        referencedTable: $db.recipes,
        getReferencedColumn: (t) => t.id,
        builder: (joinBuilder,
                {$addJoinBuilderToRootComposer,
                $removeJoinBuilderFromRootComposer}) =>
            $$RecipesTableFilterComposer(
              $db: $db,
              $table: $db.recipes,
              $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
              joinBuilder: joinBuilder,
              $removeJoinBuilderFromRootComposer:
                  $removeJoinBuilderFromRootComposer,
            ));
    return composer;
  }
}

class $$WeeklyPlanItemsTableOrderingComposer
    extends Composer<_$AppDatabase, $WeeklyPlanItemsTable> {
  $$WeeklyPlanItemsTableOrderingComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnOrderings<String> get id => $composableBuilder(
      column: $table.id, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get day => $composableBuilder(
      column: $table.day, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get mealType => $composableBuilder(
      column: $table.mealType, builder: (column) => ColumnOrderings(column));

  $$RecipesTableOrderingComposer get recipeId {
    final $$RecipesTableOrderingComposer composer = $composerBuilder(
        composer: this,
        getCurrentColumn: (t) => t.recipeId,
        referencedTable: $db.recipes,
        getReferencedColumn: (t) => t.id,
        builder: (joinBuilder,
                {$addJoinBuilderToRootComposer,
                $removeJoinBuilderFromRootComposer}) =>
            $$RecipesTableOrderingComposer(
              $db: $db,
              $table: $db.recipes,
              $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
              joinBuilder: joinBuilder,
              $removeJoinBuilderFromRootComposer:
                  $removeJoinBuilderFromRootComposer,
            ));
    return composer;
  }
}

class $$WeeklyPlanItemsTableAnnotationComposer
    extends Composer<_$AppDatabase, $WeeklyPlanItemsTable> {
  $$WeeklyPlanItemsTableAnnotationComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  GeneratedColumn<String> get id =>
      $composableBuilder(column: $table.id, builder: (column) => column);

  GeneratedColumn<String> get day =>
      $composableBuilder(column: $table.day, builder: (column) => column);

  GeneratedColumn<String> get mealType =>
      $composableBuilder(column: $table.mealType, builder: (column) => column);

  $$RecipesTableAnnotationComposer get recipeId {
    final $$RecipesTableAnnotationComposer composer = $composerBuilder(
        composer: this,
        getCurrentColumn: (t) => t.recipeId,
        referencedTable: $db.recipes,
        getReferencedColumn: (t) => t.id,
        builder: (joinBuilder,
                {$addJoinBuilderToRootComposer,
                $removeJoinBuilderFromRootComposer}) =>
            $$RecipesTableAnnotationComposer(
              $db: $db,
              $table: $db.recipes,
              $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
              joinBuilder: joinBuilder,
              $removeJoinBuilderFromRootComposer:
                  $removeJoinBuilderFromRootComposer,
            ));
    return composer;
  }
}

class $$WeeklyPlanItemsTableTableManager extends RootTableManager<
    _$AppDatabase,
    $WeeklyPlanItemsTable,
    WeeklyPlanItem,
    $$WeeklyPlanItemsTableFilterComposer,
    $$WeeklyPlanItemsTableOrderingComposer,
    $$WeeklyPlanItemsTableAnnotationComposer,
    $$WeeklyPlanItemsTableCreateCompanionBuilder,
    $$WeeklyPlanItemsTableUpdateCompanionBuilder,
    (WeeklyPlanItem, $$WeeklyPlanItemsTableReferences),
    WeeklyPlanItem,
    PrefetchHooks Function({bool recipeId})> {
  $$WeeklyPlanItemsTableTableManager(
      _$AppDatabase db, $WeeklyPlanItemsTable table)
      : super(TableManagerState(
          db: db,
          table: table,
          createFilteringComposer: () =>
              $$WeeklyPlanItemsTableFilterComposer($db: db, $table: table),
          createOrderingComposer: () =>
              $$WeeklyPlanItemsTableOrderingComposer($db: db, $table: table),
          createComputedFieldComposer: () =>
              $$WeeklyPlanItemsTableAnnotationComposer($db: db, $table: table),
          updateCompanionCallback: ({
            Value<String> id = const Value.absent(),
            Value<String> day = const Value.absent(),
            Value<String> mealType = const Value.absent(),
            Value<String> recipeId = const Value.absent(),
            Value<int> rowid = const Value.absent(),
          }) =>
              WeeklyPlanItemsCompanion(
            id: id,
            day: day,
            mealType: mealType,
            recipeId: recipeId,
            rowid: rowid,
          ),
          createCompanionCallback: ({
            required String id,
            required String day,
            required String mealType,
            required String recipeId,
            Value<int> rowid = const Value.absent(),
          }) =>
              WeeklyPlanItemsCompanion.insert(
            id: id,
            day: day,
            mealType: mealType,
            recipeId: recipeId,
            rowid: rowid,
          ),
          withReferenceMapper: (p0) => p0
              .map((e) => (
                    e.readTable(table),
                    $$WeeklyPlanItemsTableReferences(db, table, e)
                  ))
              .toList(),
          prefetchHooksCallback: ({recipeId = false}) {
            return PrefetchHooks(
              db: db,
              explicitlyWatchedTables: [],
              addJoins: <
                  T extends TableManagerState<
                      dynamic,
                      dynamic,
                      dynamic,
                      dynamic,
                      dynamic,
                      dynamic,
                      dynamic,
                      dynamic,
                      dynamic,
                      dynamic,
                      dynamic>>(state) {
                if (recipeId) {
                  state = state.withJoin(
                    currentTable: table,
                    currentColumn: table.recipeId,
                    referencedTable:
                        $$WeeklyPlanItemsTableReferences._recipeIdTable(db),
                    referencedColumn:
                        $$WeeklyPlanItemsTableReferences._recipeIdTable(db).id,
                  ) as T;
                }

                return state;
              },
              getPrefetchedDataCallback: (items) async {
                return [];
              },
            );
          },
        ));
}

typedef $$WeeklyPlanItemsTableProcessedTableManager = ProcessedTableManager<
    _$AppDatabase,
    $WeeklyPlanItemsTable,
    WeeklyPlanItem,
    $$WeeklyPlanItemsTableFilterComposer,
    $$WeeklyPlanItemsTableOrderingComposer,
    $$WeeklyPlanItemsTableAnnotationComposer,
    $$WeeklyPlanItemsTableCreateCompanionBuilder,
    $$WeeklyPlanItemsTableUpdateCompanionBuilder,
    (WeeklyPlanItem, $$WeeklyPlanItemsTableReferences),
    WeeklyPlanItem,
    PrefetchHooks Function({bool recipeId})>;
typedef $$KeyValuesTableCreateCompanionBuilder = KeyValuesCompanion Function({
  required String key,
  Value<String?> value,
  Value<int> rowid,
});
typedef $$KeyValuesTableUpdateCompanionBuilder = KeyValuesCompanion Function({
  Value<String> key,
  Value<String?> value,
  Value<int> rowid,
});

class $$KeyValuesTableFilterComposer
    extends Composer<_$AppDatabase, $KeyValuesTable> {
  $$KeyValuesTableFilterComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnFilters<String> get key => $composableBuilder(
      column: $table.key, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get value => $composableBuilder(
      column: $table.value, builder: (column) => ColumnFilters(column));
}

class $$KeyValuesTableOrderingComposer
    extends Composer<_$AppDatabase, $KeyValuesTable> {
  $$KeyValuesTableOrderingComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnOrderings<String> get key => $composableBuilder(
      column: $table.key, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get value => $composableBuilder(
      column: $table.value, builder: (column) => ColumnOrderings(column));
}

class $$KeyValuesTableAnnotationComposer
    extends Composer<_$AppDatabase, $KeyValuesTable> {
  $$KeyValuesTableAnnotationComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  GeneratedColumn<String> get key =>
      $composableBuilder(column: $table.key, builder: (column) => column);

  GeneratedColumn<String> get value =>
      $composableBuilder(column: $table.value, builder: (column) => column);
}

class $$KeyValuesTableTableManager extends RootTableManager<
    _$AppDatabase,
    $KeyValuesTable,
    KeyValue,
    $$KeyValuesTableFilterComposer,
    $$KeyValuesTableOrderingComposer,
    $$KeyValuesTableAnnotationComposer,
    $$KeyValuesTableCreateCompanionBuilder,
    $$KeyValuesTableUpdateCompanionBuilder,
    (KeyValue, BaseReferences<_$AppDatabase, $KeyValuesTable, KeyValue>),
    KeyValue,
    PrefetchHooks Function()> {
  $$KeyValuesTableTableManager(_$AppDatabase db, $KeyValuesTable table)
      : super(TableManagerState(
          db: db,
          table: table,
          createFilteringComposer: () =>
              $$KeyValuesTableFilterComposer($db: db, $table: table),
          createOrderingComposer: () =>
              $$KeyValuesTableOrderingComposer($db: db, $table: table),
          createComputedFieldComposer: () =>
              $$KeyValuesTableAnnotationComposer($db: db, $table: table),
          updateCompanionCallback: ({
            Value<String> key = const Value.absent(),
            Value<String?> value = const Value.absent(),
            Value<int> rowid = const Value.absent(),
          }) =>
              KeyValuesCompanion(
            key: key,
            value: value,
            rowid: rowid,
          ),
          createCompanionCallback: ({
            required String key,
            Value<String?> value = const Value.absent(),
            Value<int> rowid = const Value.absent(),
          }) =>
              KeyValuesCompanion.insert(
            key: key,
            value: value,
            rowid: rowid,
          ),
          withReferenceMapper: (p0) => p0
              .map((e) => (e.readTable(table), BaseReferences(db, table, e)))
              .toList(),
          prefetchHooksCallback: null,
        ));
}

typedef $$KeyValuesTableProcessedTableManager = ProcessedTableManager<
    _$AppDatabase,
    $KeyValuesTable,
    KeyValue,
    $$KeyValuesTableFilterComposer,
    $$KeyValuesTableOrderingComposer,
    $$KeyValuesTableAnnotationComposer,
    $$KeyValuesTableCreateCompanionBuilder,
    $$KeyValuesTableUpdateCompanionBuilder,
    (KeyValue, BaseReferences<_$AppDatabase, $KeyValuesTable, KeyValue>),
    KeyValue,
    PrefetchHooks Function()>;

class $AppDatabaseManager {
  final _$AppDatabase _db;
  $AppDatabaseManager(this._db);
  $$IngredientsTableTableManager get ingredients =>
      $$IngredientsTableTableManager(_db, _db.ingredients);
  $$RecipesTableTableManager get recipes =>
      $$RecipesTableTableManager(_db, _db.recipes);
  $$RecipeIngredientsTableTableManager get recipeIngredients =>
      $$RecipeIngredientsTableTableManager(_db, _db.recipeIngredients);
  $$WeeklyPlanItemsTableTableManager get weeklyPlanItems =>
      $$WeeklyPlanItemsTableTableManager(_db, _db.weeklyPlanItems);
  $$KeyValuesTableTableManager get keyValues =>
      $$KeyValuesTableTableManager(_db, _db.keyValues);
}
