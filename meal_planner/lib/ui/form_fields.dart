import 'package:flutter/material.dart';

const servingUnitOptions = ['g', 'ml', 'tbsp', 'tsp', 'cup', 'nos'];

class ServingUnitDropdown extends StatelessWidget {
  final String? selectedValue;
  final void Function(String?) onChanged;

  const ServingUnitDropdown({super.key, this.selectedValue, required this.onChanged});

  @override
  Widget build(BuildContext context) {
    return DropdownButtonFormField<String>(
      value: selectedValue,
      decoration: const InputDecoration(labelText: 'Serving Unit'),
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
