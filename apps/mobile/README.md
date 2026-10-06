# DOS Mobile

Один Flutter workspace, два отдельных приложения:

- `passenger` — клиентское приложение.
- `driver` — приложение водителя/курьера.

## Entrypoints

- `lib/main_passenger_dev.dart`
- `lib/main_passenger_staging.dart`
- `lib/main_passenger_prod.dart`
- `lib/main_driver_dev.dart`
- `lib/main_driver_staging.dart`
- `lib/main_driver_prod.dart`

## Запуск

Примеры:

```bash
flutter run -t lib/main_passenger_dev.dart
flutter run -t lib/main_driver_dev.dart
```

Следующий этап после scaffold:

1. `features/auth/` по Clean Architecture.
2. Карта и заказ такси/доставки для клиента.
3. Online/offline, incoming offers и active order flow для водителя.
