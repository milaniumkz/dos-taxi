import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../../core/l10n/app_localizations.dart';
import '../../../../core/theme/app_colors.dart';
import '../../domain/entities/driver_topup_settings.dart';
import '../../domain/repositories/executor_repository.dart';

class DriverTopUpButton extends StatefulWidget {
  const DriverTopUpButton({
    super.key,
    required this.repository,
    required this.onManual,
    this.openLink,
  });

  final ExecutorRepository repository;
  final VoidCallback onManual;
  final Future<bool> Function(Uri)? openLink;

  @override
  State<DriverTopUpButton> createState() => _DriverTopUpButtonState();
}

class _DriverTopUpButtonState extends State<DriverTopUpButton> {
  bool _loading = false;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    return ListTile(
      onTap: _loading ? null : _open,
      leading: const Icon(
        Icons.account_balance_wallet_rounded,
        color: AppColors.text,
      ),
      title: Text(l10n.driverBalanceTopUpTitle),
      subtitle: Text(l10n.driverTopUpActionSubtitle),
      trailing: _loading
          ? const SizedBox(
              width: 20,
              height: 20,
              child: CircularProgressIndicator(strokeWidth: 2),
            )
          : const Icon(Icons.chevron_right_rounded),
    );
  }

  Future<void> _open() async {
    if (_loading) return;
    setState(() => _loading = true);
    final l10n = AppLocalizations.of(context)!;
    try {
      final result = await widget.repository.fetchTopUpSettings();
      final settings = result.fold(
        (failure) => throw failure,
        (value) => value,
      );
      if (!mounted) return;
      switch (settings.mode) {
        case DriverTopUpMode.manual:
          widget.onManual();
        case DriverTopUpMode.disabled:
          _message(l10n.driverTopUpDisabled);
        case DriverTopUpMode.kaspiLink:
          final url = settings.kaspiUrl;
          if (url == null) {
            _message(l10n.driverTopUpLinkFailed);
            return;
          }
          try {
            final opened =
                await (widget.openLink?.call(url) ??
                    launchUrl(
                      url,
                      mode: LaunchMode.externalApplication,
                      webOnlyWindowName: '_self',
                    ));
            if (!opened) _message(l10n.driverTopUpLinkFailed);
          } catch (_) {
            _message(l10n.driverTopUpLinkFailed);
          }
      }
    } catch (_) {
      _message(l10n.driverTopUpUnavailable);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  void _message(String text) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(text)));
  }
}
