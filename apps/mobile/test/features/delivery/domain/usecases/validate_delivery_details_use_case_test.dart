import 'package:dos_mobile/features/delivery/domain/usecases/validate_delivery_details_use_case.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  const useCase = ValidateDeliveryDetailsUseCase();

  test('returns description failure when package description is empty', () {
    final result = useCase(
      const ValidateDeliveryDetailsParams(
        packageDescription: '   ',
        contactName: 'Aruzhan',
        contactPhone: '+77010000000',
      ),
    );

    expect(result?.code, 'DELIVERY_DESCRIPTION_REQUIRED');
  });

  test('returns recipient name failure when contact name is empty', () {
    final result = useCase(
      const ValidateDeliveryDetailsParams(
        packageDescription: 'Laptop',
        contactName: '   ',
        contactPhone: '+77010000000',
      ),
    );

    expect(result?.code, 'DELIVERY_RECIPIENT_NAME_REQUIRED');
  });

  test('returns null when all required delivery details are provided', () {
    final result = useCase(
      const ValidateDeliveryDetailsParams(
        packageDescription: 'Documents',
        contactName: 'Aruzhan',
        contactPhone: '+77010000000',
      ),
    );

    expect(result, isNull);
  });
}
