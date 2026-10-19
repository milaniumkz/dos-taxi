import 'package:dos_mobile/features/executor/data/models/executor_profile_model.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('keeps structured driver identity when refreshing profile state', () {
    final profile = ExecutorProfileModel.fromJson({
      'id': 'driver-1',
      'user': {
        'name': 'Иванов Иван Иванович',
        'lastName': 'Иванов',
        'firstName': 'Иван',
        'middleName': 'Иванович',
        'phone': '+77010000000',
      },
    });
    final refreshed = profile.copyWith(balance: 5000);
    expect(refreshed.lastName, 'Иванов');
    expect(refreshed.firstName, 'Иван');
    expect(refreshed.middleName, 'Иванович');
    expect(refreshed.phone, '+77010000000');
  });

  test('does not guess surname and patronymic from a legacy display name', () {
    final profile = ExecutorProfileModel.fromJson({
      'user': {'name': 'Иванов Иван Иванович'},
    });
    expect(profile.lastName, isEmpty);
    expect(profile.firstName, isEmpty);
    expect(profile.middleName, isEmpty);
  });
}
