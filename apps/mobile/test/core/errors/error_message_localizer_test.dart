import 'package:dos_mobile/core/errors/server_error_catalog.dart';
import 'package:dos_mobile/core/errors/error_message_localizer.dart';
import 'package:dos_mobile/core/l10n/app_localizations.dart';
import 'package:dos_mobile/core/l10n/app_localizations_ru.dart';
import 'package:dos_mobile/core/l10n/app_localizations_kk.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('server edits replace messages without changing client code', () {
    expect(
      ServerErrorCatalog.install({
        'messages': {
          'ru': {'TARIFF_NOT_FOUND': 'Новый текст'},
          'kk': {'TARIFF_NOT_FOUND': 'Жаңа мәтін'},
        },
      }),
      isTrue,
    );
    expect(
      ErrorMessageLocalizer.resolve(AppLocalizationsRu(), 'TARIFF_NOT_FOUND'),
      'Новый текст',
    );
    expect(
      ErrorMessageLocalizer.resolve(AppLocalizationsKk(), 'TARIFF_NOT_FOUND'),
      'Жаңа мәтін',
    );
    expect(
      ServerErrorCatalog.install({
        'messages': {'ru': {}},
      }),
      isFalse,
    );
    expect(
      ErrorMessageLocalizer.resolve(AppLocalizationsRu(), 'TARIFF_NOT_FOUND'),
      'Новый текст',
    );
  });
  for (final AppLocalizations locale in [
    AppLocalizationsRu(),
    AppLocalizationsKk(),
  ]) {
    test(
      'successful order updates have no error notification (${locale.localeName})',
      () {
        for (final absent in [null, '', '   ']) {
          expect(ErrorMessageLocalizer.resolve(locale, absent), isEmpty);
        }
      },
    );
    test(
      'real failures still have actionable messages (${locale.localeName})',
      () {
        for (final failure in [
          'UNKNOWN_ERROR',
          'NETWORK_TIMEOUT',
          'TARIFF_NOT_FOUND',
          'PROMO_CODE_EXPIRED',
        ]) {
          expect(ErrorMessageLocalizer.resolve(locale, failure), isNotEmpty);
          expect(
            ErrorMessageLocalizer.resolve(locale, failure),
            isNot(failure),
          );
        }
      },
    );
    test(
      'preserves readable messages returned by the server (${locale.localeName})',
      () {
        const message =
            'Не удалось оформить заказ: проверьте адрес назначения.';
        expect(ErrorMessageLocalizer.resolve(locale, message), message);
      },
    );
  }
}
