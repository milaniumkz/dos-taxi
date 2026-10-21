import '../../../../core/errors/failure.dart';

enum DriverTopUpMode { manual, kaspiLink, disabled }

class DriverTopUpSettings {
  const DriverTopUpSettings({required this.mode, this.kaspiUrl});

  final DriverTopUpMode mode;
  final Uri? kaspiUrl;

  factory DriverTopUpSettings.fromJson(Map<String, dynamic> json) {
    final mode = switch (json['mode']) {
      'manual' => DriverTopUpMode.manual,
      'kaspi_link' => DriverTopUpMode.kaspiLink,
      'disabled' => DriverTopUpMode.disabled,
      _ => throw const Failure(
        code: 'TOPUP_SETTINGS_UNAVAILABLE',
        message: 'TOPUP_SETTINGS_UNAVAILABLE',
      ),
    };
    final url = Uri.tryParse(json['kaspiUrl'] as String? ?? '');
    if (mode == DriverTopUpMode.kaspiLink &&
        (url == null ||
            url.scheme != 'https' ||
            url.host.isEmpty ||
            url.userInfo.isNotEmpty)) {
      throw const Failure(
        code: 'TOPUP_SETTINGS_UNAVAILABLE',
        message: 'TOPUP_SETTINGS_UNAVAILABLE',
      );
    }
    return DriverTopUpSettings(mode: mode, kaspiUrl: url);
  }
}
