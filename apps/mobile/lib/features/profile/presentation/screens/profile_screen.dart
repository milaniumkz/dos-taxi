import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/errors/error_message_localizer.dart';
import '../../../../core/l10n/app_localizations.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../../core/utils/app_formatters.dart';
import '../../../../shared/widgets/dos_ui.dart';
import '../../../auth/presentation/cubit/auth_cubit.dart';
import '../../../favorites/presentation/screens/favorites_screen.dart';
import '../../../legal/presentation/screens/legal_screen.dart';
import '../../../support/presentation/screens/support_chat_screen.dart';
import '../cubit/profile_settings_cubit.dart';

class ProfileScreen extends StatelessWidget {
  const ProfileScreen({super.key});

  static const routePath = '/profile';

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    return BlocConsumer<ProfileSettingsCubit, ProfileSettingsState>(
      listener: (context, state) {
        final message = state.errorMessage;
        if (message != null && message.isNotEmpty) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(ErrorMessageLocalizer.resolve(l10n, message)),
            ),
          );
        }
      },
      builder: (context, state) {
        final displayName = state.displayName.trim();
        final name = displayName.isEmpty
            ? l10n.profileDefaultName
            : displayName;
        final formattedPhone = state.phone.trim().isEmpty
            ? '—'
            : AppFormatters.formatKazakhstanPhone(state.phone);
        final isDark = Theme.of(context).brightness == Brightness.dark;
        final surfaceColor = isDark ? AppColors.darkSurface : AppColors.surface;
        final borderColor = isDark ? const Color(0x22FFFFFF) : AppColors.border;
        return Scaffold(
          backgroundColor: Theme.of(context).scaffoldBackgroundColor,
          body: SafeArea(
            child: Column(
              children: [
                Expanded(
                  child: ListView(
                    padding: const EdgeInsets.all(AppSpacing.md),
                    children: [
                      DosCard(
                        color: AppColors.primary,
                        borderColor: AppColors.primary,
                        radius: 30,
                        child: Column(
                          children: [
                            DosAvatar(
                              initials: _profileInitials(displayName),
                              radius: 44,
                            ),
                            const SizedBox(height: AppSpacing.md),
                            Text(
                              name,
                              style: Theme.of(context).textTheme.titleLarge,
                            ),
                            const SizedBox(height: AppSpacing.xs),
                            Text(
                              formattedPhone,
                              style: Theme.of(context).textTheme.bodyMedium
                                  ?.copyWith(color: AppColors.text),
                            ),
                            if (state.isSaving) ...[
                              const SizedBox(height: AppSpacing.sm),
                              const SizedBox(
                                width: 18,
                                height: 18,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                ),
                              ),
                            ],
                            const SizedBox(height: AppSpacing.lg),
                            DosCard(
                              color: surfaceColor,
                              borderColor: borderColor,
                              padding: const EdgeInsets.symmetric(vertical: 10),
                              radius: 24,
                              child: Row(
                                children: [
                                  _ProfileQuickAction(
                                    icon: Icons.person_rounded,
                                    label: l10n.profileTitle,
                                    onTap: () => _showEditNameDialog(
                                      context,
                                      displayName,
                                    ),
                                  ),
                                  _ProfileQuickAction(
                                    icon: Icons.credit_card_rounded,
                                    label: l10n.navPayments,
                                    onTap: () => ScaffoldMessenger.of(context)
                                        .showSnackBar(
                                          SnackBar(
                                            content: Text(
                                              l10n.paymentMethodTransferSubtitle,
                                            ),
                                          ),
                                        ),
                                  ),
                                  _ProfileQuickAction(
                                    icon: Icons.location_on_rounded,
                                    label: l10n.homeSavedFavorite,
                                  ),
                                  _ProfileQuickAction(
                                    icon: Icons.security_rounded,
                                    label: l10n.commonSafety,
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: AppSpacing.md),
                      DosCard(
                        color: surfaceColor,
                        borderColor: borderColor,
                        padding: EdgeInsets.zero,
                        child: Column(
                          children: [
                            _MenuTile(
                              icon: Icons.badge_rounded,
                              title: l10n.profileNameLabel,
                              subtitle: name,
                              onTap: () =>
                                  _showEditNameDialog(context, displayName),
                            ),
                            const _MenuDivider(),
                            _MenuTile(
                              icon: Icons.group_add_rounded,
                              title: l10n.commonInviteFriends,
                              subtitle: l10n.commonInviteBonusSubtitle,
                            ),
                            const _MenuDivider(),
                            _MenuTile(
                              icon: Icons.support_agent_rounded,
                              title: l10n.commonSupport,
                              onTap: () =>
                                  context.push(SupportChatScreen.routePath),
                            ),
                            const _MenuDivider(),
                            _MenuTile(
                              icon: Icons.settings_rounded,
                              title: l10n.commonSettings,
                            ),
                            const _MenuDivider(),
                            _LanguageTile(state: state),
                            const _MenuDivider(),
                            _ThemeTile(state: state),
                            const _MenuDivider(),
                            _MenuTile(
                              icon: Icons.info_outline_rounded,
                              title: l10n.commonAboutApp,
                              subtitle: 'v 1.0.0',
                            ),
                            const _MenuDivider(),
                            _MenuTile(
                              icon: Icons.privacy_tip_rounded,
                              title: l10n.legalPrivacyTitle,
                              subtitle: l10n.legalPrivacySubtitle,
                              onTap: () =>
                                  context.push(LegalScreen.privacyRoutePath),
                            ),
                            const _MenuDivider(),
                            _MenuTile(
                              icon: Icons.description_rounded,
                              title: l10n.legalTermsTitle,
                              subtitle: l10n.legalTermsSubtitle,
                              onTap: () =>
                                  context.push(LegalScreen.termsRoutePath),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: AppSpacing.md),
                      DosCard(
                        color: surfaceColor,
                        borderColor: borderColor,
                        padding: EdgeInsets.zero,
                        child: Column(
                          children: [
                            Material(
                              type: MaterialType.transparency,
                              child: ListTile(
                                leading: const Icon(
                                  Icons.logout_rounded,
                                  color: AppColors.danger,
                                ),
                                title: Text(
                                  l10n.profileSignOutAction,
                                  style: const TextStyle(
                                    color: AppColors.danger,
                                  ),
                                ),
                                onTap: () =>
                                    context.read<AuthCubit>().signOut(),
                              ),
                            ),
                            const _MenuDivider(),
                            Material(
                              type: MaterialType.transparency,
                              child: ListTile(
                                leading: const Icon(
                                  Icons.delete_forever_rounded,
                                  color: AppColors.danger,
                                ),
                                title: Text(
                                  l10n.accountDeleteTitle,
                                  style: const TextStyle(
                                    color: AppColors.danger,
                                  ),
                                ),
                                subtitle: Text(l10n.accountDeleteSubtitle),
                                onTap: () => _confirmDeleteAccount(context),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.fromLTRB(
                    AppSpacing.md,
                    0,
                    AppSpacing.md,
                    AppSpacing.sm,
                  ),
                  child: DosBottomNav(
                    selectedIndex: 3,
                    items: [
                      DosBottomNavItem(
                        icon: Icons.home_rounded,
                        label: l10n.navMain,
                        onTap: () => context.go('/passenger/home'),
                      ),
                      DosBottomNavItem(
                        icon: Icons.receipt_long_rounded,
                        label: l10n.navHistory,
                        onTap: () => context.go('/history'),
                      ),
                      DosBottomNavItem(
                        icon: Icons.favorite_rounded,
                        label: l10n.navFavorites,
                        onTap: () => context.go(FavoritesScreen.routePath),
                      ),
                      DosBottomNavItem(
                        icon: Icons.person_rounded,
                        label: l10n.navProfile,
                        onTap: () {},
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

  Future<void> _confirmDeleteAccount(BuildContext context) async {
    final l10n = AppLocalizations.of(context)!;
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: Text(l10n.accountDeleteConfirmTitle),
        content: Text(l10n.accountDeleteConfirmBody),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(dialogContext).pop(false),
            child: Text(l10n.commonCancel),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.danger),
            onPressed: () => Navigator.of(dialogContext).pop(true),
            child: Text(l10n.accountDeleteAction),
          ),
        ],
      ),
    );

    if (confirmed == true && context.mounted) {
      await context.read<AuthCubit>().deleteAccount();
    }
  }

  String _profileInitials(String displayName) {
    final trimmed = displayName.trim();
    if (trimmed.isEmpty) {
      return 'D';
    }

    final parts = trimmed
        .split(RegExp(r'\s+'))
        .where((part) => part.isNotEmpty)
        .toList();
    if (parts.length >= 2) {
      return '${parts[0].characters.first}${parts[1].characters.first}'
          .toUpperCase();
    }

    return parts.first.characters.first.toUpperCase();
  }

  Future<void> _showEditNameDialog(
    BuildContext context,
    String currentName,
  ) async {
    final l10n = AppLocalizations.of(context)!;
    final controller = TextEditingController(text: currentName);
    final nextName = await showDialog<String>(
      context: context,
      builder: (dialogContext) {
        return AlertDialog(
          title: Text(l10n.profileNameLabel),
          content: TextField(
            controller: controller,
            autofocus: true,
            textCapitalization: TextCapitalization.words,
            decoration: InputDecoration(labelText: l10n.profileNameLabel),
            onSubmitted: (value) => Navigator.of(dialogContext).pop(value),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(dialogContext).pop(),
              child: Text(l10n.commonCancel),
            ),
            ElevatedButton(
              onPressed: () => Navigator.of(dialogContext).pop(controller.text),
              child: Text(l10n.commonSave),
            ),
          ],
        );
      },
    );
    controller.dispose();

    if (nextName == null || !context.mounted) {
      return;
    }

    final normalized = nextName.trim();
    if (normalized.isEmpty || normalized == currentName.trim()) {
      return;
    }

    await context.read<ProfileSettingsCubit>().saveDisplayName(normalized);
  }
}

class _ProfileQuickAction extends StatelessWidget {
  const _ProfileQuickAction({
    required this.icon,
    required this.label,
    this.onTap,
  });

  final IconData icon;
  final String label;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(18),
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: AppSpacing.xs),
          child: Column(
            children: [
              Icon(icon, color: AppColors.text, size: 20),
              const SizedBox(height: AppSpacing.xs),
              Text(
                label,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  fontSize: 10,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _LanguageTile extends StatelessWidget {
  const _LanguageTile({required this.state});

  final ProfileSettingsState state;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final cubit = context.read<ProfileSettingsCubit>();
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 8),
      child: Material(
        type: MaterialType.transparency,
        child: ListTile(
          leading: const Icon(Icons.language_rounded),
          title: Text(l10n.profileLanguageLabel),
          trailing: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              DosPill(
                label: l10n.profileLanguageRu,
                selected: state.localeCode == 'ru',
                onTap: () => cubit.changeLocale('ru'),
              ),
              const SizedBox(width: AppSpacing.xs),
              DosPill(
                label: l10n.profileLanguageKk,
                selected: state.localeCode == 'kk',
                onTap: () => cubit.changeLocale('kk'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _ThemeTile extends StatelessWidget {
  const _ThemeTile({required this.state});

  final ProfileSettingsState state;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final cubit = context.read<ProfileSettingsCubit>();
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 8),
      child: Material(
        type: MaterialType.transparency,
        child: ListTile(
          leading: const Icon(Icons.brightness_6_rounded),
          title: Text(l10n.profileThemeLabel),
          trailing: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              DosPill(
                label: l10n.profileThemeLight,
                selected: state.themeMode == ThemeMode.light,
                onTap: () => cubit.changeThemeMode(ThemeMode.light),
              ),
              const SizedBox(width: AppSpacing.xs),
              DosPill(
                label: l10n.profileThemeDark,
                selected: state.themeMode == ThemeMode.dark,
                onTap: () => cubit.changeThemeMode(ThemeMode.dark),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _MenuTile extends StatelessWidget {
  const _MenuTile({
    required this.icon,
    required this.title,
    this.subtitle,
    this.onTap,
  });

  final IconData icon;
  final String title;
  final String? subtitle;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final foreground = Theme.of(context).colorScheme.onSurface;
    return Material(
      type: MaterialType.transparency,
      child: ListTile(
        onTap: onTap,
        leading: Icon(icon, color: foreground),
        title: Text(title),
        subtitle: subtitle == null ? null : Text(subtitle!),
        trailing: const Icon(Icons.chevron_right_rounded),
      ),
    );
  }
}

class _MenuDivider extends StatelessWidget {
  const _MenuDivider();

  @override
  Widget build(BuildContext context) {
    return const Divider(height: 1, indent: 56);
  }
}
