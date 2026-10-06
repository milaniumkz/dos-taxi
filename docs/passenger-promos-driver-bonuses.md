# Passenger promos and driver dashboard

`POST /api/v1/orders/estimate` accepts optional `promoCode` and returns `originalPrice`, `discountAmount`, `promoCodeId` and the discounted `estimatedPrice`. Validation does not consume a redemption. Codes are trimmed and uppercased to match administrative code creation.

Taxi, intercity and delivery order creation validate the promo again. A PostgreSQL transaction locks the promo row while counting redemptions and persisting the order, preventing concurrent callers from exceeding `maxUses`. Inactive, expired, missing, exhausted or invalid discounts fail before the order is saved or dispatched. Monetary discounts are capped at the fare, stored in the existing `orders.discount_amount`, linked via `promo_code_id`, and retained for the taxi meter's final price. Percentage discounts are calculated from the initial estimate and fixed as a monetary amount for the order. All created orders with the promo count toward its existing administrative usage total, including cancelled orders.

`GET /api/v1/executor/bonuses/progress` uses the authenticated user's executor and the current `driver_bonus_settings` record. It counts only completed orders of that executor, consistent with existing bonus payouts. The response includes conditions, currency, lifetime completed count, completed orders in the current cycle, remaining orders and the next threshold. At an exact milestone, progress starts the next cycle.

The driver home screen refreshes bonus data every 30 seconds, after balance changes and when the app resumes. The location icon appears above the bottom card and requests fresh GPS. A recenter counter moves the map even if those coordinates have not changed.

No database migration is required for these additions. The checked VPS release publishes both `/passenger/` and `/driver/`; installed Android/iOS apps require updated signed builds for the UI changes.

Tests exercise real PostgreSQL in a separate `_test` database and random schema, including concurrent redemptions, final fare preservation and HTTP bonus access. `PROMO_TEST_DATABASE_URL` selects that test database; production database names are rejected.
