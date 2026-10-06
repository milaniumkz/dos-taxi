import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/errors/error_message_localizer.dart';
import '../../../../core/l10n/app_localizations.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../domain/repositories/active_order_repository.dart';
import '../../../home/presentation/screens/passenger_home_placeholder_screen.dart';

class RatingScreen extends StatefulWidget {
  const RatingScreen({
    required this.orderId,
    required this.activeOrderRepository,
    super.key,
  });

  static const routePath = '/rating';

  final String orderId;
  final ActiveOrderRepository activeOrderRepository;

  @override
  State<RatingScreen> createState() => _RatingScreenState();
}

class _RatingScreenState extends State<RatingScreen> {
  int _rating = 5;
  bool _isSubmitting = false;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    return Scaffold(
      appBar: AppBar(title: Text(l10n.ratingTitle)),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(AppSpacing.lg),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              Text(
                l10n.ratingSubtitle,
                textAlign: TextAlign.center,
                style: Theme.of(context).textTheme.titleMedium,
              ),
              const SizedBox(height: AppSpacing.xl),
              Wrap(
                spacing: AppSpacing.sm,
                children: [
                  for (var index = 1; index <= 5; index += 1)
                    IconButton(
                      onPressed: () => setState(() => _rating = index),
                      iconSize: 40,
                      icon: Icon(
                        index <= _rating
                            ? Icons.star_rounded
                            : Icons.star_border,
                        color: index <= _rating
                            ? AppColors.primary
                            : Theme.of(context).colorScheme.outline,
                      ),
                    ),
                ],
              ),
              const Spacer(),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: _isSubmitting ? null : _submitRating,
                  child: _isSubmitting
                      ? const SizedBox(
                          width: 18,
                          height: 18,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : Text(l10n.ratingAction),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _submitRating() async {
    setState(() => _isSubmitting = true);
    final l10n = AppLocalizations.of(context)!;
    final result = await widget.activeOrderRepository.rateOrder(
      orderId: widget.orderId,
      rating: _rating,
    );
    if (!mounted) {
      return;
    }

    setState(() => _isSubmitting = false);
    result.fold(
      (failure) => ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(ErrorMessageLocalizer.resolve(l10n, failure.message)),
        ),
      ),
      (_) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text(l10n.ratingThanks)));
        context.go(PassengerHomePlaceholderScreen.routePath);
      },
    );
  }
}
