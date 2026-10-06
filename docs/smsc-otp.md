# OTP SMS through SMSC.kz

The API supports `NOTIFICATIONS_SMS_PROVIDER=smsc` for real SMS over
`https://smsc.kz/sys/send.php`. Credentials are sent in a POST form over HTTPS,
never in the URL. Node 20 requests honor the platform's HTTP/HTTPS proxy through
Undici without disabling TLS verification. No SMS SDK is required. Wappi remains available only when
explicitly selected; the deployment examples now select SMSC.

## Switching providers without updating the mobile app

The mobile app continues calling the existing `/auth/send-otp` and
`/auth/verify-otp` endpoints. Request fields, OTP entry and authentication
responses remain compatible; the app does not communicate with SMSC directly.
No mobile files are changed by this integration.

Deploy the updated API to the same address used by the installed app, configure
the SMSC variables below and restart the API/notifications worker. This requires
a backend deployment, not a new APK or App Store release. Once this backend
version is installed, provider selection and credentials can be changed through
server configuration and a restart. Confirm real handset delivery before
considering the switch operational.

Set these on the **API process**, using a secret manager or the ignored runtime
configuration. Do not commit real login/password values:

```dotenv
NOTIFICATIONS_SMS_PROVIDER=smsc
NOTIFICATIONS_SMS_STUB=false
OTP_DEV_BYPASS=false
OTP_DEBUG_RESPONSE_ENABLED=false
SMSC_LOGIN=<account login>
SMSC_PASSWORD=<account password>
SMSC_SENDER=
```

An empty sender lets SMSC use the account default. Set `SMSC_SENDER` only to a
sender name approved for the account; account balance, sender approval and
destination routing are controlled by SMSC. Allow HTTPS egress to `smsc.kz`.
The live SMSC profile fails startup if credentials are missing or OTP bypass/debug
would prevent SMS sending.

Redis and the notifications worker must run in the API process. Apply the normal
database migrations; they create the Russian and Kazakh `auth_otp` SMS templates.
Missing/disabled templates now fail the OTP request instead of returning false
success. The existing app-review phone list intentionally uses fixed codes and
does not send SMS; use an actual test number outside that list.

From the repository root, with the API environment loaded:

```bash
corepack pnpm --filter @dos/shared-types build
corepack pnpm --filter @dos/api build
corepack pnpm --filter @dos/api migration:run
corepack pnpm --filter @dos/api start
```

Request a code through `POST /api/v1/auth/send-otp` with JSON
`{"phone":"+7..."}`. Use the complete international number. The request waits
for the Redis worker to receive SMSC acceptance, returns `devCode: null`, and
records a masked phone and provider message ID in the server log. Enter the code
received on the handset through `POST /api/v1/auth/verify-otp`.

An SMSC API error is a failure even when HTTP is 200. Errors/timeouts return
`503` / `OTP_DELIVERY_FAILED` and delete the OTP session. Raw provider responses,
passwords and OTP text are not logged. Messages have a 10-second HTTP deadline;
OTP waits up to 20 seconds for the queue. Expired queued OTPs are rejected.
Automatic retries are disabled because a timeout can occur after acceptance and
blind retries can charge and deliver duplicate SMS. If the wait times out,
pending jobs are removed where possible; an already active send may still finish.
Request a new code if the original request failed.

SMSC acceptance is not proof of handset delivery. For an accepted message, inspect
its message ID and final delivery status in the SMSC account (or the provider's
`/sys/status.php` API). API authentication and real handset receipt must both be
verified before declaring the production integration complete.

SMSC error `8` means "message cannot be delivered to the specified number".
If a read-only `cost=1` request also returns `8`, the account/provider route must
be resolved with SMSC before resending. Check the number's complete international
format and ask SMSC to enable/confirm delivery to that destination. Error `3`
means insufficient account balance; top up the SMSC account. These are provider
prerequisites, not successful deliveries, and the API never replaces them with
a stub success.

## Checks

```bash
corepack pnpm --filter @dos/api typecheck
corepack pnpm --filter @dos/api exec jest --watchman=false --runInBand \
  --selectProjects unit integration --runTestsByPath \
  src/modules/notifications/smsc.provider.spec.ts \
  test/unit/env.validation.spec.ts \
  src/modules/auth/auth.spec.ts \
  test/integration/smsc-otp.integration.spec.ts
```

The integration tests require a separate Redis database:
`SMSC_TEST_REDIS_URL=redis://127.0.0.1:6379/14` by default. They use the actual
HTTP controller, OTP cache, template renderer and BullMQ worker; only outbound
SMSC HTTP is mocked. They do not send paid SMS or flush the application Redis DB.
Provider tests cover UTF-8 encoding, sender/phone parameters, malformed success
responses, HTTP/API errors, timeouts and credential redaction.

For Codex cloud, configure `SMSC_LOGIN` and `SMSC_PASSWORD` securely in environment
settings with `smsc.kz` as their HTTPS destination. The draft contains requirements,
not credential values. Saving the draft does not deploy the application to the VPS;
use the repository's checked CI/CD deployment workflow for production.
