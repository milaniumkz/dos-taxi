class DriverStatistics {
  const DriverStatistics({
    required this.completedOrders,
    required this.cancelledByDriver,
    required this.ratedOrders,
    required this.rating,
    required this.activityPercent,
  });
  final int completedOrders;
  final int cancelledByDriver;
  final int ratedOrders;
  final double? rating;
  final double? activityPercent;

  factory DriverStatistics.fromJson(Map<String, dynamic> json) {
    int count(String key) {
      final value = json[key];
      if (value is! num ||
          !value.isFinite ||
          value < 0 ||
          value != value.round()) {
        throw const FormatException('Invalid driver statistics');
      }
      return value.toInt();
    }

    double? number(String key) {
      final value = json[key];
      if (value == null) return null;
      if (value is! num || !value.isFinite)
        throw const FormatException('Invalid driver statistics');
      return value.toDouble();
    }

    final completed = count('completedOrders');
    final cancelled = count('cancelledByDriver');
    final rated = count('ratedOrders');
    final rating = number('rating');
    final activity = number('activityPercent');
    if (rated > completed ||
        (rated == 0) != (rating == null) ||
        (rating != null && (rating < 1 || rating > 5)) ||
        (completed + cancelled == 0) != (activity == null) ||
        (activity != null && (activity < 0 || activity > 100))) {
      throw const FormatException('Invalid driver statistics');
    }
    return DriverStatistics(
      completedOrders: completed,
      cancelledByDriver: cancelled,
      ratedOrders: rated,
      rating: rating,
      activityPercent: activity,
    );
  }
}
