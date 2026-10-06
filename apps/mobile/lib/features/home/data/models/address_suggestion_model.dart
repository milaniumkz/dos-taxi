import 'package:latlong2/latlong.dart';

import '../../domain/entities/address_suggestion.dart';

class AddressSuggestionModel extends AddressSuggestion {
  const AddressSuggestionModel({
    required super.title,
    required super.subtitle,
    required super.location,
  });

  factory AddressSuggestionModel.fromJson(Map<String, dynamic> json) {
    final lat = (json['lat'] ?? json['latitude'] ?? 43.238949) as num;
    final lng =
        (json['lng'] ?? json['lon'] ?? json['longitude'] ?? 76.889709) as num;
    final rawTitle =
        json['title'] as String? ??
        json['address'] as String? ??
        json['display_name'] as String? ??
        '';
    final rawSubtitle =
        json['subtitle'] as String? ?? json['description'] as String? ?? '';
    return AddressSuggestionModel(
      title: AddressSuggestion.formatDisplayTitle(rawTitle, rawSubtitle),
      subtitle: rawSubtitle,
      location: LatLng(lat.toDouble(), lng.toDouble()),
    );
  }
}
