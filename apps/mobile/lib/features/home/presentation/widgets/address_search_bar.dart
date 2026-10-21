import 'package:flutter/material.dart';

class AddressSearchBar extends StatelessWidget {
  const AddressSearchBar({
    required this.controller,
    required this.hintText,
    required this.onChanged,
    this.compact = false,
    this.labelText,
    this.onTap,
    super.key,
  });

  final TextEditingController controller;
  final String hintText;
  final ValueChanged<String> onChanged;
  final bool compact;
  final String? labelText;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    return TextField(
      controller: controller,
      onChanged: onChanged,
      onTap: onTap,
      decoration: InputDecoration(
        isDense: true,
        contentPadding: EdgeInsets.symmetric(
          horizontal: 12,
          vertical: compact ? 8 : 12,
        ),
        hintText: hintText,
        labelText: labelText,
        prefixIcon: const Icon(Icons.search),
        prefixIconConstraints: compact
            ? const BoxConstraints(minWidth: 36, minHeight: 40)
            : null,
      ),
    );
  }
}
