part of 'auth_cubit.dart';

sealed class AuthState extends Equatable {
  const AuthState();

  @override
  List<Object?> get props => [];
}

final class AuthIdle extends AuthState {
  const AuthIdle();
}

final class AuthLoading extends AuthState {
  const AuthLoading();
}

final class AuthOtpSent extends AuthState {
  const AuthOtpSent(this.phoneNumber, {this.devCode});

  final String phoneNumber;
  final String? devCode;

  @override
  List<Object?> get props => [phoneNumber, devCode];
}

final class AuthAuthenticated extends AuthState {
  const AuthAuthenticated(this.user);

  final User user;

  @override
  List<Object?> get props => [user];
}

final class AuthError extends AuthState {
  const AuthError(this.message, {this.retryAfterSeconds});

  final String message;
  final int? retryAfterSeconds;

  @override
  List<Object?> get props => [message, retryAfterSeconds];
}
