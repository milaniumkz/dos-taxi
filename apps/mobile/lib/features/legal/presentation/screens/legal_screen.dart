import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../../core/l10n/app_localizations.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../../shared/widgets/dos_ui.dart';

enum LegalDocumentType {
  privacy(path: '/legal/privacy', url: 'http://89.126.200.51/privacy.html'),
  terms(path: '/legal/terms', url: 'http://89.126.200.51/terms.html');

  const LegalDocumentType({required this.path, required this.url});

  final String path;
  final String url;
}

class LegalScreen extends StatelessWidget {
  const LegalScreen({required this.type, super.key});

  final LegalDocumentType type;

  static const privacyRoutePath = '/legal/privacy';
  static const termsRoutePath = '/legal/terms';

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final title = switch (type) {
      LegalDocumentType.privacy => l10n.legalPrivacyTitle,
      LegalDocumentType.terms => l10n.legalTermsTitle,
    };
    final body = switch (type) {
      LegalDocumentType.privacy => l10n.legalPrivacyBody,
      LegalDocumentType.terms => l10n.legalTermsBody,
    };
    return Scaffold(
      appBar: AppBar(title: Text(title)),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(AppSpacing.md),
          children: [
            DosCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Icon(
                    type == LegalDocumentType.privacy
                        ? Icons.privacy_tip_rounded
                        : Icons.description_rounded,
                    color: AppColors.primary,
                    size: 32,
                  ),
                  const SizedBox(height: AppSpacing.md),
                  Text(title, style: Theme.of(context).textTheme.titleLarge),
                  const SizedBox(height: AppSpacing.sm),
                  Text(body, style: Theme.of(context).textTheme.bodyLarge),
                  const SizedBox(height: AppSpacing.lg),
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton.icon(
                      onPressed: () => launchUrl(
                        Uri.parse(type.url),
                        mode: LaunchMode.externalApplication,
                      ),
                      icon: const Icon(Icons.open_in_new_rounded),
                      label: Text(l10n.legalOpenWeb),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
