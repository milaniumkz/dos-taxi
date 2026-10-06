import 'user_model.dart';

class AuthSessionModel {
  const AuthSessionModel({
    required this.accessToken,
    required this.refreshToken,
    required this.user,
  });

  factory AuthSessionModel.fromJson(Map<String, dynamic> json) {
    final userJson =
        json['user'] as Map<String, dynamic>? ??
        (json['data'] as Map<String, dynamic>?)?['user']
            as Map<String, dynamic>? ??
        <String, dynamic>{};

    final tokensJson =
        json['tokens'] as Map<String, dynamic>? ??
        (json['data'] as Map<String, dynamic>?)?['tokens']
            as Map<String, dynamic>?;

    return AuthSessionModel(
      accessToken:
          json['accessToken'] as String? ??
          json['access_token'] as String? ??
          tokensJson?['accessToken'] as String? ??
          tokensJson?['access_token'] as String? ??
          '',
      refreshToken:
          json['refreshToken'] as String? ??
          json['refresh_token'] as String? ??
          tokensJson?['refreshToken'] as String? ??
          tokensJson?['refresh_token'] as String? ??
          '',
      user: UserModel.fromJson(userJson),
    );
  }

  final String accessToken;
  final String refreshToken;
  final UserModel user;
}
