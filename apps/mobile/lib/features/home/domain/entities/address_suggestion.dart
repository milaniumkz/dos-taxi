import 'package:equatable/equatable.dart';
import 'package:latlong2/latlong.dart';

class AddressSuggestion extends Equatable {
  const AddressSuggestion({
    required this.title,
    required this.subtitle,
    required this.location,
  });

  final String title;
  final String subtitle;
  final LatLng location;

  String get displayTitle => formatDisplayTitle(title, subtitle);

  static String formatDisplayTitle(String title, String subtitle) {
    final cleanTitle = compactAddress(title);
    final cleanSubtitle = compactAddress(subtitle);

    if (cleanTitle.isEmpty) {
      return cleanSubtitle;
    }
    if (cleanSubtitle.isEmpty) {
      return cleanTitle;
    }

    final lowerTitle = cleanTitle.toLowerCase();
    final lowerSubtitle = cleanSubtitle.toLowerCase();
    if (lowerTitle.contains(lowerSubtitle)) {
      return cleanTitle;
    }
    if (lowerSubtitle.contains(lowerTitle)) {
      return cleanSubtitle;
    }

    if (_looksLikeHouseNumber(cleanTitle)) {
      final parts = cleanSubtitle
          .split(',')
          .map((part) => part.trim())
          .where((part) => part.isNotEmpty)
          .toList();
      if (parts.isNotEmpty) {
        final street = parts.first;
        final tail = parts.skip(1).join(', ');
        return tail.isEmpty
            ? '$street, $cleanTitle'
            : '$street, $cleanTitle, $tail';
      }
    }

    return compactAddress('$cleanTitle, $cleanSubtitle');
  }

  static String compactAddress(String value) {
    final seen = <String>{};
    final parts = value
        .split(',')
        .map((part) => part.replaceAll(RegExp(r'\s+'), ' ').trim())
        .where((part) => part.isNotEmpty)
        .where((part) {
          final normalized = part.toLowerCase();
          if (_isAdministrativeAddressPart(normalized)) {
            return false;
          }
          if (seen.contains(normalized)) {
            return false;
          }
          seen.add(normalized);
          return true;
        })
        .take(4)
        .toList();

    return parts.join(', ');
  }

  static bool _isAdministrativeAddressPart(String value) {
    if (value.contains('микрорайон') ||
        value.contains('мкр') ||
        value.contains('шағын аудан')) {
      return false;
    }

    return value == 'казахстан' ||
        value == 'қазақстан' ||
        value == 'kazakhstan' ||
        value.contains('область') ||
        value.contains('облысы') ||
        value.contains('район') ||
        value.contains('аудан') ||
        value.contains('region');
  }

  static bool _looksLikeHouseNumber(String value) {
    return RegExp(r'^\d+[A-Za-z0-9/\-\s]*$').hasMatch(value);
  }

  @override
  List<Object?> get props => [title, subtitle, location];
}
