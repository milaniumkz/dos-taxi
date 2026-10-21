# Remote configuration of the driver top-up button

The administrator controls the existing driver profile «Пополнить» button at
Settings → «Пополнение баланса водителя». The three modes are:

- `manual`: the existing amount/phone request, reviewed in Balance top-ups.
- `kaspi_link`: open the saved HTTPS universal link supplied by Kaspi, without
  opening the manual form or creating a manual top-up request.
- `disabled`: show a localized unavailable message; neither flow opens.

The migration creates `driver_topup_settings` without changing the current flow.
An absent singleton row means `manual`. Admin changes upsert the singleton and
write an activity record in the same transaction. Only admins can edit; admin,
operator and support roles can read the setting. Executor reads require an
executor JWT. Both GET routes use Cache-Control: no-store.

API:

- GET/PATCH `/api/v1/admin/settings/driver-topup`
- GET `/api/v1/executor/topup-settings`
- Full update payload: `{ "mode": "kaspi_link", "kaspiUrl": "https://..." }`.
  Empty kaspiUrl is allowed only in manual/disabled modes. A previously saved
  URL may be kept while manual/disabled mode is active.

Each tap fetches fresh settings; the UI suppresses duplicate taps while waiting.
Unknown modes, invalid links and API failures do not fall back to manual requests.
The manual POST endpoint independently rejects requests outside manual mode,
including already-open forms and older clients. Previously created requests
remain available for review; Kaspi callback check/pay accounting is unchanged.
Opening a link does not credit the wallet or confirm payment.

Kaspi supplies the actual universal link. On Android/iOS it opens externally;
Kaspi/OS decide whether its installed app or a web payment page opens. On web it
navigates the current tab to avoid popup blocking after asynchronous settings
fetch. DOS does not append phone, amount or credentials to the supplied URL.
HTTP, script URLs and URLs containing credentials are rejected. No bank link is
invented or activated before the administrator receives it.

The web release includes this feature now. Existing installed native binaries
need the feature included in their next planned release once; later mode and URL
changes require no application build. This task does not build APK/iOS packages.

Validation covers the actual migration, SQL persistence and audit, API roles,
invalid/missing URLs, server rejection of manual requests, plus Flutter switching
modes between taps without rebuilding, launch failures, offline behavior and
repeated taps. Bank acceptance and opening the bank-provided link on real devices
remain dependent on receiving the actual link.
