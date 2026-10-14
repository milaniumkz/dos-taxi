import 'package:dos_mobile/core/l10n/app_localizations.dart';
import 'package:dos_mobile/features/navigation/domain/navigation_route.dart';
import 'package:dos_mobile/features/navigation/presentation/driver_navigation_view.dart';
import 'package:dos_mobile/features/navigation/presentation/navigation_cubit.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:latlong2/latlong.dart';
import 'navigation_test.dart'
    show Repo, Gps, Voice, pickup, destination, origin;

void main() {
  for (final size in [const Size(390, 844), const Size(360, 640)]) {
    testWidgets(
      'road route and driver stay in visible map area with heading-follow on $size',
      (tester) async {
        tester.view.physicalSize = size;
        tester.view.devicePixelRatio = 1;
        addTearDown(tester.view.resetPhysicalSize);
        addTearDown(tester.view.resetDevicePixelRatio);
        var clock = DateTime.utc(2026, 10, 14);
        final gps = Gps();
        final c = NavigationCubit(
          repository: Repo(),
          location: gps,
          speech: Voice()..available = size.height >= 700,
          initial: origin,
          pickup: pickup,
          destination: destination,
          status: 'accepted',
          now: () => clock,
        );
        Widget app() => MaterialApp(
          locale: const Locale('kk'),
          supportedLocales: AppLocalizations.supportedLocales,
          localizationsDelegates: AppLocalizations.localizationsDelegates,
          home: Scaffold(
            body: DriverNavigationView(
              initialLocation: origin,
              pickup: pickup,
              destination: destination,
              status: 'accepted',
              cubit: c,
              showTiles: false,
              topInset: 88,
              bottomInset: 320,
            ),
          ),
        );
        await tester.pumpWidget(app());
        await tester.pump();
        gps.controller.add(
          NavigationFix(origin, accuracy: 5, timestamp: clock, speed: 0),
        );
        await tester.pump();
        await tester.pump(const Duration(milliseconds: 600));
        await tester.pump(const Duration(milliseconds: 600));
        expect(c.state.route, isNotNull);
        expect(find.text('Жолаушыға дейін'), findsOneWidget);
        final marker = find.byWidgetPredicate(
          (w) => w is Icon && w.icon == Icons.navigation && w.size == 42,
        );
        final header = tester.getRect(find.byType(NavigationHeader));
        final point = tester.getCenter(marker);
        expect(
          point.dy,
          closeTo((header.bottom + 16 + size.height - 320) / 2, 3),
        );
        expect(point.dy, greaterThan(header.bottom + 22));
        expect(point.dy, lessThan(size.height - 320 - 22));
        clock = clock.add(const Duration(seconds: 2));
        gps.controller.add(
          NavigationFix(
            const LatLng(0, .0003),
            accuracy: 5,
            timestamp: clock,
            speed: 8,
            heading: 90,
          ),
        );
        await tester.pump();
        await tester.pump(const Duration(milliseconds: 600));
        expect(c.state.heading, 90);
        expect(c.state.follow, true);
        expect(tester.takeException(), isNull);
        await tester.pumpWidget(const SizedBox());
        await tester.pump();
        await gps.controller.close();
      },
    );
  }
}
