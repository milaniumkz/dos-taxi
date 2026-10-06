import 'package:dos_mobile/features/auth/domain/entities/user.dart';
import 'package:dos_mobile/features/profile/presentation/cubit/profile_settings_cubit.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('switches locale and currency while normalizing kk locale', () {
    final cubit = ProfileSettingsCubit();

    cubit.syncAuthenticatedUser(
      const User(
        id: 'user-1',
        phone: '+77771234567',
        name: 'Aruzhan',
        preferredLanguage: 'kz',
        preferredCurrency: 'KZT',
      ),
    );
    cubit.changeLocale('ru');
    cubit.changeCurrency('rub');

    expect(cubit.state.localeCode, 'ru');
    expect(cubit.state.currencyCode, 'RUB');
  });
}
