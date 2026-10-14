import 'dart:async';
import 'package:dartz/dartz.dart';
import 'package:dos_mobile/core/errors/failure.dart';
import 'package:dos_mobile/core/l10n/app_localizations_ru.dart';
import 'package:dos_mobile/core/l10n/app_localizations_kk.dart';
import 'package:dos_mobile/features/navigation/domain/navigation_ports.dart';
import 'package:dos_mobile/features/navigation/domain/navigation_route.dart';
import 'package:dos_mobile/features/navigation/presentation/navigation_cubit.dart';
import 'package:dos_mobile/features/navigation/presentation/navigation_instructions.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:latlong2/latlong.dart';

class Repo implements NavigationRepository {
  final destinations = <LatLng>[];
  Completer<Either<Failure, RoadRoute>>? pending;
  @override
  Future<Either<Failure, RoadRoute>> route(LatLng from, LatLng to) async {
    destinations.add(to);
    return pending?.future ?? Right(road());
  }
}

class Gps implements NavigationLocation {
  final controller = StreamController<NavigationFix>.broadcast();
  @override
  Stream<NavigationFix> watch() => controller.stream;
}

class Voice implements NavigationSpeech {
  final languages = <String>[], said = <String>[];
  bool available = true;
  Completer<bool>? pending;
  int stops = 0;
  @override
  Future<bool> enable(String locale) async {
    languages.add(locale);
    return pending?.future ?? available;
  }

  @override
  Future<void> speak(String text) async {
    said.add(text);
  }

  @override
  Future<void> stop() async {
    stops++;
  }

  @override
  Future<void> dispose() async {}
}

const origin = LatLng(0, 0),
    pickup = LatLng(0, .0108),
    destination = LatLng(0, .02);
RoadRoute road() => RoadRoute(
  points: const [origin, LatLng(0, .0036), pickup],
  distance: 1200,
  duration: 180,
  maneuvers: const [
    NavigationManeuver(
      point: origin,
      type: 'depart',
      modifier: 'straight',
      distance: 0,
      roadName: '',
    ),
    NavigationManeuver(
      point: LatLng(0, .0036),
      type: 'turn',
      modifier: 'left',
      distance: 400,
      roadName: 'Абай',
    ),
    NavigationManeuver(
      point: pickup,
      type: 'arrive',
      modifier: '',
      distance: 1200,
      roadName: '',
    ),
  ],
);
void main() {
  late Repo repo;
  late Gps gps;
  late Voice voice;
  late NavigationCubit c;
  late DateTime clock;
  setUp(() {
    repo = Repo();
    gps = Gps();
    voice = Voice();
    clock = DateTime.utc(2026, 10, 14);
    c = NavigationCubit(
      repository: repo,
      location: gps,
      speech: voice,
      initial: origin,
      pickup: pickup,
      destination: destination,
      status: 'accepted',
      now: () => clock,
    );
  });
  tearDown(() async {
    await c.close();
    await gps.controller.close();
  });
  Future<void> fix(double metres, {double accuracy = 5, double lat = 0}) async {
    clock = clock.add(const Duration(seconds: 2));
    c.update(
      NavigationFix(
        LatLng(lat, metres / 1200 * .0108),
        accuracy: accuracy,
        timestamp: clock,
        heading: 90,
        speed: 10,
      ),
    );
    await Future<void>.delayed(Duration.zero);
  }

  test('rejects poor/stale GPS without creating a road route', () async {
    await fix(0, accuracy: 200);
    expect(repo.destinations, isEmpty);
    expect(c.state.gpsReady, false);
    c.update(
      NavigationFix(
        origin,
        accuracy: 5,
        timestamp: clock.subtract(const Duration(minutes: 1)),
      ),
    );
    expect(repo.destinations, isEmpty);
  });
  test(
    'gives advance, 300m, 100m and immediate cues without repeated GPS speech',
    () async {
      await c.setLocale('ru');
      await fix(0);
      final first = c.state.cue!.id;
      await fix(120);
      expect(c.state.cue!.metres, 300);
      expect(c.state.cue!.id, isNot(first));
      await fix(320);
      expect(c.state.cue!.metres, 80);
      expect(c.state.next!.modifier, 'left');
      await fix(390);
      expect(c.state.cue!.immediate, true);
      final cue = c.state.cue!;
      await c.say('turn', cue);
      await c.say('turn', cue);
      expect(voice.said, ['turn']);
      await fix(391);
      expect(c.state.cue!.id, cue.id);
      expect(c.state.heading, 90);
    },
  );
  test(
    'keeps pickup while waiting, then switches to destination automatically',
    () async {
      await fix(0);
      expect(repo.destinations, [pickup]);
      c.setStatus('waiting');
      await fix(10);
      expect(repo.destinations, [pickup]);
      expect(c.state.pickup, true);
      c.setStatus('in_progress');
      await Future<void>.delayed(Duration.zero);
      expect(repo.destinations.last, destination);
      expect(c.state.pickup, false);
      c.setStatus('completed');
      final count = repo.destinations.length;
      await fix(20);
      expect(repo.destinations.length, count);
    },
  );
  test(
    'ignores pending pickup route when trip starts before it returns',
    () async {
      final old = Completer<Either<Failure, RoadRoute>>();
      repo.pending = old;
      await fix(0);
      expect(c.state.routing, true);
      repo.pending = null;
      c.setStatus('in_progress');
      await Future<void>.delayed(Duration.zero);
      expect(repo.destinations, [pickup, destination]);
      expect(c.state.routing, false);
      final route = c.state.route;
      old.complete(Right(road()));
      await Future<void>.delayed(Duration.zero);
      expect(identical(c.state.route, route), true);
    },
  );
  test(
    'confirms deviation across good fixes before a debounced reroute',
    () async {
      await fix(0);
      await fix(30, lat: .003);
      expect(repo.destinations.length, 1);
      await fix(40, lat: .003);
      expect(repo.destinations.length, 1);
      await fix(50, lat: .003);
      await fix(60, lat: .003);
      expect(repo.destinations.length, 2);
    },
  );
  test('never substitutes Russian voice when Kazakh is unavailable', () async {
    voice.available = false;
    await c.setLocale('kk');
    await fix(0);
    await c.say('қазақша', c.state.cue!);
    expect(voice.languages, ['kk-KZ']);
    expect(c.state.voiceAvailable, false);
    expect(voice.said, isEmpty);
  });
  test(
    'cancels a queued cue if order finishes while voice initializes',
    () async {
      final pending = Completer<bool>();
      voice.pending = pending;
      final prepare = c.setLocale('ru');
      await fix(0);
      final saying = c.say('left', c.state.cue!);
      c.setStatus('completed');
      pending.complete(true);
      await prepare;
      await saying;
      expect(voice.said, isEmpty);
    },
  );
  test(
    'switching locale reissues current instruction using matching voice',
    () async {
      await c.setLocale('ru');
      await fix(0);
      final old = c.state.cue!;
      await c.setLocale('kk');
      expect(c.state.cue!.id, isNot(old.id));
      expect(voice.languages, ['ru-RU', 'kk-KZ']);
      final text = cueText(
        AppLocalizationsKk(),
        c.state.cue!,
        pickup: true,
        arrived: false,
      );
      expect(text, contains('солға бұрылыңыз'));
      await c.say(text, c.state.cue!);
      expect(voice.said.single, text);
      expect(
        cueText(AppLocalizationsRu(), old, pickup: true, arrived: false),
        contains('поверните налево'),
      );
    },
  );
  test(
    'destination speech survives switching phase while voice is loading',
    () async {
      final pending = Completer<bool>();
      voice.pending = pending;
      final prepare = c.setLocale('kk');
      await fix(0);
      c.setStatus('waiting');
      c.setStatus('in_progress');
      pending.complete(true);
      await prepare;
      await Future<void>.delayed(Duration.zero);
      await fix(50);
      await c.say('межелі жерге', c.state.cue!);
      expect(voice.said, ['межелі жерге']);
      expect(voice.languages.every((l) => l == 'kk-KZ'), true);
    },
  );
  test('roundabout exits and U-turn instructions are localized', () {
    const circle = NavigationManeuver(
      point: origin,
      type: 'roundabout',
      modifier: 'right',
      distance: 500,
      roadName: '',
      exit: 3,
    );
    expect(
      maneuverAction(AppLocalizationsRu(), circle, pickup: true),
      contains('съезд номер 3'),
    );
    expect(
      maneuverAction(AppLocalizationsKk(), circle, pickup: true),
      contains('нөмірі: 3'),
    );
    const turn = NavigationManeuver(
      point: origin,
      type: 'turn',
      modifier: 'uturn',
      distance: 50,
      roadName: '',
    );
    expect(
      maneuverAction(AppLocalizationsKk(), turn, pickup: true),
      'кері бұрылыңыз',
    );
  });
}
