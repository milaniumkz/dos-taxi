import 'dart:convert';

import '../../domain/entities/user.dart';

class UserModel extends User {
  const UserModel({
    required super.id,
    required super.phone,
    required super.name,
    required super.preferredLanguage,
    required super.preferredCurrency,
  });

  factory UserModel.fromEntity(User user) {
    return UserModel(
      id: user.id,
      phone: user.phone,
      name: user.name,
      preferredLanguage: user.preferredLanguage,
      preferredCurrency: user.preferredCurrency,
    );
  }

  factory UserModel.fromJson(Map<String, dynamic> json) {
    return UserModel(
      id: json['id'] as String? ?? '',
      phone: json['phone'] as String? ?? '',
      name: json['name'] as String?,
      preferredLanguage:
          json['preferredLanguage'] as String? ??
          json['preferred_language'] as String? ??
          'ru',
      preferredCurrency:
          json['preferredCurrency'] as String? ??
          json['preferred_currency'] as String? ??
          'KZT',
    );
  }

  factory UserModel.fromJsonString(String value) {
    return UserModel.fromJson(jsonDecode(value) as Map<String, dynamic>);
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'phone': phone,
      'name': name,
      'preferredLanguage': preferredLanguage,
      'preferredCurrency': preferredCurrency,
    };
  }

  String toJsonString() {
    return jsonEncode(toJson());
  }
}
