import 'package:equatable/equatable.dart';

import '../../../home/domain/entities/address_suggestion.dart';
import '../enums/courier_vehicle_type.dart';

class CreateDeliveryOrderParams extends Equatable {
  const CreateDeliveryOrderParams({
    required this.fromAddress,
    required this.toAddress,
    required this.courierVehicleType,
    required this.packageDescription,
    required this.isFragile,
    required this.requiresReturn,
    required this.contactName,
    required this.contactPhone,
    required this.distanceMeters,
    required this.durationSeconds,
    required this.paymentMethod,
    this.packagePhotoPath,
    this.declaredValue,
    this.cashOnDelivery,
    this.promoCode,
  });

  final AddressSuggestion fromAddress;
  final AddressSuggestion toAddress;
  final CourierVehicleType courierVehicleType;
  final String packageDescription;
  final String? packagePhotoPath;
  final bool isFragile;
  final bool requiresReturn;
  final double? declaredValue;
  final double? cashOnDelivery;
  final String contactName;
  final String contactPhone;
  final int distanceMeters;
  final int durationSeconds;
  final String paymentMethod;
  final String? promoCode;

  @override
  List<Object?> get props => [
    fromAddress,
    toAddress,
    courierVehicleType,
    packageDescription,
    packagePhotoPath,
    isFragile,
    requiresReturn,
    declaredValue,
    cashOnDelivery,
    contactName,
    contactPhone,
    distanceMeters,
    durationSeconds,
    paymentMethod,
    promoCode,
  ];
}
