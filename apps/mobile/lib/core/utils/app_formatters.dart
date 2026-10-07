import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:intl/intl.dart';

final class AppFormatters {
  const AppFormatters._();

  static String formatCurrency(
    BuildContext context,
    num amount, {
    required String currencyCode,
    int decimalDigits = 0,
  }) {
    return NumberFormat.currency(
      locale: localeTag(context),
      symbol: currencySymbol(currencyCode),
      decimalDigits: decimalDigits,
    ).format(amount);
  }

  static String formatDecimal(
    BuildContext context,
    num value, {
    int? decimalDigits,
  }) {
    final locale = localeTag(context);
    final formatter = decimalDigits == null
        ? NumberFormat.decimalPattern(locale)
        : NumberFormat.decimalPatternDigits(
            locale: locale,
            decimalDigits: decimalDigits,
          );
    return formatter.format(value);
  }

  static String formatShortDateTime(BuildContext context, DateTime value) {
    return DateFormat('d MMM, HH:mm', localeTag(context)).format(value);
  }

  static String formatLongDateTime(BuildContext context, DateTime value) {
    return DateFormat('d MMMM y, HH:mm', localeTag(context)).format(value);
  }

  static String formatTime(BuildContext context, DateTime value) {
    return DateFormat.Hm(localeTag(context)).format(value);
  }

  static String normalizeKazakhstanPhone(String value) {
    final nationalDigits = _kazakhstanNationalDigits(value);
    return nationalDigits.isEmpty ? '' : '+7$nationalDigits';
  }

  static bool isCompleteKazakhstanPhone(String value) {
    return normalizeKazakhstanPhone(value).length == 12;
  }

  static String formatKazakhstanPhone(String value) {
    final nationalDigits = _kazakhstanNationalDigits(value);
    if (nationalDigits.isEmpty) {
      return '+7 ';
    }

    final buffer = StringBuffer('+7');
    buffer.write(' (');
    buffer.write(
      nationalDigits.substring(0, nationalDigits.length.clamp(0, 3)),
    );

    if (nationalDigits.length <= 3) {
      return buffer.toString();
    }

    buffer.write(') ');
    buffer.write(
      nationalDigits.substring(3, nationalDigits.length.clamp(3, 6)),
    );

    if (nationalDigits.length <= 6) {
      return buffer.toString();
    }

    buffer.write('-');
    buffer.write(
      nationalDigits.substring(6, nationalDigits.length.clamp(6, 8)),
    );

    if (nationalDigits.length <= 8) {
      return buffer.toString();
    }

    buffer.write('-');
    buffer.write(
      nationalDigits.substring(8, nationalDigits.length.clamp(8, 10)),
    );
    return buffer.toString();
  }

  static String currencySymbol(String currencyCode) {
    return currencyCode.toUpperCase() == 'RUB' ? '₽' : '₸';
  }

  static String normalizeVehiclePlate(String value) {
    const cyrillicToLatin = {
      'А': 'A',
      'В': 'B',
      'Е': 'E',
      'К': 'K',
      'М': 'M',
      'Н': 'H',
      'О': 'O',
      'Р': 'P',
      'С': 'C',
      'Т': 'T',
      'У': 'Y',
      'Х': 'X',
    };
    final upper = value.replaceAll(RegExp(r'[\s-]'), '').toUpperCase();
    return upper.split('').map((char) => cyrillicToLatin[char] ?? char).join();
  }

  static bool isValidVehiclePlate(String value) {
    final normalized = normalizeVehiclePlate(value);
    return RegExp(r'^[\p{L}\p{N}]{1,20}$', unicode: true).hasMatch(normalized);
  }

  static String localeTag(BuildContext context) {
    return Localizations.localeOf(context).toLanguageTag();
  }

  static String _kazakhstanNationalDigits(String value) {
    final digits = value.replaceAll(RegExp(r'\D'), '');
    if (digits.isEmpty) {
      return '';
    }

    final trimmed = value.trim();
    final shouldDropCountryCode =
        trimmed.startsWith('+7') ||
        (digits.length > 10 &&
            (digits.startsWith('7') || digits.startsWith('8')));
    final nationalDigits = shouldDropCountryCode ? digits.substring(1) : digits;
    return nationalDigits.substring(0, nationalDigits.length.clamp(0, 10));
  }
}

final class VehiclePlateInputFormatter extends TextInputFormatter {
  const VehiclePlateInputFormatter();

  @override
  TextEditingValue formatEditUpdate(
    TextEditingValue oldValue,
    TextEditingValue newValue,
  ) {
    final normalized = AppFormatters.normalizeVehiclePlate(
      newValue.text,
    ).replaceAll(RegExp(r'[^\p{L}\p{N}]', unicode: true), '');
    final trimmed = String.fromCharCodes(normalized.runes.take(20));
    return TextEditingValue(
      text: trimmed,
      selection: TextSelection.collapsed(offset: trimmed.length),
    );
  }
}

final class KazakhstanPhoneInputFormatter extends TextInputFormatter {
  const KazakhstanPhoneInputFormatter();

  @override
  TextEditingValue formatEditUpdate(
    TextEditingValue oldValue,
    TextEditingValue newValue,
  ) {
    if (newValue.text.trim().isEmpty) {
      return TextEditingValue.empty;
    }

    final formatted = AppFormatters.formatKazakhstanPhone(newValue.text);
    return TextEditingValue(
      text: formatted,
      selection: TextSelection.collapsed(offset: formatted.length),
    );
  }
}
