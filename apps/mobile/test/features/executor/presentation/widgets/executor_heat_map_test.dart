import 'package:dos_mobile/features/executor/presentation/widgets/executor_heat_map.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:latlong2/latlong.dart';

void main() {
  testWidgets(
    'location stays centered above dashboard panels on initial load and recenter',
    (tester) async {
      tester.view.physicalSize = const Size(400, 800);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      Future<void> show({
        required EdgeInsets occlusion,
        int request = 0,
      }) async {
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: ExecutorHeatMap(
                currentLocation: const LatLng(52.28, 76.97),
                viewportOcclusion: occlusion,
                recenterRequestId: request,
              ),
            ),
          ),
        );
        await tester.pump();
        await tester.pump();
      }

      await show(occlusion: const EdgeInsets.only(top: 80, bottom: 320));
      expect(
        tester.getCenter(find.byIcon(Icons.navigation_rounded)).dy,
        closeTo(280, 1),
      );
      await show(
        occlusion: const EdgeInsets.only(top: 100, bottom: 400),
        request: 1,
      );
      expect(
        tester.getCenter(find.byIcon(Icons.navigation_rounded)).dy,
        closeTo(250, 1),
      );
      expect(
        tester.getCenter(find.byIcon(Icons.navigation_rounded)).dx,
        closeTo(200, 1),
      );
    },
  );
}
