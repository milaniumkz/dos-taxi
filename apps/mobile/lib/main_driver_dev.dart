import 'app/bootstrap.dart';
import 'core/config/app_config.dart';

const _appName = String.fromEnvironment(
  'DOS_APP_NAME',
  defaultValue: 'DOS DRIVER Тест',
);
const _apiBaseUrl = String.fromEnvironment(
  'DOS_API_BASE_URL',
  defaultValue: 'http://localhost:3000/api/v1',
);
const _wsBaseUrl = String.fromEnvironment(
  'DOS_WS_BASE_URL',
  defaultValue: 'http://localhost:3000',
);

Future<void> main() async {
  await bootstrap(
    AppConfig.driver(
      flavor: AppFlavor.dev,
      appName: _appName,
      apiBaseUrl: _apiBaseUrl,
      wsBaseUrl: _wsBaseUrl,
    ),
  );
}
