import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:go_router/go_router.dart';

import '../core/config/app_config.dart';
import '../core/di/service_locator.dart';
import '../core/l10n/app_localizations.dart';
import '../core/auth/auth_session_events.dart';
import '../features/auth/presentation/cubit/auth_cubit.dart';
import '../features/auth/presentation/screens/phone_input_screen.dart';
import '../features/profile/presentation/cubit/profile_settings_cubit.dart';
import '../core/theme/app_theme.dart';
import 'router/app_router.dart';

class DosApp extends StatefulWidget {
  const DosApp({required this.config, super.key});

  final AppConfig config;

  @override
  State<DosApp> createState() => _DosAppState();
}

class _DosAppState extends State<DosApp> {
  late final AuthCubit _authCubit;
  late final GoRouter _router;
  StreamSubscription<void>? _unauthorizedSubscription;

  @override
  void initState() {
    super.initState();
    _authCubit = serviceLocator<AuthCubit>();
    _router = buildAppRouter(widget.config);
    _unauthorizedSubscription = serviceLocator<AuthSessionEvents>()
        .unauthorizedStream
        .listen((_) {
          _authCubit.sessionExpired();
          _router.go(PhoneInputScreen.routePath);
        });
  }

  @override
  void dispose() {
    _unauthorizedSubscription?.cancel();
    _router.dispose();
    _authCubit.close();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return MultiBlocProvider(
      providers: [
        BlocProvider<AuthCubit>.value(value: _authCubit),
        BlocProvider<ProfileSettingsCubit>.value(
          value: serviceLocator<ProfileSettingsCubit>(),
        ),
      ],
      child: BlocListener<AuthCubit, AuthState>(
        listener: (context, state) {
          final settingsCubit = context.read<ProfileSettingsCubit>();
          if (state is AuthAuthenticated) {
            settingsCubit.syncAuthenticatedUser(state.user);
          } else if (state is AuthIdle) {
            settingsCubit.reset();
            if (_router.routeInformationProvider.value.uri.path !=
                PhoneInputScreen.routePath) {
              _router.go(PhoneInputScreen.routePath);
            }
          }
        },
        child: BlocBuilder<ProfileSettingsCubit, ProfileSettingsState>(
          builder: (context, state) {
            return MaterialApp.router(
              title: widget.config.appName,
              debugShowCheckedModeBanner: false,
              theme: AppTheme.light(),
              darkTheme: AppTheme.dark(),
              themeMode: state.themeMode,
              locale: state.locale,
              routerConfig: _router,
              supportedLocales: const [Locale('ru'), Locale('kk')],
              localizationsDelegates: [
                AppLocalizations.delegate,
                GlobalMaterialLocalizations.delegate,
                GlobalCupertinoLocalizations.delegate,
                GlobalWidgetsLocalizations.delegate,
              ],
            );
          },
        ),
      ),
    );
  }
}
