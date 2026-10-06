import 'app/bootstrap.dart';
import 'core/config/app_config.dart';

const _appName = String.fromEnvironment(
  'DOS_APP_NAME',
  defaultValue: 'DOS DRIVER',
);
const _apiBaseUrl = String.fromEnvironment(
  'DOS_API_BASE_URL',
  defaultValue: 'https://dos.89.126.200.51.sslip.io/api/v1',
);
const _wsBaseUrl = String.fromEnvironment(
  'DOS_WS_BASE_URL',
  defaultValue: 'https://dos.89.126.200.51.sslip.io',
);

Future<void> main() async {
  await bootstrap(
    AppConfig.driver(
      flavor: AppFlavor.prod,
      appName: _appName,
      apiBaseUrl: _apiBaseUrl,
      wsBaseUrl: _wsBaseUrl,
    ),
  );
}
