import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/l10n/app_localizations.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../../shared/widgets/dos_ui.dart';
import '../../../home/presentation/screens/passenger_home_placeholder_screen.dart';
import '../../../order_history/presentation/screens/order_history_screen.dart';
import '../../../profile/presentation/screens/profile_screen.dart';

class FavoritesScreen extends StatelessWidget {
  const FavoritesScreen({super.key});

  static const routePath = '/favorites';

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(title: Text(l10n.favoritesTitle)),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(AppSpacing.md),
          child: Column(
            children: [
              Expanded(
                child: Center(
                  child: DosCard(
                    radius: 28,
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const CircleAvatar(
                          radius: 34,
                          backgroundColor: AppColors.primary,
                          child: Icon(
                            Icons.favorite_rounded,
                            color: AppColors.text,
                          ),
                        ),
                        const SizedBox(height: AppSpacing.md),
                        Text(
                          l10n.favoritesEmptyTitle,
                          textAlign: TextAlign.center,
                          style: Theme.of(context).textTheme.titleLarge,
                        ),
                        const SizedBox(height: AppSpacing.sm),
                        Text(
                          l10n.favoritesEmptyBody,
                          textAlign: TextAlign.center,
                          style: Theme.of(context).textTheme.bodyMedium
                              ?.copyWith(color: AppColors.muted),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
              DosBottomNav(
                selectedIndex: 2,
                items: [
                  DosBottomNavItem(
                    icon: Icons.home_rounded,
                    label: l10n.navMain,
                    onTap: () =>
                        context.go(PassengerHomePlaceholderScreen.routePath),
                  ),
                  DosBottomNavItem(
                    icon: Icons.receipt_long_rounded,
                    label: l10n.navHistory,
                    onTap: () => context.go(OrderHistoryScreen.routePath),
                  ),
                  DosBottomNavItem(
                    icon: Icons.favorite_rounded,
                    label: l10n.navFavorites,
                    onTap: () {},
                  ),
                  DosBottomNavItem(
                    icon: Icons.person_rounded,
                    label: l10n.navProfile,
                    onTap: () => context.go(ProfileScreen.routePath),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
