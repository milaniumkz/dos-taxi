import 'package:flutter/foundation.dart';

import '../../../../core/api/api_client.dart';
import '../../../../core/config/app_config.dart';
import '../../../../core/notifications/app_notification_service.dart';
import '../models/user_model.dart';
import '../../domain/entities/send_otp_result.dart';
import '../models/auth_session_model.dart';

class AuthRemoteDataSource {
  const AuthRemoteDataSource({
    required ApiClient apiClient,
    required AppConfig appConfig,
    required AppNotificationService notificationService,
  }) : _apiClient = apiClient,
       _appConfig = appConfig,
       _notificationService = notificationService;

  final ApiClient _apiClient;
  final AppConfig _appConfig;
  final AppNotificationService _notificationService;

  Future<SendOtpResult> sendOtp(String phoneNumber) async {
    final response = await _apiClient.guard(
      () => _apiClient.dio.post<Map<String, dynamic>>(
        '/auth/send-otp',
        data: {'phone': phoneNumber},
      ),
    );

    final data = response.data ?? <String, dynamic>{};
    return SendOtpResult(
      expiresInSeconds: data['expiresInSeconds'] as int? ?? 300,
      devCode: data['devCode'] as String?,
    );
  }

  Future<AuthSessionModel> verifyOtp({
    required String phoneNumber,
    required String code,
  }) async {
    final deviceToken = kIsWeb
        ? null
        : await _notificationService.deviceToken().timeout(
            const Duration(seconds: 3),
            onTimeout: () => null,
          );
    final response = await _apiClient.guard(
      () => _apiClient.dio.post<Map<String, dynamic>>(
        '/auth/verify-otp',
        data: {
          'phone': phoneNumber,
          'code': code,
          'role': _appConfig.role == AppRole.driver ? 'executor' : 'client',
          if (deviceToken != null && deviceToken.trim().isNotEmpty)
            'deviceToken': deviceToken,
          'devicePlatform': _notificationService.devicePlatform,
        },
      ),
    );

    return AuthSessionModel.fromJson(response.data ?? <String, dynamic>{});
  }

  Future<UserModel> updateProfile({
    String? name,
    String? preferredLanguage,
    String? preferredCurrency,
  }) async {
    final data = <String, dynamic>{};
    if (name != null) {
      data['name'] = name;
    }
    if (preferredLanguage != null) {
      data['preferredLanguage'] = preferredLanguage;
    }
    if (preferredCurrency != null) {
      data['preferredCurrency'] = preferredCurrency;
    }

    final response = await _apiClient.guard(
      () => _apiClient.dio.patch<Map<String, dynamic>>('/profile', data: data),
    );

    return UserModel.fromJson(response.data ?? <String, dynamic>{});
  }

  Future<void> deleteAccount() {
    return _apiClient.guard(() => _apiClient.dio.delete<void>('/profile'));
  }
}
