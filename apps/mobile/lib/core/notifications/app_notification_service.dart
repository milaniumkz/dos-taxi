import 'dart:async';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';

import '../../features/executor/domain/entities/incoming_executor_offer.dart';
import 'web_notification_presenter.dart';

class AppNotificationService {
  AppNotificationService();

  static final Int64List _driverOrderVibrationPattern = Int64List.fromList([
    0,
    700,
    250,
    700,
    250,
    900,
  ]);

  static final AndroidNotificationChannel _driverOrdersChannel =
      AndroidNotificationChannel(
        'dos_driver_orders_v3',
        'Заказы водителя',
        description: 'Громкие уведомления о новых заказах',
        importance: Importance.max,
        playSound: true,
        enableVibration: true,
        vibrationPattern: _driverOrderVibrationPattern,
        audioAttributesUsage: AudioAttributesUsage.alarm,
      );
  static const AndroidNotificationChannel _orderAlertsChannel =
      AndroidNotificationChannel(
        'dos_order_alerts_v1',
        'Важные события заказа',
        description: 'Приезд водителя, начало поездки и отмена заказа',
        importance: Importance.max,
        playSound: true,
        enableVibration: true,
      );
  static const AndroidNotificationChannel _orderUpdatesChannel =
      AndroidNotificationChannel(
        'dos_order_updates_v1',
        'Обновления заказа',
        description: 'Обычные статусы заказа',
        importance: Importance.high,
        playSound: true,
        enableVibration: true,
      );

  final FlutterLocalNotificationsPlugin _localNotifications =
      FlutterLocalNotificationsPlugin();
  bool _isInitialized = false;
  StreamSubscription<RemoteMessage>? _foregroundSubscription;
  Timer? _driverOrderAlarmTimer;
  int _driverOrderAlarmTicks = 0;

  static const String _webVapidKey = String.fromEnvironment(
    'FIREBASE_WEB_VAPID_KEY',
  );

  String get devicePlatform => kIsWeb ? 'web' : defaultTargetPlatform.name;

  Future<void> initialize() async {
    if (_isInitialized) {
      return;
    }

    try {
      if (kIsWeb) {
        WebNotificationPresenter.armAudioOnNextGesture();
        await FirebaseMessaging.instance.requestPermission(
          alert: true,
          badge: true,
          sound: true,
        );
        _foregroundSubscription = FirebaseMessaging.onMessage.listen(
          showRemoteMessage,
        );
        _isInitialized = true;
        return;
      }

      const initializationSettings = InitializationSettings(
        android: AndroidInitializationSettings('@mipmap/ic_launcher'),
        iOS: DarwinInitializationSettings(
          requestAlertPermission: false,
          requestBadgePermission: false,
          requestSoundPermission: false,
        ),
      );
      await _localNotifications.initialize(initializationSettings);

      final androidNotifications = _localNotifications
          .resolvePlatformSpecificImplementation<
            AndroidFlutterLocalNotificationsPlugin
          >();
      await androidNotifications?.createNotificationChannel(
        _driverOrdersChannel,
      );
      await androidNotifications?.createNotificationChannel(
        _orderAlertsChannel,
      );
      await androidNotifications?.createNotificationChannel(
        _orderUpdatesChannel,
      );
      await androidNotifications?.requestNotificationsPermission();

      await _localNotifications
          .resolvePlatformSpecificImplementation<
            IOSFlutterLocalNotificationsPlugin
          >()
          ?.requestPermissions(alert: true, badge: true, sound: true);
      await FirebaseMessaging.instance.requestPermission(
        alert: true,
        badge: true,
        sound: true,
      );

      _foregroundSubscription = FirebaseMessaging.onMessage.listen(
        showRemoteMessage,
      );
      _isInitialized = true;
    } catch (error, stackTrace) {
      FlutterError.reportError(
        FlutterErrorDetails(
          exception: error,
          stack: stackTrace,
          library: 'notifications',
          context: ErrorDescription('initializing local notifications'),
        ),
      );
    }
  }

  Future<String?> deviceToken() async {
    try {
      if (kIsWeb) {
        return FirebaseMessaging.instance.getToken(
          vapidKey: _webVapidKey.isEmpty ? null : _webVapidKey,
        );
      }

      return FirebaseMessaging.instance.getToken();
    } catch (_) {
      return null;
    }
  }

  Future<void> showIncomingOrder(IncomingExecutorOffer offer) async {
    unawaited(startDriverIncomingOrderAlarm());
    await _showLocalNotification(
      id: offer.orderId.hashCode & 0x7fffffff,
      title: 'Новый заказ',
      body: '${offer.pickupAddress} → ${offer.destinationAddress}',
      payload: 'incoming_order:${offer.orderId}',
      channelId: _driverOrdersChannel.id,
      channelName: _driverOrdersChannel.name,
      channelDescription: _driverOrdersChannel.description,
    );
  }

  Future<void> showRemoteMessage(RemoteMessage message) async {
    final notification = message.notification;
    final title = notification?.title ?? message.data['title'] ?? 'DOS';
    final body = notification?.body ?? message.data['body'] ?? '';
    if (body.trim().isEmpty) {
      return;
    }

    final type = message.data['type'] ?? '';
    if (type == 'executor_incoming_order') {
      unawaited(startDriverIncomingOrderAlarm());
    } else if (_shouldPlayImmediateAlert(type)) {
      await _playSystemAlert();
    }

    await _showLocalNotification(
      id:
          (message.messageId?.hashCode ??
              DateTime.now().millisecondsSinceEpoch) &
          0x7fffffff,
      title: title,
      body: body,
      payload: type,
      channelId: _channelIdForType(type),
      channelName: _channelNameForType(type),
      channelDescription: _channelDescriptionForType(type),
    );
  }

  Future<void> dispose() async {
    stopDriverIncomingOrderAlarm();
    await _foregroundSubscription?.cancel();
    _foregroundSubscription = null;
  }

  Future<void> startDriverIncomingOrderAlarm() async {
    stopDriverIncomingOrderAlarm();
    await _playSystemAlert();
    _driverOrderAlarmTicks = 1;
    _driverOrderAlarmTimer = Timer.periodic(const Duration(milliseconds: 900), (
      timer,
    ) {
      _driverOrderAlarmTicks += 1;
      if (_driverOrderAlarmTicks > 18) {
        stopDriverIncomingOrderAlarm();
        return;
      }
      unawaited(_playSystemAlert());
    });
  }

  void stopDriverIncomingOrderAlarm() {
    _driverOrderAlarmTimer?.cancel();
    _driverOrderAlarmTimer = null;
    _driverOrderAlarmTicks = 0;
    WebNotificationPresenter.stopDriverOrderTone();
  }

  Future<void> _showLocalNotification({
    required int id,
    required String title,
    required String body,
    String? payload,
    String channelId = 'dos_order_updates_v1',
    String channelName = 'Обновления заказа',
    String? channelDescription = 'Обычные статусы заказа',
  }) async {
    if (kIsWeb) {
      await WebNotificationPresenter.show(
        title: title,
        body: body,
        payload: payload,
      );
      return;
    }

    final isDriverOrder = channelId == _driverOrdersChannel.id;
    await _localNotifications.show(
      id,
      title,
      body,
      NotificationDetails(
        android: AndroidNotificationDetails(
          channelId,
          channelName,
          channelDescription: channelDescription,
          importance: Importance.max,
          priority: isDriverOrder ? Priority.max : Priority.high,
          playSound: true,
          enableVibration: true,
          vibrationPattern: isDriverOrder ? _driverOrderVibrationPattern : null,
          audioAttributesUsage: isDriverOrder
              ? AudioAttributesUsage.alarm
              : AudioAttributesUsage.notification,
          category: isDriverOrder ? AndroidNotificationCategory.alarm : null,
          fullScreenIntent: isDriverOrder,
          visibility: isDriverOrder ? NotificationVisibility.public : null,
          ticker: isDriverOrder ? 'Новый заказ DOS' : null,
        ),
        iOS: DarwinNotificationDetails(
          presentAlert: true,
          presentBadge: true,
          presentSound: true,
        ),
      ),
      payload: payload,
    );
  }

  String _channelIdForType(String type) {
    if (type == 'executor_incoming_order') {
      return _driverOrdersChannel.id;
    }
    if (_shouldPlayImmediateAlert(type)) {
      return _orderAlertsChannel.id;
    }
    return _orderUpdatesChannel.id;
  }

  String _channelNameForType(String type) {
    if (type == 'executor_incoming_order') {
      return _driverOrdersChannel.name;
    }
    if (_shouldPlayImmediateAlert(type)) {
      return _orderAlertsChannel.name;
    }
    return _orderUpdatesChannel.name;
  }

  String? _channelDescriptionForType(String type) {
    if (type == 'executor_incoming_order') {
      return _driverOrdersChannel.description;
    }
    if (_shouldPlayImmediateAlert(type)) {
      return _orderAlertsChannel.description;
    }
    return _orderUpdatesChannel.description;
  }

  bool _shouldPlayImmediateAlert(String type) {
    return type == 'executor_incoming_order' ||
        type == 'balance_topup_invoiced' ||
        type == 'order_waiting' ||
        type == 'order_started' ||
        type == 'order_cancelled';
  }

  Future<void> _playSystemAlert() async {
    try {
      if (kIsWeb) {
        await WebNotificationPresenter.playDriverOrderTone();
        return;
      }
      await SystemSound.play(SystemSoundType.alert);
      await HapticFeedback.heavyImpact();
    } catch (_) {
      // Local notification sound remains the fallback.
    }
  }
}
