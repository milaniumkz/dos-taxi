import 'package:dos_mobile/core/notifications/app_notification_service.dart';
import 'package:bloc_test/bloc_test.dart';
import 'package:dartz/dartz.dart';
import 'package:dos_mobile/core/di/service_locator.dart';
import 'package:dos_mobile/core/l10n/app_localizations.dart';
import 'package:dos_mobile/features/executor/domain/entities/driver_bonus_progress.dart';
import 'package:dos_mobile/features/executor/domain/entities/executor_profile.dart';
import 'package:dos_mobile/features/executor/domain/repositories/executor_repository.dart';
import 'package:dos_mobile/features/executor/presentation/cubit/executor_status_cubit.dart';
import 'package:dos_mobile/features/executor/presentation/cubit/incoming_order_cubit.dart';
import 'package:dos_mobile/features/ride_marketplace/domain/ride_repository.dart';
import 'package:dos_mobile/features/ride_marketplace/presentation/ride_feed_screen.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:latlong2/latlong.dart';
import 'package:mocktail/mocktail.dart';

class Status extends MockCubit<ExecutorStatusState>
    implements ExecutorStatusCubit {}

class Incoming extends MockCubit<IncomingOrderState>
    implements IncomingOrderCubit {}

class RideRepo extends Mock implements RideRepository {}

class ExecutorRepo extends Mock implements ExecutorRepository {}

class Notifications extends Mock implements AppNotificationService {}

void main() {
  testWidgets(
    'online driver proposes a button price only after confirming requested child seat',
    (tester) async {
      tester.view.physicalSize = const Size(360, 640);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      final status = Status(),
          incoming = Incoming(),
          rides = RideRepo(),
          executor = ExecutorRepo();
      const profile = ExecutorProfile(
        id: 'driver',
        phone: '',
        name: 'Driver',
        executorType: 'driver',
        vehicleType: null,
        carClass: null,
        isOnline: true,
        balance: 1000,
        verificationStatus: 'verified',
        preferredLanguage: 'ru',
        cityName: 'Арал',
      );
      registerFallbackValue(profile);
      whenListen(
        status,
        const Stream<ExecutorStatusState>.empty(),
        initialState: const ExecutorStatusState(
          stage: ExecutorScreenStage.dashboard,
          currentLocation: LatLng(46.8, 61.67),
          profile: profile,
        ),
      );
      when(
        () => incoming.synchronizeDashboardSession(any()),
      ).thenAnswer((_) async {});
      when(() => executor.fetchBonusProgress()).thenAnswer(
        (_) async => const Right(
          DriverBonusProgress(
            isEnabled: false,
            ordersRequired: 20,
            bonusAmount: 0,
            currency: 'KZT',
            totalCompletedOrders: 0,
            completedInCycle: 0,
            remainingOrders: 20,
            nextThreshold: 20,
          ),
        ),
      );
      final request = <String, dynamic>{
        'id': 'request-1',
        'pricingBasis': 'seat',
        'passengerCount': 2,
        'currency': 'KZT',
        'paymentMethod': 'cash',
        'unitPrice': '500.00',
        'totalPrice': '1000.00',
        'minimumUnitPrice': '500.00',
        'priceStep': '50.00',
        'pickupDistanceMeters': 500,
        'needsChildSeat': true,
        'sharedRide': true,
        'pickupEntrance': '2',
        'pickupComment': 'У ворот',
        'routePoints': [
          {'address': 'Ближайшая подача'},
          {'address': 'Толе Би, 38'},
        ],
      };
      when(() => rides.feed(any(), any(), any())).thenAnswer(
        (_) async => Right({
          'items': [
            request,
            ...List.generate(
              9,
              (i) => {
                ...request,
                'id': 'request-${i + 2}',
                'routePoints': [
                  {'address': 'Подача ${i + 2}'},
                  {'address': 'Назначение ${i + 2}'},
                ],
              },
            ),
          ],
          'pendingOffer': request['myOffer'],
          'serverTime': DateTime.now().toIso8601String(),
          'nextOffset': null,
        }),
      );
      when(() => rides.propose('request-1', 1, true)).thenAnswer((_) async {
        request['myOffer'] = {
          'priceSteps': 1,
          'hasChildSeat': true,
          'status': 'pending',
          'orderId': 'request-1',
          'totalPrice': '1100.00',
          'currency': 'KZT',
          'serverTime': DateTime.now().toIso8601String(),
          'expiresAt': DateTime.now()
              .add(const Duration(seconds: 30))
              .toIso8601String(),
        };
        return Right(Map<String, dynamic>.from(request['myOffer'] as Map));
      });
      final notifications = Notifications();
      when(
        () => notifications.testRideFeedAlert(),
      ).thenAnswer((_) async => true);
      serviceLocator.registerSingleton<AppNotificationService>(notifications);
      serviceLocator.registerSingleton<RideRepository>(rides);
      serviceLocator.registerSingleton<ExecutorRepository>(executor);
      addTearDown(() => serviceLocator.reset());
      await tester.pumpWidget(
        MultiBlocProvider(
          providers: [
            BlocProvider<ExecutorStatusCubit>.value(value: status),
            BlocProvider<IncomingOrderCubit>.value(value: incoming),
          ],
          child: MaterialApp(
            theme: ThemeData.dark(),
            locale: const Locale('ru'),
            supportedLocales: AppLocalizations.supportedLocales,
            localizationsDelegates: AppLocalizations.localizationsDelegates,
            home: const Scaffold(body: RideFeedScreen()),
          ),
        ),
      );
      await tester.pump();
      await tester.pump();
      expect(find.text('Ближайшая подача'), findsOneWidget);
      expect(find.byIcon(Icons.add), findsNothing);
      expect(
        tester.getRect(find.text('Подача 4')).bottom,
        lessThanOrEqualTo(tester.view.physicalSize.height),
      );
      expect(find.text('Подача 5').hitTestable(), findsNothing);
      await tester.tap(find.text('Проверить звук'));
      await tester.pump();
      expect(find.textContaining('Звук включён.'), findsOneWidget);
      verify(() => notifications.testRideFeedAlert()).called(1);
      ScaffoldMessenger.of(
        tester.element(find.text('Проверить звук')),
      ).clearSnackBars();
      await tester.pumpAndSettle();
      await tester.tap(find.text('Ближайшая подача'));
      await tester.pumpAndSettle();
      expect(find.textContaining('У ворот'), findsOneWidget);
      expect(
        tester.widget<FilledButton>(find.byType(FilledButton)).onPressed,
        isNull,
      );
      await tester.ensureVisible(find.byIcon(Icons.add));
      await tester.tap(find.byIcon(Icons.add));
      await tester.pump();
      await tester.ensureVisible(find.byType(Checkbox));
      await tester.tap(find.byType(Checkbox));
      await tester.pump();
      await tester.ensureVisible(find.byType(FilledButton));
      await tester.tap(find.byType(FilledButton));
      await tester.pump();
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 350));
      verify(() => rides.propose('request-1', 1, true)).called(1);
      expect(find.text('Ожидаем ответа пассажира'), findsOneWidget);
      expect(
        find.text('Предложение отправлено. Ждём выбора пассажира.'),
        findsOneWidget,
      );
      expect(tester.takeException(), isNull);
      await tester.pumpWidget(const SizedBox());
    },
  );
}
