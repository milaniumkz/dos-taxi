import 'package:equatable/equatable.dart';

class User extends Equatable {
  const User({
    required this.id,
    required this.phone,
    required this.name,
    required this.preferredLanguage,
    required this.preferredCurrency,
  });

  final String id;
  final String phone;
  final String? name;
  final String preferredLanguage;
  final String preferredCurrency;

  @override
  List<Object?> get props => [
    id,
    phone,
    name,
    preferredLanguage,
    preferredCurrency,
  ];
}
