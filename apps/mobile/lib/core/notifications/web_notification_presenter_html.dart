import 'dart:html' as html;

class WebNotificationPresenter {
  static const String _alarmDataUri =
      'data:audio/wav;base64,UklGRmQLAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YUALAAAAAMcA0wHkAL79M/ud/BQCTgf9BgAAdfcL9SX85gdmDgcJ9fqR7z7xAABPEBYU0wZ18gDoVPECCJAZhhYAAO3nyeI29i8TmSFQFAb1Tt224QAA2B9YJsEMLOfN1Avm8Q3TKw4mAABk2IbQR/B4Hsw0mR8X7wzLLtIAAGAvmziwEuPbmsHC2uATFT6WNQAA3MhEvljqwSn/R+IqKOnJuKXCAADoPt1Knxia0Geuec/PGVhQH0UAAFS5Aaxp5Ao1MlsrNjrjh6YdswAAcU4gXY4eUcU0mzDEvh+aYqdUAADLqb+Ze95TQGZudEFL3UWUlaMAADJdj22ZI0q8zoxKvJkjj20yXQAAzqJxkmfctkMyc7ZDZ9xxks6iAAAyXY9tmSNKvM6MSryZI49tMl0AAM6icZJn3LZDMnO2Q2fccZLOogAAMl2PbZkjSrzOjEq8mSOPbTJdAADOonGSZ9y2QzJztkNn3HGSzqIAADJdj22ZI0q8zoxKvJkjj20yXQAAzqJxkmfctkMyc7ZDZ9xxks6iAAAyXY9tmSNKvM6MSryZI49tMl0AAM6icZJn3LZDMnO2Q2fccZLOogAAMl2PbZkjSrzOjEq8mSOPbTJdAADOonGSZ9y2QzJztkNn3HGSzqIAADJdj22ZI0q8zoxKvJkjj20yXQAAzqJxkmfctkMyc7ZDZ9xxks6iAAAyXY9tmSNKvM6MSryZI49tMl0AAM6icZJn3LZDMnO2Q2fccZLOogAAMl2PbZkjSrzOjEq8mSOPbTJdAADOonGSZ9y2QzJztkNn3HGSzqIAADJdj22ZI0q8zoxKvJkjj20yXQAAzqJxkmfctkMyc7ZDZ9xxks6iAAAyXY9tmSNKvM6MSryZI49tMl0AAM6icZJn3LZDMnO2Q2fccZLOogAAMl2PbZkjSrzOjEq8mSOPbTJdAADOonGSZ9y2QzJztkNn3HGSzqIAADJdj22ZI0q8zoxKvJkjj20yXQAAzqJxkmfctkMyc7ZDZ9xxks6iAAAyXY9tmSNKvM6MSryZI49tMl0AAM6icZJn3LZDMnO2Q2fccZLOogAAMl2PbZkjSrzOjEq8mSOPbTJdAADOonGSZ9y2QzJztkNn3HGSzqIAADJdj22ZI0q8zoxKvJkjj20yXQAAzqJxkmfctkMyc7ZDZ9xxks6iAAAyXY9tmSNKvM6MSryZI49tMl0AAM6icZJn3LZDMnO2Q2fccZLOogAAMl2PbZkjSrzOjEq8mSOPbTJdAADOonGSZ9y2QzJztkNn3HGSzqIAADJdj22ZI0q8zoxKvJkjj20yXQAAzqJxkmfctkMyc7ZDZ9xxks6iAAAyXY9tmSNKvM6MSryZI49tMl0AAM6icZJn3LZDMnO2Q2fccZLOogAAMl2PbZkjSrzOjEq8mSOPbTJdAADOonGSZ9y2QzJztkNn3HGSzqIAADJdj22ZI0q8zoxKvJkjj20yXQAAzqJxkmfctkMyc7ZDZ9xxks6iAACdXDBs7iL7vWeQ1L4KIhVo9FcAADapqZpL38k9ZmjxPC/gxJ7frQAA91B+XnsecsbOnkvHlx1jWk5MAADctFqov+NSNf9ZejSi5HashbkAAFFFzVAIGunONK3CzyQZsUyoQAAAg8AMtjLo3CyZSwMsFukouizFAACqORtDlRVg15q7ONixFP8+ATUAACnMvsOl7GUkMz2MI4nt2sfS0AAABC5pNSIR1t8Ayq/gPhBNMVspAADP13DRGPHuG8wuFhv88YzVeNwAAF4ityevDE3oZ9gm6csLmyO1HQAAdeMi34v1eBNmIJ8Sb/Y+4x7oAAC3FgUaOwjE8M3mnfFYB+kVDxIAABzv1Oz++QELABIoCuL68PDF8wAAEQtTDMgDO/kz9RP65AI4CGgGAADC+ob6cf6KApoDsQFV/6H+a/8=';
  static bool _audioPrimed = false;
  static bool _gestureArmed = false;
  static final html.AudioElement _audio = html.AudioElement(_alarmDataUri)
    ..preload = 'auto';

  static void armAudioOnNextGesture() {
    if (_audioPrimed || _gestureArmed) {
      return;
    }

    _gestureArmed = true;
    void prime(html.Event _) {
      html.window.removeEventListener('pointerdown', prime, true);
      html.window.removeEventListener('keydown', prime, true);
      _audioPrimed = true;
      final audio = _audio
        ..muted = true
        ..volume = 0;
      audio
          .play()
          .then((_) {
            audio.pause();
            audio.currentTime = 0;
            audio.muted = false;
            audio.volume = 1;
          })
          .catchError((_) {
            _audioPrimed = false;
            _gestureArmed = false;
          });
    }

    html.window.addEventListener('pointerdown', prime, true);
    html.window.addEventListener('keydown', prime, true);
  }

  static Future<void> playDriverOrderTone() async {
    try {
      final audio = _audio
        ..muted = false
        ..volume = 1
        ..currentTime = 0;
      await audio.play();
    } catch (_) {
      // Browser may block audio until the driver taps the page once.
    }
  }

  static void stopDriverOrderTone() {}

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
