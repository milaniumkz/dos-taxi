import 'package:dartz/dartz.dart';
import 'package:dos_mobile/core/errors/failure.dart';
import 'package:dos_mobile/features/auth/domain/entities/send_otp_result.dart';
import 'package:dos_mobile/features/auth/domain/entities/user.dart';
import 'package:dos_mobile/features/auth/domain/repositories/auth_repository.dart';
import 'package:dos_mobile/features/auth/domain/usecases/send_otp_use_case.dart';
import 'package:dos_mobile/features/auth/domain/usecases/verify_otp_use_case.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

class _MockAuthRepository extends Mock implements IAuthRepository {}

void main() {
  late IAuthRepository authRepository;
  late SendOtpUseCase sendOtpUseCase;
  late VerifyOtpUseCase verifyOtpUseCase;

  const user = User(
    id: 'user-1',
    phone: '+77010000000',
    name: 'Aruzhan',
    preferredLanguage: 'ru',
    preferredCurrency: 'KZT',
  );

  setUp(() {
    authRepository = _MockAuthRepository();
    sendOtpUseCase = SendOtpUseCase(authRepository);
    verifyOtpUseCase = VerifyOtpUseCase(authRepository);
  });

  test('SendOtpUseCase forwards request to repository', () async {
    const otpResult = SendOtpResult(expiresInSeconds: 300, devCode: '1234');
    when(
      () => authRepository.sendOtp('+77010000000'),
    ).thenAnswer((_) async => const Right(otpResult));

    final result = await sendOtpUseCase('+77010000000');

    expect(result, const Right(otpResult));
    verify(() => authRepository.sendOtp('+77010000000')).called(1);
  });

  test('VerifyOtpUseCase forwards params to repository', () async {
    when(
      () => authRepository.verifyOtp(phoneNumber: '+77010000000', code: '1234'),
    ).thenAnswer((_) async => const Right(user));

    final result = await verifyOtpUseCase(
      const VerifyOtpParams(phoneNumber: '+77010000000', code: '1234'),
    );

    expect(result, const Right(user));
    verify(
      () => authRepository.verifyOtp(phoneNumber: '+77010000000', code: '1234'),
    ).called(1);
  });

  test('VerifyOtpUseCase propagates failures', () async {
    const failure = Failure(code: 'OTP_INVALID', message: 'Invalid OTP');
    when(
      () => authRepository.verifyOtp(phoneNumber: '+77010000000', code: '9999'),
    ).thenAnswer((_) async => const Left(failure));

    final result = await verifyOtpUseCase(
      const VerifyOtpParams(phoneNumber: '+77010000000', code: '9999'),
    );

    expect(result, const Left(failure));
  });
}
