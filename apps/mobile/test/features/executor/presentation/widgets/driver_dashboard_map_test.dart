import 'dart:async';
import 'package:bloc_test/bloc_test.dart';
import 'package:dartz/dartz.dart';
import 'package:dos_mobile/core/di/service_locator.dart';
import 'package:dos_mobile/core/errors/failure.dart';
import 'package:dos_mobile/core/l10n/app_localizations.dart';
import 'package:dos_mobile/features/executor/domain/entities/executor_profile.dart';
import 'package:dos_mobile/features/executor/domain/entities/driver_bonus_progress.dart';
import 'package:dos_mobile/features/executor/domain/repositories/executor_repository.dart';
import 'package:dos_mobile/features/executor/presentation/cubit/executor_status_cubit.dart';
import 'package:dos_mobile/features/executor/presentation/cubit/incoming_order_cubit.dart';
import 'package:dos_mobile/features/executor/presentation/screens/executor_home_screen.dart';
import 'package:dos_mobile/features/executor/presentation/widgets/executor_heat_map.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:latlong2/latlong.dart';
import 'package:mocktail/mocktail.dart';

class _Status extends MockCubit<ExecutorStatusState>
    implements ExecutorStatusCubit {}

class _Incoming extends MockCubit<IncomingOrderState>
    implements IncomingOrderCubit {}

class _Repository extends Mock implements ExecutorRepository {}

void main() {
  for (final size in [const Size(390, 844), const Size(360, 640)]) {
    testWidgets(
      'driver remains above cards before and after bonus loads on $size',
      (tester) async {
        tester.view.physicalSize = size;
        tester.view.devicePixelRatio = 1;
        addTearDown(tester.view.resetPhysicalSize);
        addTearDown(tester.view.resetDevicePixelRatio);
        addTearDown(() => serviceLocator.reset());
        final status = _Status();
        final incoming = _Incoming();
        final repository = _Repository();
        final pending = Completer<Either<Failure, DriverBonusProgress>>();
        serviceLocator.registerSingleton<ExecutorRepository>(repository);
        when(
          () => repository.fetchBonusProgress(),
        ).thenAnswer((_) => pending.future);
        when(() => status.initialize()).thenAnswer((_) async {});
        whenListen(
          status,
          const Stream<ExecutorStatusState>.empty(),
          initialState: const ExecutorStatusState(
            stage: ExecutorScreenStage.dashboard,
            currentLocation: LatLng(52.28, 76.97),
            profile: ExecutorProfile(
              id: 'driver',
              phone: '+77000000002',
              name: 'Driver',
              executorType: 'driver',
              vehicleType: null,
              carClass: 'economy',
              isOnline: false,
              balance: 5000,
              verificationStatus: 'verified',
              preferredLanguage: 'ru',
              cityName: 'Павлодар',
            ),
          ),
        );
        whenListen(
          incoming,
          const Stream<IncomingOrderState>.empty(),
          initialState: const IncomingOrderState(),
        );
        await tester.pumpWidget(
          MultiBlocProvider(
            providers: [
              BlocProvider<ExecutorStatusCubit>.value(value: status),
              BlocProvider<IncomingOrderCubit>.value(value: incoming),
            ],
            child: MaterialApp(
              locale: const Locale('ru'),
              supportedLocales: AppLocalizations.supportedLocales,
              localizationsDelegates: AppLocalizations.localizationsDelegates,
              home: const ExecutorHomeScreen(),
            ),
          ),
        );
        Future<void> check() async {
          for (var i = 0; i < 6; i++) {
            await tester.pump(const Duration(milliseconds: 30));
          }
          final map = tester.widget<ExecutorHeatMap>(
            find.byType(ExecutorHeatMap),
          );
          final point = tester.getCenter(find.byIcon(Icons.navigation_rounded));
          final expected =
              (size.height +
                  map.viewportOcclusion.top -
                  map.viewportOcclusion.bottom) /
              2;
          expect(point.dy, closeTo(expected, 1));
          expect(
            point.dy,
            lessThan(tester.getRect(find.byType(SingleChildScrollView)).top),
          );
          expect(tester.takeException(), isNull);
        }

        await check();
        pending.complete(
          const Right(
            DriverBonusProgress(
              isEnabled: true,
              ordersRequired: 20,
              bonusAmount: 5000,
              currency: 'KZT',
              totalCompletedOrders: 7,
              completedInCycle: 7,
              remainingOrders: 13,
              nextThreshold: 20,
            ),
          ),
        );
        await check();
        await tester.pumpWidget(const SizedBox());
      },
    );
  }
}
