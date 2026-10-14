import '../../../core/l10n/app_localizations.dart';
import '../domain/navigation_route.dart';
import 'navigation_cubit.dart';

String maneuverAction(
  AppLocalizations l,
  NavigationManeuver maneuver, {
  required bool pickup,
}) {
  final type = maneuver.type, modifier = maneuver.modifier;
  if (type == 'arrive') return pickup ? l.navStopPickup : l.navStopDestination;
  if (type == 'roundabout' || type == 'rotary' || type == 'roundabout turn') {
    return maneuver.exit != null
        ? l.navRoundaboutExit(maneuver.exit!)
        : l.navRoundabout;
  }
  if (type == 'exit roundabout' || type == 'exit rotary') {
    return l.navExitRoundabout;
  }
  if (type == 'fork') {
    return modifier.contains('left')
        ? l.navKeepLeft
        : modifier.contains('right')
        ? l.navKeepRight
        : l.navStraight;
  }
  if (type == 'merge') return l.navMerge;
  return switch (modifier) {
    'left' => l.navTurnLeft,
    'right' => l.navTurnRight,
    'slight left' => l.navSlightLeft,
    'slight right' => l.navSlightRight,
    'sharp left' => l.navSharpLeft,
    'sharp right' => l.navSharpRight,
    'uturn' => l.navUturn,
    _ => l.navStraight,
  };
}

String cueText(
  AppLocalizations l,
  NavigationCue cue, {
  required bool pickup,
  required bool arrived,
}) {
  if (arrived && cue.maneuver.type == 'arrive') {
    return pickup ? l.navArrivedPickup : l.navArrivedDestination;
  }
  final action = maneuverAction(l, cue.maneuver, pickup: pickup);
  return cue.immediate ? action : l.navInMeters(cue.metres, action);
}
