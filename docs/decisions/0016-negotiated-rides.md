# 0016 — Passenger-selected ride offers

Status: accepted for implementation, 2026-10-14.

Taxi and intercity requests use a city pricing basis, a 500 KZT minimum per seat (or per cabin in salon mode) and a configured fixed exchange rate (7 KZT/RUB). All monetary arithmetic uses integer minor units. The API receives button-step counts, never a client-supplied fare. Quote fingerprints reject changed terms; request UUIDs make retries idempotent. Seat pricing keeps the minimum unit constant when quantity changes; cabin pricing has a multiplier of one.

New orders carry an explicit `isNegotiated` discriminator. Creation never invokes dispatch, dispatch refuses these orders, and administration cannot assign them manually. A passenger accepts an exact offer version in a transaction locking the order and driver. Legacy/admin assignments also lock the same driver. Accepted amount, currency and commission are fixed in the order; completion skips tariff/taximeter repricing. Completion, commission and daily bonus remain in one transaction for negotiated orders.

Offers have a unique (order, executor) identity, revision, expiry and notification marker. Durable pending offer versions are retried into the existing push queue; mobile polling remains authoritative. Pickup entrance and comment are optional separate fields. Child seat requires driver confirmation. Shared ride is a preference, with no automated pooling.

The schema is additive and preserves the old app protocol during coordinated native rollout. Historical fares, wallets and existing currency assignments are not converted. Migration down deliberately refuses destructive history removal; application rollback keeps the additive schema and offers history.
