# Booking, promotions and store updates

Passenger checkout is visible before route selection. Quantity, entered amount,
comments, extras and payment selection stay in the same form as addresses change.
The API quote and submit actions require a complete route. Modern requests use
`priceIsTotal: true`: the entered amount covers the entire passenger group.

Drivers use `POST /ride-requests/:id/take` with the displayed `totalPrice` and
`hasChildSeat` to take the passenger's fare immediately. The order and driver are
locked, the displayed price and eligibility are checked, competing proposals are
superseded, and the order becomes `accepted`. The driver then proceeds through
the normal pickup and trip workflow. Retries return the existing assignment.
Changing the price still creates a counteroffer. Passengers may accept it or use
`POST /ride-requests/:id/offers/:offerId/reject` with the displayed offer version.

Driver promotion amounts are KZT, matching the administrator's settings field.
A RUB wallet receives the KZT bonus divided by the city's configured
`rideExchangeRate`, rounded to two decimals. The payment ledger records the actual
wallet credit and the order event records both currencies and exchange rate.
Existing payouts are preserved. The existing promotion enable/disable checkbox
stops future credits; drivers refresh conditions at most every 30 seconds.

The admin navigation includes `/push-notifications`. Administrators may send a
message to passenger devices, driver devices or both; support/operator roles may
read history. Inactive device tokens and blocked users are excluded. Campaigns
and audit records are persisted. An interrupted campaign can be resumed with its
original ID and immutable message; per-device queue IDs deduplicate retries for
seven days. Queue counts mean queued devices, not confirmed delivery. No live
notifications are sent by the test suite.

## Native app release

Version 1.1.1 (33) includes an update gate for both production app roles. Android
uses Google Play In-App Updates, with an immediate update flow and the package's
Play Store page as fallback. iOS uses Apple's lookup API by the installed bundle
identifier and opens its returned App Store URL. The configured identifiers are
`kz.milanium.dospassenger` and `kz.milanium.dosdriver`. Apple lookup defaults to the
Kazakhstan storefront; a different storefront may be selected at build time via
`--dart-define=STORE_COUNTRY=<country>`.

The gate checks on startup, resume and every five minutes. A detected update is
stored locally and remains mandatory when a later store request fails. The gate
has no dismiss action and stays in place if the user cancels the store flow.
A failed first store check does not block users without evidence of an update.
Web apps and non-production flavors skip native store checks.

Server deployment publishes the API, admin and web apps. To enable this feature
on phones, build and publish the new passenger and driver native apps through
the normal signed Play Market/App Store release process. Installed older builds
without the gate cannot acquire this behavior from a server deployment alone.
