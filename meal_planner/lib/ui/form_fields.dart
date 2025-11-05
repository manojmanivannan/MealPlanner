import 'package:flutter/material.dart';

const servingUnitOptions = ['g', 'ml', 'tbsp', 'tsp', 'cup', 'nos'];

const ingredientCategoryOptions = [
  'Animal Products (Meat, Poultry & Seafood)',
  'Beverages & Infusions',
  'Condiments & Sauces',
  'Dairy & Alternatives',
  'Fruits',
  'Grains & Cereals',
  'Nuts & Seeds',
  'Oils & Fats',
  'Other / Miscellaneous',
  'Pulses & Legumes',
  'Salt & Minerals',
  'Spices & Herbs',
  'Sweeteners',
  'Vegetables',
];

class ServingUnitDropdown extends StatelessWidget {
  final String? selectedValue;
  final void Function(String?)? onChanged;

  const ServingUnitDropdown({super.key, this.selectedValue, this.onChanged});

  @override
  Widget build(BuildContext context) {
    return DropdownButtonFormField<String>(
      value: selectedValue,
      decoration: const InputDecoration(labelText: 'Serving Unit', border: OutlineInputBorder()),
      items: servingUnitOptions.map((String value) {
        return DropdownMenuItem<String>(
          value: value,
          child: Text(value),
        );
      }).toList(),
      onChanged: onChanged,
    );
  }
}

class IngredientCategoryDropdown extends StatelessWidget {
  final String? selectedValue;
  final void Function(String?)? onChanged;

  const IngredientCategoryDropdown({super.key, this.selectedValue, this.onChanged});

  @override
  Widget build(BuildContext context) {
    return DropdownButtonFormField<String>(
      value: selectedValue,
      decoration: const InputDecoration(labelText: 'Category', border: OutlineInputBorder()),
      items: ingredientCategoryOptions.map((String value) {
        return DropdownMenuItem<String>(
          value: value,
          child: Text(value),
        );
      }).toList(),
      onChanged: onChanged,
    );
  }
}
