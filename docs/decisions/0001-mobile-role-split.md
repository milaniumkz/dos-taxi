# ADR 0001: Mobile Role Split

## Status

Accepted

## Context

По продуктовым требованиям нужны два разных приложения: клиентское и водительское.
При этом бизнес-логика, сетевой слой, локализация и дизайн-система должны переиспользоваться.

## Decision

Используем один Flutter-проект `apps/mobile` с двумя role-aware app shell:

- `PassengerApp`
- `DriverApp`

Для каждого окружения создаются отдельные entrypoint-файлы:

- `main_passenger_dev.dart`, `main_passenger_staging.dart`, `main_passenger_prod.dart`
- `main_driver_dev.dart`, `main_driver_staging.dart`, `main_driver_prod.dart`

## Consequences

- Общий код остаётся в одном workspace и не дублируется.
- Сборки можно разводить по bundle id / applicationId на нативном уровне в следующих задачах.
- Feature-модули можно реализовывать независимо по ролям, сохраняя общие core/shared слои.
