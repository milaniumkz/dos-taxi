import 'package:flutter/material.dart';

import '../../../../core/api/api_client.dart';
import '../../../../core/di/service_locator.dart';
import '../../../../core/errors/error_message_localizer.dart';
import '../../../../core/errors/failure.dart';
import '../../../../core/l10n/app_localizations.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../../shared/widgets/dos_ui.dart';

class PaymentsScreen extends StatefulWidget {
  const PaymentsScreen({super.key});

  static const routePath = '/payments';

  @override
  State<PaymentsScreen> createState() => _PaymentsScreenState();
}

class _PaymentsScreenState extends State<PaymentsScreen> {
  final ApiClient _apiClient = serviceLocator<ApiClient>();
  List<_PaymentCard> _cards = const [];
  bool _isLoading = true;
  bool _isSaving = false;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _loadCards();
  }

  Future<void> _loadCards() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final response = await _apiClient.guard(
        () => _apiClient.dio.get<dynamic>('/payments/methods'),
      );
      final payload = response.data;
      final items = payload is List ? payload : const [];
      final cards = <_PaymentCard>[];
      for (final item in items) {
        if (item is Map) {
          cards.add(_PaymentCard.fromJson(_stringMap(item)));
        }
      }

      if (!mounted) {
        return;
      }
      setState(() {
        _cards = cards;
        _isLoading = false;
      });
    } on Failure catch (failure) {
      if (!mounted) {
        return;
      }
      setState(() {
        _isLoading = false;
        _errorMessage = failure.message;
      });
    }
  }

  Future<void> _bindCard(String last4, String holderName) async {
    setState(() {
      _isSaving = true;
      _errorMessage = null;
    });

    try {
      await _apiClient.guard(
        () => _apiClient.dio.post<Map<String, dynamic>>(
          '/payments/cards/bind',
          data: {
            'token': 'kassa24:${DateTime.now().millisecondsSinceEpoch}',
            'panMask': '**** **** **** $last4',
            'holderName': holderName.trim().isEmpty ? null : holderName.trim(),
            'makeDefault': true,
          },
        ),
      );

      if (!mounted) {
        return;
      }
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(AppLocalizations.of(context)!.paymentsCardAddedMessage),
        ),
      );
      await _loadCards();
    } on Failure catch (failure) {
      if (!mounted) {
        return;
      }
      setState(() => _errorMessage = failure.message);
    } finally {
      if (mounted) {
        setState(() => _isSaving = false);
      }
    }
  }

  Future<void> _deleteCard(_PaymentCard card) async {
    try {
      await _apiClient.guard(
        () => _apiClient.dio.delete<void>('/payments/cards/${card.id}'),
      );
      await _loadCards();
    } on Failure catch (failure) {
      if (!mounted) {
        return;
      }
      setState(() => _errorMessage = failure.message);
    }
  }

  Future<void> _showAddCardDialog(AppLocalizations l10n) async {
    final last4Controller = TextEditingController();
    final holderController = TextEditingController();

    final result = await showDialog<({String last4, String holder})>(
      context: context,
      builder: (context) {
        return AlertDialog(
          title: Text(
            '${l10n.paymentsAddCardAction} · '
            '${l10n.paymentsKassa24Provider}',
          ),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: last4Controller,
                keyboardType: TextInputType.number,
                maxLength: 4,
                decoration: InputDecoration(
                  labelText: l10n.paymentsCardLast4Label,
                  counterText: '',
                ),
              ),
              const SizedBox(height: AppSpacing.sm),
              TextField(
                controller: holderController,
                textCapitalization: TextCapitalization.characters,
                decoration: InputDecoration(
                  labelText: l10n.paymentsCardHolderLabel,
                ),
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(context).pop(),
              child: Text(l10n.commonCancel),
            ),
            ElevatedButton(
              onPressed: () {
                final last4 = last4Controller.text.trim();
                if (!RegExp(r'^\d{4}$').hasMatch(last4)) {
                  return;
                }
                Navigator.of(
                  context,
                ).pop((last4: last4, holder: holderController.text));
              },
              child: Text(l10n.paymentsAddCardAction),
            ),
          ],
        );
      },
    );

    last4Controller.dispose();
    holderController.dispose();

    if (result == null) {
      return;
    }
    await _bindCard(result.last4, result.holder);
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(title: Text(l10n.paymentsTitle)),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(AppSpacing.md),
          children: [
            _PaymentTile(
              icon: Icons.payments_rounded,
              title: l10n.taxiPaymentMethodCash,
              selected: true,
            ),
            const SizedBox(height: AppSpacing.sm),
            if (_isLoading)
              const Padding(
                padding: EdgeInsets.all(AppSpacing.lg),
                child: Center(child: CircularProgressIndicator()),
              )
            else if (_cards.isEmpty)
              DosCard(
                child: Text(
                  l10n.paymentsEmpty,
                  style: Theme.of(context).textTheme.bodyMedium,
                ),
              )
            else
              ..._cards.map(
                (card) => Padding(
                  padding: const EdgeInsets.only(bottom: AppSpacing.sm),
                  child: _PaymentTile(
                    icon: Icons.credit_card_rounded,
                    title: card.label(l10n.paymentsKassa24Provider),
                    selected: card.isDefault,
                    onDelete: () => _deleteCard(card),
                  ),
                ),
              ),
            const SizedBox(height: AppSpacing.sm),
            DosCard(
              padding: EdgeInsets.zero,
              child: ListTile(
                leading: const Icon(Icons.add_card_rounded),
                title: Text(l10n.paymentsAddCardAction),
                subtitle: Text(l10n.paymentsKassa24Provider),
                trailing: _isSaving
                    ? const SizedBox(
                        width: 18,
                        height: 18,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : const Icon(Icons.add_rounded),
                onTap: _isSaving ? null : () => _showAddCardDialog(l10n),
              ),
            ),
            if (_errorMessage != null) ...[
              const SizedBox(height: AppSpacing.md),
              Text(
                ErrorMessageLocalizer.resolve(l10n, _errorMessage),
                style: Theme.of(
                  context,
                ).textTheme.bodyMedium?.copyWith(color: AppColors.danger),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Map<String, dynamic> _stringMap(Map<dynamic, dynamic> item) =>
      item.map((key, value) => MapEntry(key.toString(), value));
}

class _PaymentCard {
  const _PaymentCard({
    required this.id,
    required this.provider,
    required this.last4,
    required this.brand,
    required this.isDefault,
  });

  final String id;
  final String provider;
  final String last4;
  final String brand;
  final bool isDefault;

  String label(String kassaProvider) {
    final normalizedBrand = brand.trim().isEmpty ? 'Карта' : brand.trim();
    final providerLabel = provider == 'stub' ? kassaProvider : provider;
    return '$normalizedBrand · $providerLabel · •••• $last4';
  }

  factory _PaymentCard.fromJson(Map<String, dynamic> json) {
    return _PaymentCard(
      id: json['id'] as String? ?? '',
      provider: json['provider'] as String? ?? '',
      last4: json['last4'] as String? ?? '0000',
      brand: json['brand'] as String? ?? 'Карта',
      isDefault: json['isDefault'] as bool? ?? false,
    );
  }
}

class _PaymentTile extends StatelessWidget {
  const _PaymentTile({
    required this.icon,
    required this.title,
    this.selected = false,
    this.onDelete,
  });

  final IconData icon;
  final String title;
  final bool selected;
  final VoidCallback? onDelete;

  @override
  Widget build(BuildContext context) {
    return DosCard(
      padding: EdgeInsets.zero,
      child: ListTile(
        leading: CircleAvatar(
          backgroundColor: selected ? AppColors.primary : AppColors.surfaceAlt,
          child: Icon(icon, color: AppColors.text),
        ),
        title: Text(
          title,
          style: Theme.of(
            context,
          ).textTheme.titleMedium?.copyWith(fontSize: 14),
        ),
        trailing: onDelete != null
            ? IconButton(
                onPressed: onDelete,
                icon: const Icon(Icons.close_rounded),
              )
            : selected
            ? const Icon(Icons.check_circle_rounded, color: AppColors.primary)
            : const Icon(Icons.radio_button_unchecked_rounded),
      ),
    );
  }
}
