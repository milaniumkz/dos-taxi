import 'package:flutter/material.dart';
import '../../../core/di/service_locator.dart';
import '../../../core/l10n/app_localizations.dart';
import '../../home/domain/entities/address_suggestion.dart';
import '../../taxi/domain/repositories/taxi_repository.dart';

class RideAddressSearch extends SearchDelegate<AddressSuggestion?> {
  RideAddressSearch(this.bias, String label) : super(searchFieldLabel: label);
  final AddressSuggestion? bias;
  @override
  List<Widget> buildActions(BuildContext context) => [
    IconButton(
      onPressed: () {
        query = '';
      },
      icon: const Icon(Icons.clear),
    ),
  ];
  @override
  Widget buildLeading(BuildContext context) => IconButton(
    onPressed: () => close(context, null),
    icon: const Icon(Icons.arrow_back),
  );
  @override
  Widget buildResults(BuildContext context) => buildSuggestions(context);
  @override
  Widget buildSuggestions(BuildContext context) {
    if (query.trim().length < 3) return const SizedBox.shrink();
    return FutureBuilder(
      future: serviceLocator<TaxiRepository>().searchAddresses(
        query: query,
        locationBias: bias?.location,
      ),
      builder: (context, snapshot) {
        if (!snapshot.hasData) {
          return const Center(child: CircularProgressIndicator());
        }
        return snapshot.data!.fold(
          (failure) => Center(child: Text(failure.message)),
          (addresses) => ListView(
            children: [
              if (addresses.isEmpty)
                ListTile(
                  title: Text(
                    AppLocalizations.of(context)!.addressPickerAddressNotFound,
                  ),
                ),
              for (final address in addresses)
                ListTile(
                  title: Text(address.displayTitle),
                  onTap: () => close(context, address),
                ),
            ],
          ),
        );
      },
    );
  }
}
