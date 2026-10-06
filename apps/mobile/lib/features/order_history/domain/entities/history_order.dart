import 'package:equatable/equatable.dart';

class HistoryOrder extends Equatable {
  const HistoryOrder({
    required this.id,
    required this.serviceType,
    required this.status,
    required this.fromTitle,
    required this.toTitle,
    required this.price,
    required this.currency,
    required this.createdAt,
    required this.distanceMeters,
    required this.durationSeconds,
    this.executorRating,
  });

  final String id;
  final String serviceType;
  final String status;
  final String fromTitle;
  final String toTitle;
  final double price;
  final String currency;
  final DateTime createdAt;
  final int distanceMeters;
  final int durationSeconds;
  final int? executorRating;

  @override
  List<Object?> get props => [
    id,
    serviceType,
    status,
    fromTitle,
    toTitle,
    price,
    currency,
    createdAt,
    distanceMeters,
    durationSeconds,
    executorRating,
  ];
}
