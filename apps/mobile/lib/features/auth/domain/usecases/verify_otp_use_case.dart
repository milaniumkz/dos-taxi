import 'package:dartz/dartz.dart';

import '../../../../core/errors/failure.dart';
import '../entities/user.dart';
import '../repositories/auth_repository.dart';

class VerifyOtpParams {
  const VerifyOtpParams({required this.phoneNumber, required this.code});

  final String phoneNumber;
  final String code;
}

class VerifyOtpUseCase {
  const VerifyOtpUseCase(this._authRepository);

  final IAuthRepository _authRepository;

  Future<Either<Failure, User>> call(VerifyOtpParams params) {
    return _authRepository.verifyOtp(
      phoneNumber: params.phoneNumber,
      code: params.code,
    );
  }
}
