# Design Reference

Источник: `Design.zip` в корне репозитория.

Что важно для реализации:

- Архив уже разделяет роли на `passenger/*` и `driver/*`.
- Внутри `src/app/App.tsx` есть mode selector и два независимых сценария.
- Для Flutter-реализации это означает два app-shell:
  - `PassengerApp`
  - `DriverApp`
- Реализовывать их стоит в одном Flutter workspace, но с отдельными entrypoint'ами и bootstrap-конфигурациями.

Ключевые экраны из дизайна:

- Passenger: onboarding, map, booking, active ride, delivery, history, payment, profile.
- Driver: dashboard, incoming order, active ride, earnings, history, profile.
