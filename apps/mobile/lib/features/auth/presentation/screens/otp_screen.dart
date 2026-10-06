import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';

import '../../../../app/router/home_route.dart';
import '../../../../core/config/app_config.dart';
import '../../../../core/di/service_locator.dart';
import '../../../../core/errors/error_message_localizer.dart';
import '../../../../core/l10n/app_localizations.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../../core/utils/app_formatters.dart';
import '../cubit/auth_cubit.dart';

class OtpScreen extends StatefulWidget {
  const OtpScreen({required this.phoneNumber, this.initialDevCode, super.key});

  static const routePath = '/auth/otp';

  static String buildLocation(String phoneNumber, {String? devCode}) {
    final encoded = Uri.encodeComponent(phoneNumber);
    return '$routePath?phone=$encoded';
  }

  final String phoneNumber;
  final String? initialDevCode;

  @override
  State<OtpScreen> createState() => _OtpScreenState();
}

class _OtpScreenState extends State<OtpScreen> {
  final TextEditingController _otpController = TextEditingController();
  Timer? _timer;
  int _secondsLeft = 60;

  @override
  void initState() {
    super.initState();
    _startTimer();
  }

  @override
  void dispose() {
    _timer?.cancel();
    _otpController.dispose();
    super.dispose();
  }

  void _startTimer() {
    _timer?.cancel();
    setState(() => _secondsLeft = 60);
    _timer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (_secondsLeft <= 1) {
        timer.cancel();
        setState(() => _secondsLeft = 0);
        return;
      }
      setState(() => _secondsLeft -= 1);
    });
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    return BlocConsumer<AuthCubit, AuthState>(
      listener: (context, state) {
        if (state is AuthAuthenticated) {
          final config = serviceLocator<AppConfig>();
          context.go(homeRouteForRole(config.role));
          return;
        }

        if (state is AuthOtpSent) {
          _startTimer();
          return;
        }

        if (state is AuthError) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(ErrorMessageLocalizer.resolve(l10n, state.message)),
            ),
          );
        }
      },
      builder: (context, state) {
        final config = serviceLocator<AppConfig>();
        final isDriver = config.role == AppRole.driver;
        return Scaffold(
          backgroundColor: isDriver
              ? AppColors.darkBackground
              : AppColors.background,
          appBar: AppBar(
            title: Text(l10n.authOtpTitle),
            backgroundColor: isDriver
                ? AppColors.darkBackground
                : AppColors.background,
            foregroundColor: isDriver ? AppColors.darkText : AppColors.text,
          ),
          body: Padding(
            padding: const EdgeInsets.all(AppSpacing.lg),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  l10n.authOtpDescription,
                  style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                    color: isDriver ? AppColors.darkText : AppColors.text,
                  ),
                ),
                const SizedBox(height: AppSpacing.sm),
                Text(
                  AppFormatters.formatKazakhstanPhone(widget.phoneNumber),
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: isDriver ? AppColors.darkMuted : AppColors.muted,
                  ),
                ),
                const SizedBox(height: AppSpacing.lg),
                TextField(
                  controller: _otpController,
                  keyboardType: TextInputType.number,
                  maxLength: 4,
                  decoration: InputDecoration(
                    labelText: l10n.authOtpFieldLabel,
                    fillColor: isDriver
                        ? AppColors.darkSurface
                        : AppColors.surface,
                    labelStyle: TextStyle(
                      color: isDriver ? AppColors.darkMuted : AppColors.muted,
                    ),
                  ),
                  style: TextStyle(
                    color: isDriver ? AppColors.darkText : AppColors.text,
                  ),
                ),
                const SizedBox(height: AppSpacing.sm),
                TextButton(
                  onPressed: _secondsLeft == 0 && state is! AuthLoading
                      ? () => context.read<AuthCubit>().sendOtp(
                          widget.phoneNumber,
                        )
                      : null,
                  child: Text(
                    _secondsLeft == 0
                        ? l10n.authOtpResend
                        : l10n.authOtpResendTimer(_secondsLeft),
                  ),
                ),
                const Spacer(),
                ElevatedButton(
                  onPressed: state is AuthLoading
                      ? null
                      : () => context.read<AuthCubit>().verifyOtp(
                          phoneNumber: widget.phoneNumber,
                          code: _otpController.text.trim(),
                        ),
                  child: Text(l10n.authOtpSubmit),
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}
