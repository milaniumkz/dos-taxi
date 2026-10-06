import '../../domain/entities/executor_profile.dart';

class ExecutorProfileModel extends ExecutorProfile {
  const ExecutorProfileModel({
    required super.id,
    required super.phone,
    required super.name,
    required super.executorType,
    required super.vehicleType,
    required super.carClass,
    required super.vehicleMake,
    required super.vehicleModel,
    required super.vehicleYear,
    required super.vehicleColor,
    required super.vehiclePlate,
    required super.enabledTariffs,
    required super.isOnline,
    required super.balance,
    required super.verificationStatus,
    required super.preferredLanguage,
    required super.cityName,
    required super.cityCurrency,
  });

  factory ExecutorProfileModel.fromJson(Map<String, dynamic> json) {
    final user = _asMap(json['user']);
    final city = _asMap(json['city']);
    return ExecutorProfileModel(
      id: json['id'] as String? ?? '',
      phone: user['phone'] as String? ?? '',
      name: user['name'] as String? ?? '',
      executorType:
          json['executorType'] as String? ??
          json['executor_type'] as String? ??
          'driver',
      vehicleType:
          json['vehicleType'] as String? ?? json['vehicle_type'] as String?,
      carClass: json['carClass'] as String? ?? json['car_class'] as String?,
      vehicleMake:
          json['vehicleMake'] as String? ?? json['vehicle_make'] as String?,
      vehicleModel:
          json['vehicleModel'] as String? ?? json['vehicle_model'] as String?,
      vehicleYear: _toInt(json['vehicleYear'] ?? json['vehicle_year']),
      vehicleColor:
          json['vehicleColor'] as String? ?? json['vehicle_color'] as String?,
      vehiclePlate:
          json['vehiclePlate'] as String? ?? json['vehicle_plate'] as String?,
      enabledTariffs: _toStringList(
        json['enabledTariffs'] ?? json['enabled_tariffs'],
      ),
      isOnline:
          json['isOnline'] as bool? ?? json['is_online'] as bool? ?? false,
      balance: _toDouble(json['balance']),
      verificationStatus:
          json['verificationStatus'] as String? ??
          json['verification_status'] as String? ??
          'pending',
      preferredLanguage:
          user['preferredLanguage'] as String? ??
          user['preferred_language'] as String? ??
          'ru',
      cityName:
          city['nameRu'] as String? ??
          city['name_ru'] as String? ??
          city['nameKk'] as String? ??
          city['name_kk'] as String?,
      cityCurrency:
          city['currency'] as String? ??
          json['currency'] as String? ??
          json['cityCurrency'] as String? ??
          'KZT',
    );
  }

  factory ExecutorProfileModel.synthetic({
    required String name,
    required String executorType,
    String? vehicleType,
    String? vehicleMake,
    String? vehicleModel,
    int? vehicleYear,
    String? vehicleColor,
    String? vehiclePlate,
    List<String> enabledTariffs = const ['economy', 'comfort', 'comfort_plus'],
  }) {
    return ExecutorProfileModel(
      id: 'local-executor',
      phone: '+77000000000',
      name: name,
      executorType: executorType,
      vehicleType: vehicleType,
      carClass: null,
      vehicleMake: vehicleMake,
      vehicleModel: vehicleModel,
      vehicleYear: vehicleYear,
      vehicleColor: vehicleColor,
      vehiclePlate: vehiclePlate,
      enabledTariffs: enabledTariffs,
      isOnline: false,
      balance: 0,
      verificationStatus: 'pending',
      preferredLanguage: 'ru',
      cityName: 'Алматы',
      cityCurrency: 'KZT',
    );
  }

  static Map<String, dynamic> _asMap(dynamic value) {
    if (value is Map<String, dynamic>) {
      return value;
    }

    if (value is Map) {
      return value.map((key, item) => MapEntry(key.toString(), item));
    }

    return <String, dynamic>{};
  }

  static double _toDouble(dynamic value) {
    if (value is num) {
      return value.toDouble();
    }

    if (value is String) {
      return double.tryParse(value) ?? 0;
    }

    return 0;
  }

  static int? _toInt(dynamic value) {
    if (value is int) {
      return value;
    }

    if (value is num) {
      return value.toInt();
    }

    if (value is String) {
      return int.tryParse(value);
    }

    return null;
  }

  static List<String> _toStringList(dynamic value) {
    if (value is List) {
      final items = value.whereType<String>().toList(growable: false);
      return items.isEmpty
          ? const ['economy', 'comfort', 'comfort_plus']
          : items;
    }

    if (value is String && value.trim().isNotEmpty) {
      return value
          .split(',')
          .map((item) => item.trim())
          .where((item) => item.isNotEmpty)
          .toList(growable: false);
    }

    return const ['economy', 'comfort', 'comfort_plus'];
  }
}
