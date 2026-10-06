import 'package:flutter/material.dart';

class AddressSearchBar extends StatelessWidget {
  const AddressSearchBar({
    required this.controller,
    required this.hintText,
    required this.onChanged,
    this.labelText,
    this.onTap,
    super.key,
  });

  final TextEditingController controller;
  final String hintText;
  final ValueChanged<String> onChanged;
  final String? labelText;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    return TextField(
      controller: controller,
      onChanged: onChanged,
      onTap: onTap,
      decoration: InputDecoration(
        hintText: hintText,
        labelText: labelText,
        prefixIcon: const Icon(Icons.search),
      ),
    );
  }
}
