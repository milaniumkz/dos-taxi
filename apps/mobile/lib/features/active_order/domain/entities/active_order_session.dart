import 'package:equatable/equatable.dart';
import 'package:latlong2/latlong.dart';

import '../../../home/domain/entities/address_suggestion.dart';
import 'active_order_service_type.dart';

class ActiveOrderSession extends Equatable {
  const ActiveOrderSession({
    required this.orderId,
    required this.serviceType,
    required this.fromAddress,
    required this.toAddress,
    required this.routePoints,
    required this.price,
    required this.currency,
    required this.initialEtaSeconds,
    required this.vehicleLabel,
    this.initialOrderStatus = 'searching',
    this.executorName,
    this.executorRating,
    this.executorVehicleLabel,
    this.executorPhone,
  });

  final String orderId;
  final ActiveOrderServiceType serviceType;
  final AddressSuggestion fromAddress;
  final AddressSuggestion toAddress;
  final List<LatLng> routePoints;
  final double price;
  final String currency;
  final int initialEtaSeconds;
  final String vehicleLabel;
  final String initialOrderStatus;
  final String? executorName;
  final double? executorRating;
  final String? executorVehicleLabel;
  final String? executorPhone;

  @override
  List<Object?> get props => [
    orderId,
    serviceType,
    fromAddress,
    toAddress,
    routePoints,
    price,
    currency,
    initialEtaSeconds,
    vehicleLabel,
    initialOrderStatus,
    executorName,
    executorRating,
    executorVehicleLabel,
    executorPhone,
  ];
}
