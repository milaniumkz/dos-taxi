import 'package:equatable/equatable.dart';

class ExecutorProfile extends Equatable {
  const ExecutorProfile({
    required this.id,
    required this.phone,
    required this.name,
    required this.executorType,
    required this.vehicleType,
    required this.carClass,
    this.vehicleMake,
    this.vehicleModel,
    this.vehicleYear,
    this.vehicleColor,
    this.vehiclePlate,
    this.enabledTariffs = const ['economy', 'comfort', 'comfort_plus'],
    required this.isOnline,
    required this.balance,
    required this.verificationStatus,
    required this.preferredLanguage,
    required this.cityName,
    this.cityId,
    this.passengerCapacity = 4,
    this.cityCurrency = 'KZT',
  });

  final String? cityId;
  final int passengerCapacity;
  final String id;
  final String phone;
  final String name;
  final String executorType;
  final String? vehicleType;
  final String? carClass;
  final String? vehicleMake;
  final String? vehicleModel;
  final int? vehicleYear;
  final String? vehicleColor;
  final String? vehiclePlate;
  final List<String> enabledTariffs;
  final bool isOnline;
  final double balance;
  final String verificationStatus;
  final String preferredLanguage;
  final String? cityName;
  final String cityCurrency;

  bool get isVerified => verificationStatus == 'verified';
  bool get isCourier => executorType == 'courier';

  ExecutorProfile copyWith({
    String? id,
    String? phone,
    String? name,
    String? executorType,
    Object? vehicleType = _unset,
    Object? carClass = _unset,
    Object? vehicleMake = _unset,
    Object? vehicleModel = _unset,
    Object? vehicleYear = _unset,
    Object? vehicleColor = _unset,
    Object? vehiclePlate = _unset,
    List<String>? enabledTariffs,
    bool? isOnline,
    double? balance,
    String? verificationStatus,
    String? preferredLanguage,
    Object? cityName = _unset,
    String? cityId,
    int? passengerCapacity,
    String? cityCurrency,
  }) {
    return ExecutorProfile(
      cityId: cityId ?? this.cityId,
      passengerCapacity: passengerCapacity ?? this.passengerCapacity,
      id: id ?? this.id,
      phone: phone ?? this.phone,
      name: name ?? this.name,
      executorType: executorType ?? this.executorType,
      vehicleType: vehicleType == _unset
          ? this.vehicleType
          : vehicleType as String?,
      carClass: carClass == _unset ? this.carClass : carClass as String?,
      vehicleMake: vehicleMake == _unset
          ? this.vehicleMake
          : vehicleMake as String?,
      vehicleModel: vehicleModel == _unset
          ? this.vehicleModel
          : vehicleModel as String?,
      vehicleYear: vehicleYear == _unset
          ? this.vehicleYear
          : vehicleYear as int?,
      vehicleColor: vehicleColor == _unset
          ? this.vehicleColor
          : vehicleColor as String?,
      vehiclePlate: vehiclePlate == _unset
          ? this.vehiclePlate
          : vehiclePlate as String?,
      enabledTariffs: enabledTariffs ?? this.enabledTariffs,
      isOnline: isOnline ?? this.isOnline,
      balance: balance ?? this.balance,
      verificationStatus: verificationStatus ?? this.verificationStatus,
      preferredLanguage: preferredLanguage ?? this.preferredLanguage,
      cityName: cityName == _unset ? this.cityName : cityName as String?,
      cityCurrency: cityCurrency ?? this.cityCurrency,
    );
  }

  @override
  List<Object?> get props => [
    cityId,
    passengerCapacity,
    id,
    phone,
    name,
    executorType,
    vehicleType,
    carClass,
    vehicleMake,
    vehicleModel,
    vehicleYear,
    vehicleColor,
    vehiclePlate,
    enabledTariffs,
    isOnline,
    balance,
    verificationStatus,
    preferredLanguage,
    cityName,
    cityCurrency,
  ];
}

const _unset = Object();
