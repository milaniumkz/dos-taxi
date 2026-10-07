# DOS Driver: App Review login check

Apple reported Guideline 2.1(a) for version 1.0 (30) on October 7, 2026:
login could not be completed on iPad Air 11-inch (M3), iPadOS 27.0.1.
The supplied screenshot shows the driver review phone entered without a visible
continue button.

The current phone screen reproduced an offscreen action in widget tests.
Its scroll content required the full available height before adding padding.
The action now occupies a separate footer inside SafeArea; the introduction and
phone field scroll within the remaining area. Scaffold resizing keeps the action
above the onscreen keyboard.

Regression checks cover iPad Air portrait/landscape, with and without keyboard,
and a phone with keyboard. Each check verifies that the button is fully visible,
can be tapped, and submits the normalized phone to authentication.
On October 7, the production API also accepted the supplied review driver phone,
completed OTP authentication and returned a verified driver profile.
These checks do not establish which source commit or API URL was embedded in
Apple's build 30, and do not replace testing the signed iOS build.

## Before resubmission

1. Build the driver production target `lib/main_driver_prod.dart` with a new,
   unused iOS build number greater than 30 and the intended App Store version.
2. Install that exact signed build through TestFlight. On an iPad, enter the
   review phone from App Review Information, tap the visible continue action,
   enter the configured review OTP and confirm the driver home screen opens.
   Repeat with the keyboard displayed and in landscape orientation.
3. Confirm App Review Information contains the matching phone and current OTP.
   Review accounts use a fixed OTP; an SMS is not required for this flow.
4. Select the verified new build for review. A server update cannot change the
   login layout inside the already uploaded build 30.

No App Store submission or message to Apple is performed by this change.

## City currency and international registrations

In the admin panel, open Cities, choose a city, edit its Currency and select
Russian ruble (RUB), then save. This setting is specific to the city. Creating a
city offers the same selection. The API stores the selected currency and the
pricing service returns estimates in that currency; regression tests cover both
KZT and RUB. Existing tariffs in another currency are converted by the existing
pricing service. Set tariff amounts/currency deliberately when changing a city;
changing currency does not replace numerical prices or historical orders.

Registration now accepts letters and digits from international alphabets, rather
than a fixed list of KZ/RU patterns. Spaces and hyphens are normalized as before,
including `F 2025 11` → `F202511`. Cyrillic lookalikes retain the existing Latin
normalization. The app and API share a 20-character limit matching database
storage; the app no longer truncates registrations to nine characters.
