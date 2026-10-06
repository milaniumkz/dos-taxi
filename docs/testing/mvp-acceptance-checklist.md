# MVP Acceptance Checklist

This document maps the stage-1 MVP acceptance criteria from `AGENTS.md` to the automated checks that exist in the repository today and highlights what still requires runtime verification in a fully provisioned environment.

## Backend acceptance coverage

| Criterion | Coverage |
|---|---|
| Phone auth for KZ and RU numbers | `apps/api/test/e2e/auth-flow.e2e-spec.ts` |
| Taxi estimate and A→B order creation | `apps/api/test/e2e/taxi-flow.e2e-spec.ts` |
| Driver receives offer, accepts and completes | `apps/api/test/e2e/taxi-flow.e2e-spec.ts` |
| Delivery for bicycle, moped, scooter, car | `apps/api/test/e2e/delivery-flow.e2e-spec.ts` |
| Delivery reaches "delivered" with proof photo | `apps/api/test/e2e/delivery-flow.e2e-spec.ts` |
| Stub online payment, capture and partial refund | `apps/api/test/e2e/payment-flow.e2e-spec.ts` |
| Push notification on order accepted | `apps/api/test/e2e/taxi-flow.e2e-spec.ts` |
| Realtime executor tracking event | `apps/api/test/e2e/taxi-flow.e2e-spec.ts` |
| Client order history | `apps/api/test/e2e/taxi-flow.e2e-spec.ts` |
| Admin tariff change affects new order price | `apps/api/test/e2e/admin-acceptance.e2e-spec.ts` |
| Blocked driver receives no offers | `apps/api/test/e2e/admin-acceptance.e2e-spec.ts` |
| Financial report returns successfully | `apps/api/test/e2e/admin-acceptance.e2e-spec.ts` |

## Mobile acceptance coverage

| Criterion | Coverage |
|---|---|
| Language switch `ru ↔ kk` | `apps/mobile/test/features/profile/presentation/cubit/profile_settings_cubit_test.dart`, `apps/mobile/test/smoke/kk_locale_smoke_test.dart` |
| Currency switch `RUB ↔ KZT` | `apps/mobile/test/features/profile/presentation/cubit/profile_settings_cubit_test.dart` |
| Active order tracking UI behavior | `apps/mobile/test/features/active_order/presentation/cubit/active_order_cubit_test.dart`, `apps/mobile/test/features/active_order/domain/services/executor_position_interpolator_test.dart` |
| Client order history UI | `apps/mobile/test/features/order_history/presentation/cubit/order_history_cubit_test.dart` |

## Manual verification still required

- Run backend `jest` suites and `openapi` generation in a provisioned Node environment with installed dependencies.
- Run passenger and driver apps against the real backend to verify end-to-end map rendering, live socket transport, and UI-level flows on device/emulator.
- Validate admin flows in the actual Next.js backoffice UI, not only through API-level acceptance tests.
