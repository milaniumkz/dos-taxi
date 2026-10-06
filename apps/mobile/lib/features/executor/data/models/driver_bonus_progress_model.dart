import '../../domain/entities/driver_bonus_progress.dart';

class DriverBonusProgressModel extends DriverBonusProgress {
  const DriverBonusProgressModel({
    required super.isEnabled,
    required super.ordersRequired,
    required super.bonusAmount,
    required super.currency,
    required super.totalCompletedOrders,
    required super.completedInCycle,
    required super.remainingOrders,
    required super.nextThreshold,
  });
  factory DriverBonusProgressModel.fromJson(Map<String, dynamic> json) =>
      DriverBonusProgressModel(
        isEnabled: json['isEnabled'] == true,
        ordersRequired: (json['ordersRequired'] as num).toInt(),
        bonusAmount: (json['bonusAmount'] as num).toDouble(),
        currency: json['currency'] as String,
        totalCompletedOrders: (json['totalCompletedOrders'] as num).toInt(),
        completedInCycle: (json['completedInCycle'] as num).toInt(),
        remainingOrders: (json['remainingOrders'] as num).toInt(),
        nextThreshold: (json['nextThreshold'] as num).toInt(),
      );
}
