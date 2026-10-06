import 'package:equatable/equatable.dart';

class Failure extends Equatable implements Exception {
  const Failure({required this.code, required this.message});

  final String code;
  final String message;

  @override
  List<Object?> get props => [code, message];
}
