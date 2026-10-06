import 'package:equatable/equatable.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../../core/errors/failure.dart';
import '../../domain/entities/user.dart';
import '../../domain/repositories/auth_repository.dart';
import '../../domain/usecases/send_otp_use_case.dart';
import '../../domain/usecases/verify_otp_use_case.dart';

part 'auth_state.dart';

class AuthCubit extends Cubit<AuthState> {
  AuthCubit({
    required SendOtpUseCase sendOtpUseCase,
    required VerifyOtpUseCase verifyOtpUseCase,
    required IAuthRepository authRepository,
  }) : _sendOtpUseCase = sendOtpUseCase,
       _verifyOtpUseCase = verifyOtpUseCase,
       _authRepository = authRepository,
       super(const AuthIdle());

  final SendOtpUseCase _sendOtpUseCase;
  final VerifyOtpUseCase _verifyOtpUseCase;
  final IAuthRepository _authRepository;

  Future<void> initialize() async {
    emit(const AuthLoading());
    final result = await _authRepository.restoreSession();
    result.fold(_emitFailure, (user) {
      if (user == null) {
        emit(const AuthIdle());
        return;
      }
      emit(AuthAuthenticated(user));
    });
  }

  Future<void> sendOtp(String phoneNumber) async {
    emit(const AuthLoading());
    final result = await _sendOtpUseCase(phoneNumber);
    result.fold(
      _emitFailure,
      (otpResult) => emit(AuthOtpSent(phoneNumber, devCode: otpResult.devCode)),
    );
  }

  Future<void> verifyOtp({
    required String phoneNumber,
    required String code,
  }) async {
    emit(const AuthLoading());
    final result = await _verifyOtpUseCase(
      VerifyOtpParams(phoneNumber: phoneNumber, code: code),
    );
    result.fold(_emitFailure, (user) => emit(AuthAuthenticated(user)));
  }

  Future<void> signOut() async {
    emit(const AuthLoading());
    final result = await _authRepository.clearSession();
    result.fold(_emitFailure, (_) => emit(const AuthIdle()));
  }

  Future<void> deleteAccount() async {
    emit(const AuthLoading());
    final result = await _authRepository.deleteAccount();
    result.fold(_emitFailure, (_) => emit(const AuthIdle()));
  }

  void sessionExpired() {
    emit(const AuthIdle());
  }

  void _emitFailure(Failure failure) {
    emit(AuthError(failure.message));
  }
}
