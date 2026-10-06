# DOS Platform

Монорепозиторий MVP платформы перевозок и доставки.

## Состав

- `apps/api` — NestJS backend.
- `apps/admin` — Next.js backoffice.
- `apps/mobile` — Flutter-клиент с двумя entrypoint'ами: `passenger` и `driver`.
- `packages/shared-types` — общие TypeScript-типы и enum'ы.
- `packages/config` — общие конфиги ESLint, Prettier, tsconfig.
- `infra` — docker-compose и nginx.
- `docs/design-reference` — extracted design notes from `Design.zip`.
- `docs/testing` — acceptance mapping and delivery checklist.

## Текущее состояние

Этап 1 из `AGENTS.md` собран до уровня кода и тестового каркаса:

- `apps/api` покрывает auth, geo, pricing, taxi/delivery orders, dispatch, payments, notifications, admin API, OpenAPI export и `unit/integration/e2e` test layout.
- `apps/mobile` разделён на два приложения: `passenger` и `driver`, с реализованными MVP flow для auth, map/home, taxi, delivery, active order, history, profile и executor dashboard. Оба приложения теперь умеют восстанавливать активный заказ после relaunch через backend endpoints `GET /api/v1/orders/active` и `GET /api/v1/executor/orders/active`.
- `apps/admin` содержит backoffice shell с маршрутами `/`, `/orders`, `/orders/[id]`, `/cities`, `/cities/[id]`, `/tariffs`, `/tariffs/[id]`, `/reports`, `/promo-codes`, `/promo-codes/[id]`, `/users`, `/users/[id]`, `/executors`, `/executors/[id]`, `/notes`, `/activity`, live API fetch и demo fallback для городов, тарифов, заказов, промокодов, журнала действий и управления клиентами/исполнителями.

## Runbook

### Workspace

- `corepack pnpm install`
- `corepack pnpm run build`
- `corepack pnpm run lint`
- `corepack pnpm run preflight:runtime`
- `corepack pnpm run preflight:admin`
- `corepack pnpm run smoke:admin:api`
- `corepack pnpm run runtime:boot`
- `corepack pnpm run runtime:prepare`
- `corepack pnpm run runtime:smoke`
- `corepack pnpm run smoke:admin`
- `corepack pnpm run smoke:admin:live`
- `corepack pnpm run smoke:api`
- `corepack pnpm run typecheck`
- `corepack pnpm run verify:node`
- `corepack pnpm run verify:release`
- `corepack pnpm run dev:api`
- `corepack pnpm run dev:admin`

### Cloud / GitHub

- GitHub Actions CI/CD and Codex Cloud runbook: `docs/cloud-operations.md`
- VPS deployment stack: `deploy/vps/docker-compose.yml`
- VPS production scripts: `deploy/vps/scripts/ci-promote-release.sh`, `deploy/vps/scripts/ci-ops.sh`
- Production runtime secrets stay on the VPS in `deploy/vps/.env` and are not committed.

### Backend

- Full Russian admin guide for all 13 sections: [docs/admin-guide.ru.md](docs/admin-guide.ru.md).
- City tariff and client order creation, with full admin/operator/support access: [docs/admin-creation.md](docs/admin-creation.md).
- Real OTP SMS through SMSC.kz: configuration and verification in [docs/smsc-otp.md](docs/smsc-otp.md).

- `apps/api/.env.local` contains a ready-to-use local dev profile for `postgres://localhost:5432`, `redis://localhost:6379`, MinIO on `:9000` and stub notifications/payments
- `corepack pnpm --filter @dos/shared-types build`
- `pnpm --filter @dos/api lint`
- `pnpm --filter @dos/api typecheck`
- `pnpm --filter @dos/api test:unit`
- `pnpm --filter @dos/api test:integration`
- `pnpm --filter @dos/api test:e2e`
- `pnpm --filter @dos/api migration:run`
- `pnpm --filter @dos/api storage:ensure-bucket`
- `pnpm --filter @dos/api seed:dev`
- `pnpm --filter @dos/api start`
- `pnpm --filter @dos/api openapi:generate`
- `corepack pnpm run smoke:api`
- `corepack pnpm run admin:dev-token`

The API runtime now starts with the compiled entrypoint in `dist/apps/api/src/main.js`. `GET /api/v1/health` is a lightweight liveness check, while `GET /api/v1/health/ready` verifies database, Redis and S3 bucket access and returns `503` until all dependencies are ready. `corepack pnpm run smoke:api` boots the compiled server, waits for `/api/v1/health/ready`, checks `/docs`, verifies that `x-trace-id` is present on successful responses, probes both validation and unauthorized failures, confirms that the common `{ code, message, details, traceId }` envelope preserves inbound trace ids, checks that request-log lines were written for the traced error probes, and then finishes with a real `send-otp -> verify-otp -> profile -> refresh -> logout` session lifecycle, including checks that both stale and post-logout refresh tokens are rejected with `REFRESH_TOKEN_REVOKED`. When local dev fixtures are available, the same smoke also verifies seeded client `orders/history` and `orders/:id`, creates a fresh taxi order, confirms that `orders/active` returns it, cancels it and then expects `orders/active` to fall back to `CLIENT_ACTIVE_ORDER_NOT_FOUND`, and for the executor side creates another fresh order, verifies `executor/orders/incoming`, accepts it, checks that `executor/orders/active` returns `200`, completes it and finally expects `EXECUTOR_ACTIVE_ORDER_NOT_FOUND` again. The same executor-backed order is then used for a stub payment flow: bind card, list `payments/methods`, pay the completed order via `payments/orders/:id/pay`, repeat the same payment call with the same `idempotencyKey` and expect the same payment record back, send the same `payments/webhook/stub` event twice and expect the second response to be marked as duplicated, then delete the temporary card and confirm it disappears from `payments/methods`. Those active-order and payment probes mirror the mobile relaunch recovery contract and the local stub payment integration used by the apps. `corepack pnpm run runtime:prepare` applies migrations, ensures the S3 bucket exists and runs the development seed. On this machine there is currently no Docker or local `postgres/redis/minio` installation, so live API smoke still requires external infrastructure.
`corepack pnpm run admin:dev-token` emits a development JWT for `admin` role using the local `JWT_SECRET`; it is intended for live admin smoke, server-side panel testing and manual backoffice checks against a locally running API. By default it uses `DEV_ADMIN_USER_ID` from `apps/api/.env.local`, so the token subject matches the seeded dev admin user. You can override `ADMIN_TOKEN_ROLE`, `ADMIN_TOKEN_SUB`, `ADMIN_TOKEN_PHONE` and `ADMIN_TOKEN_EXPIRES_IN` when needed.
`seed:dev` now creates a stable local backoffice fixture set: a dev admin user, sample client, verified executor with location, promo code, completed taxi order, route points, payment and status timeline. The fixture IDs are exported via `DEV_ADMIN_USER_ID`, `DEV_CLIENT_USER_ID`, `DEV_EXECUTOR_ID`, `DEV_PROMO_CODE_ID`, `DEV_ORDER_ID` and `DEV_PAYMENT_ID`, and the seeded phone numbers are exported via `DEV_ADMIN_PHONE`, `DEV_CLIENT_PHONE` and `DEV_EXECUTOR_PHONE`, so local live admin smoke and API smoke can verify deterministic detail routes and client history once local infra is running. The seed is also rerunnable: route points and status timeline for the sample order are recreated cleanly on each run instead of accumulating duplicates.

All HTTP responses now include `x-trace-id`. Business and validation failures are normalized into `{ code, message, details, traceId }`, and unexpected exceptions return `500` with `code=INTERNAL_SERVER_ERROR` plus the same trace id for correlation.
Each HTTP request is also logged with method, path, status, duration, trace id and client IP so runtime smoke and production incidents can be correlated without extra instrumentation.
API startup now validates and normalizes environment variables up front through `ConfigModule.validate`, so malformed URLs, invalid booleans/ports and insecure production defaults fail fast before Nest finishes bootstrapping.

### Flutter

- `flutter pub get`
- `flutter gen-l10n`
- `flutter analyze`
- `flutter test --coverage`
- `corepack pnpm run mobile:android:install-apkanalyzer-shim`
- `corepack pnpm run mobile:android:apk:passenger`
- `corepack pnpm run mobile:android:apk:driver`
- `corepack pnpm run mobile:android:aab:passenger`
- `corepack pnpm run mobile:android:aab:driver`

Android release packaging is now verified for both native apps:

- `build/app/outputs/flutter-apk/app-passenger-release.apk`
- `build/app/outputs/flutter-apk/app-driver-release.apk`
- `build/app/outputs/bundle/passengerRelease/app-passenger-release.aab`
- `build/app/outputs/bundle/driverRelease/app-driver-release.aab`

The Android APKs were verified with distinct package identities and labels:

- `com.dos.passenger` / `DOS Passenger`
- `com.dos.driver` / `DOS Driver`

If `flutter build appbundle` fails on a fresh machine with `Release app bundle failed to strip debug symbols from native libraries`, run `corepack pnpm run mobile:android:install-apkanalyzer-shim` once. On this machine the underlying issue was not Gradle or app code: Flutter's final AAB post-check required `cmdline-tools/latest/bin/apkanalyzer`, while the installed Android SDK did not ship a `cmdline-tools` directory.

For iOS, the project now has dedicated native schemes/configurations for `passenger` and `driver`, and Flutter correctly launches the driver build as `com.dos.driver` with `Release-driver`. Passenger `flutter build ios --release --no-codesign -t lib/main_passenger_prod.dart` is already validated, while the final no-codesign driver artifact is still blocked on this machine by a local Xcode/SwiftBuild runtime hang after the correct scheme/configuration is selected.

### Admin

- Set `ADMIN_API_URL` to the full backend API base, for example `http://localhost:3000/api/v1`
- Set `ADMIN_API_TOKEN` to a server-side bearer token for `admin` or `operator`
- `corepack pnpm --filter @dos/admin lint`
- `pnpm --filter @dos/admin dev`
- `pnpm --filter @dos/admin start`
- `corepack pnpm run smoke:admin`
- `corepack pnpm run preflight:admin`
- `corepack pnpm run smoke:admin:api`
- `corepack pnpm run smoke:admin:live`
- Add `?lang=kk` to any admin route to switch the panel to Kazakh, `?lang=ru` for Russian
- `GET /api/health` on the admin app returns `{ status, mode, sourceLabel, warnings, generatedAt }` and is used by smoke scripts to distinguish `demo`, `mixed` and `live`
- Available admin routes: `/orders`, `/orders/[id]`, `/cities`, `/cities/[id]`, `/tariffs`, `/tariffs/[id]`, `/reports`, `/promo-codes`, `/promo-codes/[id]`, `/users`, `/users/[id]`, `/executors`, `/executors/[id]`, `/notes`, `/activity`
- `/cities`, `/tariffs` and `/promo-codes` support a lightweight `query=` filter for deep links from audit/activity views, and each now also has a detail route by entity ID
- `/reports` also supports `period=day|week|month` and optional `cityId`
- `/orders/[id]` shows route points, delivery details, payments and the status event timeline
- `/orders/[id]` also exposes manual dispatch restart for `searching` orders, manual executor assignment, restricted admin status resolution (`cancelled_system` / `failed`), hold cancellation for `authorized` payments, refunds for captured card payments and internal operator notes with lifecycle/assignee controls plus scoped jumps into the global notes feed and scoped activity log
- `/orders/[id]`, `/users/[id]` and `/executors/[id]` also include an embedded scoped activity panel with recent audit trail entries and a jump into the full entity-filtered activity feed
- `/users/[id]` shows the client profile editor, order mix summary, internal notes with lifecycle/assignee controls, quick jumps into the scoped global notes feed and activity log, and related orders from the current backoffice snapshot
- `/executors/[id]` shows the executor moderation card, order mix summary, internal notes with lifecycle/assignee controls, quick jumps into the scoped global notes feed and activity log, and related orders from the current backoffice snapshot
- `/cities/[id]`, `/tariffs/[id]` and `/promo-codes/[id]` also include inline edit forms, scoped activity, internal notes with lifecycle/assignee controls and direct jumps into the global entity-filtered notes and activity feeds; `/promo-codes/[id]` additionally shows related orders plus usage analytics for GMV, granted discounts, completion rate, unique clients, usage-vs-cap, first-time vs repeat usage, first-order conversion, payment mix, status breakdown and city split, using full backend history when the promo analytics endpoint is available and switching the related orders table to the filtered admin orders feed when possible, with snapshot fallback otherwise. Promo detail now also accepts period, explicit `dateFrom/dateTo`, city, order-status, service-type and payment-method scoping directly in the page filters so analytics and order list move together, exposes cursor-based navigation for longer historical order feeds, and lets operators jump from analytics breakdown cards straight into the matching scoped orders view.
- `/notes` shows a global internal notes feed with filters by entity type, entity ID, note kind, state, age, assignee, author, pin marker and note text, plus queue presets for open/handoff/escalation/unassigned/pinned/stale/critical notes and inline lifecycle controls; entity filters now cover orders, users, executors, cities, tariffs and promo codes, and `query=` can also resolve a specific `note.id`
- `/activity` shows the global operator activity log with filters by entity, exact action, action group, time window, operator and metadata, plus quick queue presets, drill-down links by entity, actor and action, and readable metadata rows with links to related orders, users, executors, notes and dictionary pages

If admin env vars are omitted, the admin routes fall back to bundled demo data so the UI remains reviewable without a running backend.
If `ADMIN_API_TOKEN` is missing or `ADMIN_API_URL` is malformed, the panel now degrades explicitly into demo mode with a localized warning instead of failing later during live fetches or server actions.
`corepack pnpm run preflight:admin` validates the live admin env, checks backend `/health` and `/health/ready`, and probes `GET /admin/orders?limit=1` with the configured bearer token. It does not require an admin build artifact. If `ADMIN_API_TOKEN` is absent but `ADMIN_API_URL` points at a local API, the preflight and live smoke scripts auto-generate a dev admin token from `apps/api/.env.local`. `corepack pnpm run smoke:admin:api` then verifies the backend admin HTTP contract directly: cities, tariffs, orders, users, executors, promo codes, promo analytics, financial/operations reports, and scoped notes/activity feeds, resolving current fixture IDs from the live API when needed. It now also checks trace propagation on successful admin reads and, for a local API, generates a `support` token to verify read access and a `client` token to verify that a write probe against `POST /admin/notes` is rejected with `403`, `code=FORBIDDEN` and the same `x-trace-id`. The same local-only branch also generates an `operator` token and proves the positive write path by creating and resolving an internal note, then re-reading the result through `/admin/notes` and `/admin/activity`. `corepack pnpm run smoke:admin:live` starts the built admin app against those env vars, verifies the main routes without falling back to env warnings, checks the seeded order/user/executor detail pages, resolves current promo/city/taxi-tariff IDs from the live backend API for dictionary and promo detail routes, and also probes query-driven backoffice pages such as city-scoped reports, order-scoped notes/activity and promo analytics pages with `city/serviceType/paymentMethod/status` filters. In the local live branch it now creates a transient operator note through the backend admin API and verifies that both SSR `/notes` and SSR `/activity` render the new event through query-filtered views. It additionally verifies that live rendering still works under `?lang=kk`, including the localized notes feed and a localized scoped promo analytics page. These route checks are content-aware: the smoke validates expected entity IDs, note markers, note IDs, audit-event fragments or promo codes in the rendered HTML and explicitly rejects pages that still contain `ADMIN_API_TOKEN_MISSING` or `ADMIN_API_URL_INVALID`.

### Local Infra

- `corepack pnpm run runtime:boot` starts `postgres`, `redis`, `rabbitmq` and `minio` from `infra/docker-compose.yml` and waits until they are reachable
- `corepack pnpm run runtime:prepare` builds the backend, runs migrations, ensures the configured S3 bucket exists and seeds development data
- `corepack pnpm run runtime:smoke` now boots infra, prepares runtime, starts one local compiled API instance on the local API port, auto-points admin live smoke to that API, auto-generates a development `ADMIN_API_TOKEN` when needed, then runs both admin live smoke and API smoke against the same backend instance
