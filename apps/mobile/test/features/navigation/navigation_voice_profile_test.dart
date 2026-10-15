import 'package:dos_mobile/features/navigation/domain/navigation_voice_profile.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('normal web rate is 1.0 instead of half-speed native scale', () {
    expect(navigationSpeechRate(web: true), 1);
    expect(navigationSpeechRate(web: false), .5);
  });
  test('natural voice ranks ahead of a basic voice of the same language', () {
    expect(
      navigationVoiceQuality({'name': 'Microsoft Russian Natural'}),
      greaterThan(navigationVoiceQuality({'name': 'Microsoft Irina'})),
    );
    expect(
      navigationVoiceQuality({'name': 'Google русский'}),
      greaterThan(navigationVoiceQuality({'name': 'Basic Russian'})),
    );
  });
}
