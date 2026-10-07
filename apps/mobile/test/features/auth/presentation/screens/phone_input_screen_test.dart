import 'package:bloc_test/bloc_test.dart';
import 'package:dos_mobile/core/config/app_config.dart';
import 'package:dos_mobile/core/di/service_locator.dart';
import 'package:dos_mobile/core/l10n/app_localizations.dart';
import 'package:dos_mobile/features/auth/presentation/cubit/auth_cubit.dart';
import 'package:dos_mobile/features/auth/presentation/screens/phone_input_screen.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

class _AuthCubit extends MockCubit<AuthState> implements AuthCubit {}

void main() {
  tearDown(() async => serviceLocator.reset());

  for (final (size, keyboard) in [
    (const Size(820, 1180), 0.0),
    (const Size(1180, 820), 0.0),
    (const Size(820, 1180), 320.0),
    (const Size(1180, 820), 320.0),
    (const Size(390, 844), 300.0),
  ]) {
    testWidgets(
      'driver login action is visible and submits on $size with keyboard $keyboard',
      (tester) async {
        tester.view.physicalSize = size;
        tester.view.devicePixelRatio = 1;
        addTearDown(tester.view.resetPhysicalSize);
        addTearDown(tester.view.resetDevicePixelRatio);
        addTearDown(tester.view.resetViewInsets);
        final auth = _AuthCubit();
        whenListen(
          auth,
          const Stream<AuthState>.empty(),
          initialState: const AuthIdle(),
        );
        when(() => auth.sendOtp(any())).thenAnswer((_) async {});
        serviceLocator.registerSingleton<AppConfig>(
          AppConfig.driver(
            flavor: AppFlavor.prod,
            appName: 'DOS DRIVER',
            apiBaseUrl: 'https://api.example.test/api/v1',
            wsBaseUrl: 'https://api.example.test',
          ),
        );
        await tester.pumpWidget(
          BlocProvider<AuthCubit>.value(
            value: auth,
            child: const MaterialApp(
              locale: Locale('ru'),
              supportedLocales: [Locale('ru'), Locale('kk')],
              localizationsDelegates: [
                AppLocalizations.delegate,
                GlobalMaterialLocalizations.delegate,
                GlobalCupertinoLocalizations.delegate,
                GlobalWidgetsLocalizations.delegate,
              ],
              home: PhoneInputScreen(),
            ),
          ),
        );
        await tester.pumpAndSettle();
        final button = find.byType(ElevatedButton);
        expect(tester.getRect(button).bottom, lessThanOrEqualTo(size.height));
        await tester.tap(button);
        await tester.pumpAndSettle();
        tester.view.viewInsets = FakeViewPadding(bottom: keyboard);
        await tester.enterText(find.byType(TextField), '+77000000002');
        await tester.pumpAndSettle();
        expect(tester.getRect(button).bottom, lessThanOrEqualTo(size.height));
        expect(
          tester.getRect(button).bottom,
          lessThanOrEqualTo(size.height - keyboard),
        );
        expect(button.hitTestable(), findsOneWidget);
        await tester.tap(button);
        verify(() => auth.sendOtp('+77000000002')).called(1);
        expect(tester.takeException(), isNull);
      },
    );
  }
}
