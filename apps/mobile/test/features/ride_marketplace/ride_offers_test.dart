import 'package:bloc_test/bloc_test.dart';
import 'package:dartz/dartz.dart';
import 'package:dos_mobile/core/di/service_locator.dart';
import 'package:dos_mobile/core/l10n/app_localizations.dart';
import 'package:dos_mobile/core/notifications/app_notification_service.dart';
import 'package:dos_mobile/features/active_order/domain/entities/active_order_service_type.dart';
import 'package:dos_mobile/features/active_order/domain/entities/active_order_session.dart';
import 'package:dos_mobile/features/active_order/presentation/cubit/active_order_cubit.dart';
import 'package:dos_mobile/features/home/domain/entities/address_suggestion.dart';
import 'package:dos_mobile/features/ride_marketplace/domain/ride_repository.dart';
import 'package:dos_mobile/features/ride_marketplace/presentation/ride_offers_screen.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:latlong2/latlong.dart';
import 'package:mocktail/mocktail.dart';

class Active extends MockCubit<ActiveOrderState> implements ActiveOrderCubit {}

class Rides extends Mock implements RideRepository {}

class Alerts extends Mock implements AppNotificationService {}

void main() {
  for (final locale in ['ru', 'kk']) {
    testWidgets(
      '$locale five passenger offers visible, initial arrivals sound and sound test is accessible',
      (tester) async {
        tester.view.physicalSize = const Size(360, 640);
        tester.view.devicePixelRatio = 1;
        addTearDown(tester.view.resetPhysicalSize);
        addTearDown(tester.view.resetDevicePixelRatio);
        final active = Active(), repo = Rides(), alerts = Alerts();
        final session = ActiveOrderSession(
          orderId: 'order',
          serviceType: ActiveOrderServiceType.taxi,
          fromAddress: AddressSuggestion(
            title: 'Pickup street',
            subtitle: '',
            location: const LatLng(52, 77),
          ),
          toAddress: AddressSuggestion(
            title: 'Destination street',
            subtitle: '',
            location: const LatLng(52.1, 77.1),
          ),
          routePoints: const [],
          price: 500,
          currency: 'KZT',
          initialEtaSeconds: 0,
          vehicleLabel: '',
          isNegotiated: true,
        );
        whenListen(
          active,
          const Stream<ActiveOrderState>.empty(),
          initialState: ActiveOrderState(
            session: session,
            orderStatus: 'searching',
            etaSeconds: 0,
          ),
        );
        when(() => alerts.testRideFeedAlert()).thenAnswer((_) async => true);
        when(
          () => alerts.showRideOfferAlert(
            orderId: any(named: 'orderId'),
            offerId: any(named: 'offerId'),
            version: any(named: 'version'),
            title: any(named: 'title'),
            body: any(named: 'body'),
          ),
        ).thenAnswer((_) async {});
        var count = 6;
        when(() => repo.offers('order')).thenAnswer(
          (_) async => Right({
            'items': List.generate(
              count,
              (i) => {
                'id': 'offer-$i',
                'version': 1,
                'driverName': 'Driver ${i + 1}',
                'driverRating': '4.9',
                'vehicleMake': 'Toyota',
                'vehicleModel': 'Camry',
                'vehicleColor': 'Белый',
                'vehiclePlate': 'TEST ${i + 1}',
                'totalPrice': '${500 + i * 50}',
                'hasChildSeat': false,
              },
            ),
          }),
        );
        serviceLocator.registerSingleton<RideRepository>(repo);
        serviceLocator.registerSingleton<AppNotificationService>(alerts);
        addTearDown(() => serviceLocator.reset());
        await tester.pumpWidget(
          BlocProvider<ActiveOrderCubit>.value(
            value: active,
            child: MaterialApp(
              locale: Locale(locale),
              supportedLocales: AppLocalizations.supportedLocales,
              localizationsDelegates: AppLocalizations.localizationsDelegates,
              home: const RideOffersScreen(orderId: 'order'),
            ),
          ),
        );
        await tester.pump();
        await tester.pump();
        expect(find.text('Driver 5').hitTestable(), findsOneWidget);
        expect(find.text('Driver 6').hitTestable(), findsNothing);
        expect(tester.takeException(), isNull);
        verify(
          () => alerts.showRideOfferAlert(
            orderId: 'order',
            offerId: 'offer-0',
            version: '1',
            title: any(named: 'title'),
            body: any(named: 'body'),
          ),
        ).called(1);
        await tester.tap(find.byIcon(Icons.volume_up_outlined));
        await tester.pump();
        verify(() => alerts.testRideFeedAlert()).called(1);
        count = 7;
        await tester.pump(const Duration(seconds: 3));
        await tester.pump();
        verify(
          () => alerts.showRideOfferAlert(
            orderId: 'order',
            offerId: 'offer-6',
            version: '1',
            title: any(named: 'title'),
            body: any(named: 'body'),
          ),
        ).called(1);
        expect(tester.takeException(), isNull);
        await tester.pumpWidget(const SizedBox());
      },
    );
  }
}
