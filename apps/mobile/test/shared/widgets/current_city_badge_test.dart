import 'package:dos_mobile/core/l10n/app_localizations.dart';
import 'package:dos_mobile/shared/widgets/current_city_badge.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets('detects city, refreshes after moving and handles GPS failure', (tester) async {
    Map<String, dynamic>? city = {'nameRu': 'Байконур', 'nameKk': 'Байқоңыр'};
    await tester.pumpWidget(MaterialApp(
      locale: const Locale('ru'),
      supportedLocales: AppLocalizations.supportedLocales,
      localizationsDelegates: AppLocalizations.localizationsDelegates,
      home: Scaffold(body: CurrentCityBadge(locate: () async => city)),
    ));
    await tester.pump();
    expect(find.text('Байконур'), findsOneWidget);
    city = {'nameRu': 'Алматы', 'nameKk': 'Алматы'};
    await tester.pump(const Duration(minutes: 1));
    await tester.pump();
    expect(find.text('Алматы'), findsOneWidget);
    city = null;
    await tester.pump(const Duration(minutes: 1));
    await tester.pump();
    expect(find.text('Город не определён'), findsOneWidget);
    expect(find.text('Алматы'), findsNothing);
    await tester.pumpWidget(const SizedBox());
  });
}
