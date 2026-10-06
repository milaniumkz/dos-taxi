import 'dart:html' as html;

class WebNotificationPresenter {
  static const String _alarmDataUri =
      'data:audio/wav;base64,UklGRmQLAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YUALAAAAAMcA0wHkAL79M/ud/BQCTgf9BgAAdfcL9SX85gdmDgcJ9fqR7z7xAABPEBYU0wZ18gDoVPECCJAZhhYAAO3nyeI29i8TmSFQFAb1Tt224QAA2B9YJsEMLOfN1Avm8Q3TKw4mAABk2IbQR/B4Hsw0mR8X7wzLLtIAAGAvmziwEuPbmsHC2uATFT6WNQAA3MhEvljqwSn/R+IqKOnJuKXCAADoPt1Knxia0Geuec/PGVhQH0UAAFS5Aaxp5Ao1MlsrNjrjh6YdswAAcU4gXY4eUcU0mzDEvh+aYqdUAADLqb+Ze95TQGZudEFL3UWUlaMAADJdj22ZI0q8zoxKvJkjj20yXQAAzqJxkmfctkMyc7ZDZ9xxks6iAAAyXY9tmSNKvM6MSryZI49tMl0AAM6icZJn3LZDMnO2Q2fccZLOogAAMl2PbZkjSrzOjEq8mSOPbTJdAADOonGSZ9y2QzJztkNn3HGSzqIAADJdj22ZI0q8zoxKvJkjj20yXQAAzqJxkmfctkMyc7ZDZ9xxks6iAAAyXY9tmSNKvM6MSryZI49tMl0AAM6icZJn3LZDMnO2Q2fccZLOogAAMl2PbZkjSrzOjEq8mSOPbTJdAADOonGSZ9y2QzJztkNn3HGSzqIAADJdj22ZI0q8zoxKvJkjj20yXQAAzqJxkmfctkMyc7ZDZ9xxks6iAAAyXY9tmSNKvM6MSryZI49tMl0AAM6icZJn3LZDMnO2Q2fccZLOogAAMl2PbZkjSrzOjEq8mSOPbTJdAADOonGSZ9y2QzJztkNn3HGSzqIAADJdj22ZI0q8zoxKvJkjj20yXQAAzqJxkmfctkMyc7ZDZ9xxks6iAAAyXY9tmSNKvM6MSryZI49tMl0AAM6icZJn3LZDMnO2Q2fccZLOogAAMl2PbZkjSrzOjEq8mSOPbTJdAADOonGSZ9y2QzJztkNn3HGSzqIAADJdj22ZI0q8zoxKvJkjj20yXQAAzqJxkmfctkMyc7ZDZ9xxks6iAAAyXY9tmSNKvM6MSryZI49tMl0AAM6icZJn3LZDMnO2Q2fccZLOogAAMl2PbZkjSrzOjEq8mSOPbTJdAADOonGSZ9y2QzJztkNn3HGSzqIAADJdj22ZI0q8zoxKvJkjj20yXQAAzqJxkmfctkMyc7ZDZ9xxks6iAAAyXY9tmSNKvM6MSryZI49tMl0AAM6icZJn3LZDMnO2Q2fccZLOogAAMl2PbZkjSrzOjEq8mSOPbTJdAADOonGSZ9y2QzJztkNn3HGSzqIAADJdj22ZI0q8zoxKvJkjj20yXQAAzqJxkmfctkMyc7ZDZ9xxks6iAAAyXY9tmSNKvM6MSryZI49tMl0AAM6icZJn3LZDMnO2Q2fccZLOogAAMl2PbZkjSrzOjEq8mSOPbTJdAADOonGSZ9y2QzJztkNn3HGSzqIAADJdj22ZI0q8zoxKvJkjj20yXQAAzqJxkmfctkMyc7ZDZ9xxks6iAACdXDBs7iL7vWeQ1L4KIhVo9FcAADapqZpL38k9ZmjxPC/gxJ7frQAA91B+XnsecsbOnkvHlx1jWk5MAADctFqov+NSNf9ZejSi5HashbkAAFFFzVAIGunONK3CzyQZsUyoQAAAg8AMtjLo3CyZSwMsFukouizFAACqORtDlRVg15q7ONixFP8+ATUAACnMvsOl7GUkMz2MI4nt2sfS0AAABC5pNSIR1t8Ayq/gPhBNMVspAADP13DRGPHuG8wuFhv88YzVeNwAAF4ityevDE3oZ9gm6csLmyO1HQAAdeMi34v1eBNmIJ8Sb/Y+4x7oAAC3FgUaOwjE8M3mnfFYB+kVDxIAABzv1Oz++QELABIoCuL68PDF8wAAEQtTDMgDO/kz9RP65AI4CGgGAADC+ob6cf6KApoDsQFV/6H+a/8=';
  static bool _audioPrimed = false;

  static void armAudioOnNextGesture() {
    if (_audioPrimed) {
      return;
    }

    void prime(html.Event _) {
      _audioPrimed = true;
      final audio = html.AudioElement(_alarmDataUri)
        ..muted = true
        ..volume = 0;
      audio.play().catchError((_) {});
    }

    html.window.addEventListener('pointerdown', prime, true);
    html.window.addEventListener('keydown', prime, true);
  }

  static Future<void> playDriverOrderTone() async {
    try {
      final audio = html.AudioElement(_alarmDataUri)
        ..volume = 1
        ..preload = 'auto';
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
