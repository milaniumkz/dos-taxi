// Web Speech uses 1.0 for normal speed. Native flutter_tts uses a 0..1 scale.
double navigationSpeechRate({required bool web}) => web ? 1.0 : 0.5;

int navigationVoiceQuality(Map voice) {
  final name = (voice['name'] ?? '').toString().toLowerCase();
  var score = 0;
  if (RegExp(r'natural|neural|premium|enhanced').hasMatch(name)) score += 100;
  if (name.contains('google')) score += 30;
  if (name.contains('microsoft')) score += 20;
  final quality = num.tryParse((voice['quality'] ?? '').toString());
  if (quality != null) score += (quality / 100).round();
  return score;
}
