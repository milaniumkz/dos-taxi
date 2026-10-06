import 'app/bootstrap.dart';
import 'core/config/app_config.dart';

const _appName = String.fromEnvironment(
  'DOS_APP_NAME',
  defaultValue: 'DOS TAXI Предрелиз',
);
const _apiBaseUrl = String.fromEnvironment(
  'DOS_API_BASE_URL',
  defaultValue: 'https://staging-api.dos.local/api/v1',
);
const _wsBaseUrl = String.fromEnvironment(
  'DOS_WS_BASE_URL',
  defaultValue: 'https://staging-api.dos.local',
);

Future<void> main() async {
  await bootstrap(
    AppConfig.passenger(
      flavor: AppFlavor.staging,
      appName: _appName,
      apiBaseUrl: _apiBaseUrl,
      wsBaseUrl: _wsBaseUrl,
    ),
  );
}
