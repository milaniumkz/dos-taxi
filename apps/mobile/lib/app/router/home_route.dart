import '../../core/config/app_config.dart';
import '../../features/executor/presentation/screens/executor_home_screen.dart';
import '../../features/home/presentation/screens/passenger_home_placeholder_screen.dart';

String homeRouteForRole(AppRole role) {
  return role == AppRole.driver
      ? ExecutorHomeScreen.routePath
      : PassengerHomePlaceholderScreen.routePath;
}
