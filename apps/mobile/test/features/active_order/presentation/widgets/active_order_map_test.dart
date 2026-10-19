import 'package:dos_mobile/features/active_order/domain/entities/active_order_service_type.dart';
import 'package:dos_mobile/features/active_order/domain/entities/active_order_session.dart';
import 'package:dos_mobile/features/active_order/presentation/widgets/active_order_map.dart';
import 'package:dos_mobile/features/home/domain/entities/address_suggestion.dart';
import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:latlong2/latlong.dart';

void main() {
  for (final type in ActiveOrderServiceType.values) {
    testWidgets('follows assigned driver above the order sheet for $type', (tester) async {
      tester.view.physicalSize = const Size(360, 640);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      final session = ActiveOrderSession(orderId: 'order', serviceType: type,
        fromAddress: const AddressSuggestion(title: 'A', subtitle: '', location: LatLng(43.23, 76.88)),
        toAddress: const AddressSuggestion(title: 'B', subtitle: '', location: LatLng(43.25, 76.95)),
        routePoints: const [LatLng(43.23, 76.88), LatLng(43.25, 76.95)],
        price: 500, currency: 'KZT', initialEtaSeconds: 300, vehicleLabel: 'Taxi');
      Future<void> show(LatLng point, double fraction) async {
        await tester.pumpWidget(MaterialApp(home: Scaffold(body:
          ActiveOrderMap(session: session, executorLocation: point, bottomFraction: fraction))));
        await tester.pump();
        await tester.pump();
        final map = tester.widget<FlutterMap>(find.byType(FlutterMap));
        final projected = map.mapController!.camera.latLngToScreenOffset(point);
        expect(projected.dx, closeTo(180, 2));
        expect(projected.dy, closeTo(640 * (1-fraction)/2+35, 2));
        expect(find.byType(PolylineLayer), findsNothing);
      }
      await show(const LatLng(43.24, 76.90), 0.32);
      await show(const LatLng(43.245, 76.91), 0.32);
      await show(const LatLng(43.245, 76.91), 0.60);
      await tester.pumpWidget(const SizedBox());
    });
  }
}
