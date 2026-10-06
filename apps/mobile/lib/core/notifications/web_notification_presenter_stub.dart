class WebNotificationPresenter {
  static void armAudioOnNextGesture() {}

  static Future<void> playDriverOrderTone() async {}

  static void stopDriverOrderTone() {}

  static Future<void> show({
    required String title,
    required String body,
    String? payload,
  }) async {}
}
