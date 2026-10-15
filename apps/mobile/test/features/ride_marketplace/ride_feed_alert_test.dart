import 'package:dartz/dartz.dart';
import 'package:dos_mobile/features/ride_marketplace/domain/ride_repository.dart';
import 'package:dos_mobile/features/ride_marketplace/presentation/ride_poll_cubit.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

class Repository extends Mock implements RideRepository {}

void main() {
  test(
    'sounds once for new requests, not initial, reordered, removed or paged requests',
    () async {
      var ids = ['a', 'b'];
      var alerts = 0;
      var paged = false;
      final cubit = RidePollCubit(
        Repository(),
        () async => Right({
          'items': ids.map((id) => {'id': id}).toList(),
          'nextOffset': paged ? 2 : null,
        }),
        nextPage: (_) async => const Right({
          'items': [
            {'id': 'paged'},
          ],
          'nextOffset': null,
        }),
        onNewRequests: () => alerts++,
      );
      await cubit.refresh();
      expect(alerts, 0);
      ids = ['b', 'a'];
      await cubit.refresh();
      expect(alerts, 0);
      paged = true;
      await cubit.refresh();
      await cubit.more();
      expect(alerts, 0);
      ids = ['new', 'b'];
      await cubit.refresh();
      expect(alerts, 1);
      await cubit.refresh();
      ids = ['b'];
      await cubit.refresh();
      ids = ['paged', 'new', 'b'];
      await cubit.refresh();
      expect(alerts, 1);
      ids = ['new2', 'new3'];
      await cubit.refresh();
      expect(alerts, 2);
      await cubit.close();
    },
  );
  test(
    'passenger offer revisions notify once per version and expose new items',
    () async {
      var items = <Map<String, dynamic>>[
        {'id': 'existing', 'version': 1},
      ];
      final received = <String>[];
      final cubit = RidePollCubit(
        Repository(),
        () async => Right({'items': items}),
        onNewItems: (rows) => received.addAll(
          rows.map((row) => '${row['id']}:${row['version']}'),
        ),
      );
      await cubit.refresh();
      expect(received, isEmpty);
      items = [
        {'id': 'new-offer', 'version': 1},
        {'id': 'existing', 'version': 1},
      ];
      await cubit.refresh();
      await cubit.refresh();
      expect(received, ['new-offer:1']);
      items = [
        {'id': 'new-offer', 'version': 2},
      ];
      await cubit.refresh();
      expect(received, ['new-offer:1', 'new-offer:2']);
      await cubit.close();
    },
  );
}
