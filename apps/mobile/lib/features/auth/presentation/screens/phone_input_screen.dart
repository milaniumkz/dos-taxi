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
import '../../../../shared/widgets/dos_ui.dart';
import '../../../profile/presentation/cubit/profile_settings_cubit.dart';
import '../cubit/auth_cubit.dart';
import 'otp_screen.dart';

class PhoneInputScreen extends StatefulWidget {
  const PhoneInputScreen({super.key});

  static const routePath = '/auth/phone';

  @override
  State<PhoneInputScreen> createState() => _PhoneInputScreenState();
}

class _PhoneInputScreenState extends State<PhoneInputScreen> {
  final TextEditingController _phoneController = TextEditingController();
  bool _showPhoneForm = false;
  Timer? _retryTimer;
  DateTime? _retryAt;
  String? _limitedPhone;
  int get _retrySeconds => _limitedPhone == _phoneController.text
      ? (_retryAt?.difference(DateTime.now()).inSeconds ?? 0).clamp(0, 3600)
      : 0;

  @override
  void initState() {
    super.initState();
    _phoneController.addListener(_onPhoneChanged);
  }

  @override
  void dispose() {
    _retryTimer?.cancel();
    _phoneController.removeListener(_onPhoneChanged);
    _phoneController.dispose();
    super.dispose();
  }

  void _onPhoneChanged() {
    setState(() {});
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    return BlocConsumer<AuthCubit, AuthState>(
      listener: (context, state) {
        if (state is AuthOtpSent) {
          context.go(
            OtpScreen.buildLocation(state.phoneNumber, devCode: state.devCode),
          );
          return;
        }

        if (state is AuthAuthenticated) {
          final config = serviceLocator<AppConfig>();
          context.go(homeRouteForRole(config.role));
          return;
        }

        if (state is AuthError) {
          if (state.retryAfterSeconds != null) {
            _limitedPhone = _phoneController.text;
            _retryAt = DateTime.now().add(
              Duration(seconds: state.retryAfterSeconds!),
            );
            _retryTimer?.cancel();
            _retryTimer = Timer.periodic(const Duration(seconds: 1), (timer) {
              if (!mounted) {
                timer.cancel();
                return;
              }
              setState(() {});
              if (_retryAt == null || !_retryAt!.isAfter(DateTime.now())) {
                timer.cancel();
              }
            });
          }
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
        final normalizedPhone = AppFormatters.normalizeKazakhstanPhone(
          _phoneController.text,
        );
        final canSubmitPhone = AppFormatters.isCompleteKazakhstanPhone(
          _phoneController.text,
        );
        return Scaffold(
          backgroundColor: isDriver
              ? AppColors.darkBackground
              : AppColors.background,
          body: SafeArea(
            child: Column(
              children: [
                Expanded(
                  child: LayoutBuilder(
                    builder: (context, constraints) {
                      return SingleChildScrollView(
                        padding: EdgeInsets.only(
                          left: AppSpacing.lg,
                          top: AppSpacing.lg,
                          right: AppSpacing.lg,
                          bottom: AppSpacing.lg,
                        ),
                        child: ConstrainedBox(
                          constraints: BoxConstraints(
                            minHeight:
                                (constraints.maxHeight - 2 * AppSpacing.lg)
                                    .clamp(0, double.infinity),
                          ),
                          child: IntrinsicHeight(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Spacer(),
                                Center(child: _AuthHero(isDriver: isDriver)),
                                const SizedBox(height: AppSpacing.xl),
                                Text(
                                  isDriver
                                      ? l10n.driverWelcomeTitle
                                      : l10n.passengerWelcomeTitle,
                                  style: Theme.of(context)
                                      .textTheme
                                      .headlineLarge
                                      ?.copyWith(
                                        color: isDriver
                                            ? AppColors.darkText
                                            : AppColors.text,
                                      ),
                                ),
                                const SizedBox(height: AppSpacing.sm),
                                Text(
                                  _showPhoneForm
                                      ? l10n.authPhoneDescription
                                      : isDriver
                                      ? l10n.driverWelcomeSubtitle
                                      : l10n.passengerWelcomeSubtitle,
                                  style: Theme.of(context).textTheme.bodyLarge
                                      ?.copyWith(
                                        color: isDriver
                                            ? AppColors.darkMuted
                                            : AppColors.muted,
                                      ),
                                ),
                                if (_retrySeconds > 0)
                                  Text(l10n.authRetryAfter(_retrySeconds)),
                                if (_showPhoneForm) ...[
                                  const SizedBox(height: AppSpacing.lg),
                                  TextField(
                                    controller: _phoneController,
                                    keyboardType: TextInputType.phone,
                                    inputFormatters: const [
                                      KazakhstanPhoneInputFormatter(),
                                    ],
                                    decoration: InputDecoration(
                                      labelText: l10n.authPhoneFieldLabel,
                                      hintText: l10n.authPhoneFieldHint,
                                      fillColor: isDriver
                                          ? AppColors.darkSurface
                                          : AppColors.surface,
                                      labelStyle: TextStyle(
                                        color: isDriver
                                            ? AppColors.darkMuted
                                            : AppColors.muted,
                                      ),
                                      hintStyle: TextStyle(
                                        color: isDriver
                                            ? AppColors.darkMuted
                                            : AppColors.muted,
                                      ),
                                    ),
                                    style: TextStyle(
                                      color: isDriver
                                          ? AppColors.darkText
                                          : AppColors.text,
                                    ),
                                  ),
                                ],
                                const Spacer(),
                              ],
                            ),
                          ),
                        ),
                      );
                    },
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.fromLTRB(
                    AppSpacing.lg,
                    0,
                    AppSpacing.lg,
                    AppSpacing.lg,
                  ),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      if (!isDriver) ...[
                        Center(
                          child: _LanguageToggle(
                            selectedLocale: context
                                .watch<ProfileSettingsCubit>()
                                .state
                                .localeCode,
                          ),
                        ),
                        const SizedBox(height: AppSpacing.md),
                      ],
                      _AuthSubmitButtons(
                        isDriver: isDriver,
                        isLoading: state is AuthLoading,
                        isPhoneForm: _showPhoneForm,
                        canSubmitPhone: canSubmitPhone && _retrySeconds == 0,
                        onShowPhoneForm: () =>
                            setState(() => _showPhoneForm = true),
                        onSubmit: () =>
                            context.read<AuthCubit>().sendOtp(normalizedPhone),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}

class _AuthHero extends StatelessWidget {
  const _AuthHero({required this.isDriver});

  final bool isDriver;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 220,
      child: Stack(
        alignment: Alignment.center,
        children: [
          Positioned.fill(
            child: DecoratedBox(
              decoration: BoxDecoration(
                gradient: RadialGradient(
                  colors: [
                    AppColors.primary.withValues(alpha: isDriver ? 0.35 : 0.6),
                    Colors.transparent,
                  ],
                ),
              ),
            ),
          ),
          Positioned(
            bottom: 0,
            child: DosCard(
              color: isDriver ? AppColors.darkSurface : AppColors.surface,
              borderColor: isDriver
                  ? const Color(0x22FFFFFF)
                  : AppColors.border,
              padding: const EdgeInsets.symmetric(horizontal: 28, vertical: 18),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  ClipRRect(
                    borderRadius: BorderRadius.circular(28),
                    child: Image.asset(
                      isDriver
                          ? 'assets/images/driver_logo.png'
                          : 'assets/images/passenger_logo.png',
                      width: 116,
                      height: 116,
                      fit: BoxFit.cover,
                    ),
                  ),
                  const SizedBox(height: AppSpacing.sm),
                  Text(
                    isDriver ? 'DOS DRIVER' : 'DOS TAXI',
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                      color: isDriver ? AppColors.darkText : AppColors.text,
                      letterSpacing: 2,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _LanguageToggle extends StatelessWidget {
  const _LanguageToggle({required this.selectedLocale});

  final String selectedLocale;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final cubit = context.read<ProfileSettingsCubit>();
    return DosCard(
      padding: const EdgeInsets.all(4),
      radius: 18,
      color: AppColors.surfaceAlt,
      borderColor: Colors.transparent,
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          DosPill(
            label: l10n.profileLanguageRu,
            selected: selectedLocale == 'ru',
            onTap: () => cubit.changeLocale('ru'),
          ),
          const SizedBox(width: AppSpacing.xs),
          DosPill(
            label: l10n.profileLanguageKk,
            selected: selectedLocale == 'kk',
            onTap: () => cubit.changeLocale('kk'),
          ),
        ],
      ),
    );
  }
}

class _AuthSubmitButtons extends StatelessWidget {
  const _AuthSubmitButtons({
    required this.isDriver,
    required this.isLoading,
    required this.isPhoneForm,
    required this.canSubmitPhone,
    required this.onShowPhoneForm,
    required this.onSubmit,
  });

  final bool isDriver;
  final bool isLoading;
  final bool isPhoneForm;
  final bool canSubmitPhone;
  final VoidCallback onShowPhoneForm;
  final VoidCallback onSubmit;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final action = isPhoneForm ? onSubmit : onShowPhoneForm;
    final canPress = !isLoading && (!isPhoneForm || canSubmitPhone);
    if (isDriver) {
      return Column(
        children: [
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: canPress ? action : null,
              child: _AuthButtonContent(
                isLoading: isLoading,
                label: isPhoneForm
                    ? l10n.authPhoneSubmit
                    : l10n.authDriverLoginAction,
              ),
            ),
          ),
          if (!isPhoneForm) ...[
            const SizedBox(height: AppSpacing.sm),
            SizedBox(
              width: double.infinity,
              child: OutlinedButton(
                onPressed: isLoading ? null : onShowPhoneForm,
                style: OutlinedButton.styleFrom(
                  foregroundColor: AppColors.darkText,
                  side: const BorderSide(color: Color(0x44FFFFFF)),
                ),
                child: Text(l10n.authDriverCreateAccountAction),
              ),
            ),
          ],
        ],
      );
    }

    return SizedBox(
      width: double.infinity,
      child: ElevatedButton(
        onPressed: canPress ? action : null,
        style: ElevatedButton.styleFrom(
          backgroundColor: AppColors.text,
          foregroundColor: AppColors.surface,
        ),
        child: _AuthButtonContent(
          isLoading: isLoading,
          label: isPhoneForm ? l10n.authPhoneSubmit : l10n.authPhoneNextAction,
        ),
      ),
    );
  }
}

class _AuthButtonContent extends StatelessWidget {
  const _AuthButtonContent({required this.isLoading, required this.label});

  final bool isLoading;
  final String label;

  @override
  Widget build(BuildContext context) {
    if (!isLoading) {
      return Text(label);
    }

    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        SizedBox(
          width: 18,
          height: 18,
          child: CircularProgressIndicator(
            strokeWidth: 2,
            color: DefaultTextStyle.of(context).style.color,
          ),
        ),
        const SizedBox(width: AppSpacing.sm),
        Text(AppLocalizations.of(context)!.authPhoneSending),
      ],
    );
  }
}
