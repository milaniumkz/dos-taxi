import 'package:equatable/equatable.dart';

class DriverBonusProgress extends Equatable {
  const DriverBonusProgress({
    required this.isEnabled,
    required this.ordersRequired,
    required this.bonusAmount,
    required this.currency,
    required this.totalCompletedOrders,
    required this.completedInCycle,
    required this.remainingOrders,
    required this.nextThreshold,
  });
  final bool isEnabled;
  final int ordersRequired;
  final double bonusAmount;
  final String currency;
  final int totalCompletedOrders;
  final int completedInCycle;
  final int remainingOrders;
  final int nextThreshold;
  double get fraction => ordersRequired > 0
      ? (completedInCycle / ordersRequired).clamp(0.0, 1.0)
      : 0;
  @override
  List<Object?> get props => [
    isEnabled,
    ordersRequired,
    bonusAmount,
    currency,
    totalCompletedOrders,
    completedInCycle,
    remainingOrders,
    nextThreshold,
  ];
}
