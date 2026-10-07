import 'package:bloc_test/bloc_test.dart';
import 'package:dartz/dartz.dart';
import 'package:dos_mobile/core/errors/failure.dart';
import 'package:dos_mobile/features/auth/domain/entities/send_otp_result.dart';
import 'package:dos_mobile/features/auth/domain/entities/user.dart';
import 'package:dos_mobile/features/auth/domain/repositories/auth_repository.dart';
import 'package:dos_mobile/features/auth/domain/usecases/send_otp_use_case.dart';
import 'package:dos_mobile/features/auth/domain/usecases/verify_otp_use_case.dart';
import 'package:dos_mobile/features/auth/presentation/cubit/auth_cubit.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

class _MockSendOtpUseCase extends Mock implements SendOtpUseCase {}

class _MockVerifyOtpUseCase extends Mock implements VerifyOtpUseCase {}

class _MockAuthRepository extends Mock implements IAuthRepository {}

void main() {
  late SendOtpUseCase sendOtpUseCase;
  late VerifyOtpUseCase verifyOtpUseCase;
  late IAuthRepository authRepository;

  const user = User(
    id: 'user-1',
    phone: '+77010000000',
    name: 'Daniyar',
    preferredLanguage: 'ru',
    preferredCurrency: 'KZT',
  );
  const verifyOtpParams = VerifyOtpParams(
    phoneNumber: '+77010000000',
    code: '1234',
  );
  const failure = Failure(code: 'OTP_INVALID', message: 'Invalid OTP');

  setUpAll(() {
    registerFallbackValue(verifyOtpParams);
  });

  setUp(() {
    sendOtpUseCase = _MockSendOtpUseCase();
    verifyOtpUseCase = _MockVerifyOtpUseCase();
    authRepository = _MockAuthRepository();
  });

  AuthCubit buildCubit() {
    return AuthCubit(
      sendOtpUseCase: sendOtpUseCase,
      verifyOtpUseCase: verifyOtpUseCase,
      authRepository: authRepository,
    );
  }

  blocTest<AuthCubit, AuthState>(
    'initialize emits authenticated when cached session exists',
    setUp: () {
      when(
        () => authRepository.restoreSession(),
      ).thenAnswer((_) async => const Right(user));
    },
    build: buildCubit,
    act: (cubit) => cubit.initialize(),
    expect: () => const [AuthLoading(), AuthAuthenticated(user)],
  );

  blocTest<AuthCubit, AuthState>(
    'initialize emits idle when there is no session',
    setUp: () {
      when(
        () => authRepository.restoreSession(),
      ).thenAnswer((_) async => const Right(null));
    },
    build: buildCubit,
    act: (cubit) => cubit.initialize(),
    expect: () => const [AuthLoading(), AuthIdle()],
  );

  blocTest<AuthCubit, AuthState>(
    'sendOtp emits otp sent on success',
    setUp: () {
      when(() => sendOtpUseCase('+77010000000')).thenAnswer(
        (_) async =>
            const Right(SendOtpResult(expiresInSeconds: 300, devCode: '1234')),
      );
    },
    build: buildCubit,
    act: (cubit) => cubit.sendOtp('+77010000000'),
    expect: () => const [
      AuthLoading(),
      AuthOtpSent('+77010000000', devCode: '1234'),
    ],
  );

  blocTest<AuthCubit, AuthState>(
    'passes the server retry deadline to the phone screen',
    setUp: () {
      when(() => sendOtpUseCase('+77010000000')).thenAnswer(
        (_) async => const Left(
          Failure(
            code: 'OTP_RATE_LIMITED',
            message: 'Too many OTP requests',
            retryAfterSeconds: 120,
          ),
        ),
      );
    },
    build: buildCubit,
    act: (cubit) => cubit.sendOtp('+77010000000'),
    expect: () => const [
      AuthLoading(),
      AuthError('OTP_RATE_LIMITED', retryAfterSeconds: 120),
    ],
  );

  blocTest<AuthCubit, AuthState>(
    'verifyOtp emits authenticated on success',
    setUp: () {
      when(
        () => verifyOtpUseCase(any()),
      ).thenAnswer((_) async => const Right(user));
    },
    build: buildCubit,
    act: (cubit) => cubit.verifyOtp(phoneNumber: '+77010000000', code: '1234'),
    expect: () => const [AuthLoading(), AuthAuthenticated(user)],
  );

  blocTest<AuthCubit, AuthState>(
    'verifyOtp emits error on failure',
    setUp: () {
      when(
        () => verifyOtpUseCase(any()),
      ).thenAnswer((_) async => const Left(failure));
    },
    build: buildCubit,
    act: (cubit) => cubit.verifyOtp(phoneNumber: '+77010000000', code: '0000'),
    expect: () => const [AuthLoading(), AuthError('Invalid OTP')],
  );
}
