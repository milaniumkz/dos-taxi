import 'dart:async';
import 'dart:html' as html;
import 'dart:js_interop';

class WebNotificationPresenter {
  static _AudioContext? _context;
  static bool _gestureArmed = false;
  static final Set<_Oscillator> _tones = {};

  static void armAudioOnNextGesture() {
    if (_gestureArmed) return;
    _gestureArmed = true;
    // Keep listening: mobile browsers may suspend audio after backgrounding.
    void unlock(html.Event _) {
      unawaited(_unlock());
    }

    html.window.addEventListener('pointerdown', unlock, true);
    html.window.addEventListener('touchend', unlock, true);
    html.window.addEventListener('keydown', unlock, true);
  }

  static Future<bool> _unlock() async {
    try {
      final context = _context ??= _AudioContext();
      // resume() must be invoked synchronously within the user gesture.
      if (context.state != 'running') {
        await context.resume().toDart.timeout(const Duration(seconds: 1));
      }
      return context.state == 'running';
    } catch (_) {
      return false;
    }
  }

  static Future<bool> enableDriverAudio() async {
    if (!await _unlock()) return false;
    await playDriverOrderTone();
    return true;
  }

  static Future<void> playDriverOrderTone() async {
    final context = _context;
    if (context == null || context.state != 'running') {
      throw StateError('Driver audio requires a user gesture');
    }
    stopDriverOrderTone();
    final now = context.currentTime;
    // Two short, gently fading notes; no media download or decoder needed.
    for (var i = 0; i < 2; i++) {
      final oscillator = context.createOscillator();
      final gain = context.createGain();
      final start = now + i * .26;
      oscillator.frequency.value = i == 0 ? 880 : 1174;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(.35, start + .015);
      gain.gain.linearRampToValueAtTime(0, start + .22);
      oscillator.connect(gain);
      gain.connect(context.destination);
      _tones.add(oscillator);
      oscillator.onended = (() {
        _tones.remove(oscillator);
        oscillator.disconnect();
        gain.disconnect();
      }).toJS;
      oscillator.start(start);
      oscillator.stop(start + .23);
    }
  }

  static void stopDriverOrderTone() {
    for (final tone in _tones.toList()) {
      tone.stop();
    }
    _tones.clear();
  }

  static Future<void> show({
    required String title,
    required String body,
    String? payload,
  }) async {
    if (!html.Notification.supported ||
        html.Notification.permission != 'granted') {
      return;
    }

    html.Notification(
      title,
      body: body,
      tag: payload ?? title,
      icon: '/passenger/icons/Icon-192.png',
    );
  }
}

@JS('AudioContext')
extension type _AudioContext._(JSObject _) implements JSObject {
  external factory _AudioContext();
  external String get state;
  external double get currentTime;
  external JSObject get destination;
  external JSPromise<JSAny?> resume();
  external _Oscillator createOscillator();
  external _Gain createGain();
}

extension type _Oscillator(JSObject _) implements JSObject {
  external _Param get frequency;
  external void connect(JSObject destination);
  external void disconnect();
  external void start(double when);
  external void stop([double when]);
  external set onended(JSFunction callback);
}

extension type _Gain(JSObject _) implements JSObject {
  external _Param get gain;
  external void connect(JSObject destination);
  external void disconnect();
}

extension type _Param(JSObject _) implements JSObject {
  external set value(double value);
  external void setValueAtTime(double value, double when);
  external void linearRampToValueAtTime(double value, double when);
}
