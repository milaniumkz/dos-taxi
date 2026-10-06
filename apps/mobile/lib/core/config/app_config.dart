enum AppFlavor { dev, staging, prod }

enum AppRole { passenger, driver }

class AppConfig {
  const AppConfig._({
    required this.flavor,
    required this.role,
    required this.appName,
    required this.apiBaseUrl,
    required this.wsBaseUrl,
  });

  factory AppConfig.passenger({
    required AppFlavor flavor,
    required String appName,
    required String apiBaseUrl,
    required String wsBaseUrl,
  }) {
    return AppConfig._(
      flavor: flavor,
      role: AppRole.passenger,
      appName: appName,
      apiBaseUrl: apiBaseUrl,
      wsBaseUrl: wsBaseUrl,
    );
  }

  factory AppConfig.driver({
    required AppFlavor flavor,
    required String appName,
    required String apiBaseUrl,
    required String wsBaseUrl,
  }) {
    return AppConfig._(
      flavor: flavor,
      role: AppRole.driver,
      appName: appName,
      apiBaseUrl: apiBaseUrl,
      wsBaseUrl: wsBaseUrl,
    );
  }

  final AppFlavor flavor;
  final AppRole role;
  final String appName;
  final String apiBaseUrl;
  final String wsBaseUrl;
}
