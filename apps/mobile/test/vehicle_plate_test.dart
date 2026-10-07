import 'package:dos_mobile/core/utils/app_formatters.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  for (final plate in [
    'F 2025 11',
    'А123ВС777',
    '123ABC01',
    'AB-123-CD',
    '沪A12345',
    '١٢٣٤أب',
    '1234567',
    'A1',
    'F2614112345',
  ]) {
    test('registration accepts and retains international plate $plate', () {
      expect(AppFormatters.isValidVehiclePlate(plate), isTrue);
      final formatted = const VehiclePlateInputFormatter().formatEditUpdate(
        TextEditingValue.empty,
        TextEditingValue(text: plate),
      );
      expect(formatted.text, AppFormatters.normalizeVehiclePlate(plate));
    });
  }
  for (final plate in [
    'AAA!!!',
    '<script>',
    'AAAAAAAAAAAAAAAAAAAAA',
    '😀123',
  ]) {
    test('rejects malformed plate $plate', () {
      expect(AppFormatters.isValidVehiclePlate(plate), isFalse);
    });
  }
}
