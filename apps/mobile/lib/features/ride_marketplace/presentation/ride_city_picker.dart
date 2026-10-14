import 'package:dartz/dartz.dart' show Either;
import 'package:flutter/material.dart';
import '../../../core/di/service_locator.dart';
import '../../../core/errors/failure.dart';
import '../../../core/l10n/app_localizations.dart';
import '../domain/ride_repository.dart';

class RideCityPicker extends StatefulWidget {
  const RideCityPicker({
    super.key,
    this.initialCityId,
    required this.onChanged,
  });
  final String? initialCityId;
  final ValueChanged<String> onChanged;
  @override
  State<RideCityPicker> createState() => _RideCityPickerState();
}

class _RideCityPickerState extends State<RideCityPicker> {
  late final Future<Either<Failure, List<Map<String, dynamic>>>> cities;
  String? selected;
  @override
  void initState() {
    super.initState();
    selected = widget.initialCityId;
    cities = serviceLocator<RideRepository>().cities();
  }

  @override
  Widget build(BuildContext context) => FutureBuilder(
    future: cities,
    builder: (context, snapshot) {
      if (!snapshot.hasData) return const LinearProgressIndicator();
      return snapshot.data!.fold(
        (f) => Text(f.message),
        (items) => DropdownButtonFormField<String>(
          initialValue: items.any((c) => c['id'] == selected) ? selected : null,
          decoration: InputDecoration(
            labelText: AppLocalizations.of(context)!.rideCity,
          ),
          items: items
              .map(
                (c) => DropdownMenuItem(
                  value: c['id'] as String,
                  child: Text(
                    c[Localizations.localeOf(context).languageCode == 'kk'
                            ? 'nameKk'
                            : 'nameRu']
                        as String,
                  ),
                ),
              )
              .toList(),
          onChanged: (id) {
            if (id != null) {
              setState(() => selected = id);
              widget.onChanged(id);
            }
          },
        ),
      );
    },
  );
}
