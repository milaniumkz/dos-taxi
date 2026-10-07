import 'package:equatable/equatable.dart';

class Failure extends Equatable implements Exception {
  const Failure({
    required this.code,
    required this.message,
    this.retryAfterSeconds,
  });

  final String code;
  final String message;
  final int? retryAfterSeconds;

  @override
  List<Object?> get props => [code, message, retryAfterSeconds];
}
