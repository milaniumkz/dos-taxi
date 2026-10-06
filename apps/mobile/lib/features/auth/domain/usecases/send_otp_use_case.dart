import 'package:dartz/dartz.dart';

import '../../../../core/errors/failure.dart';
import '../entities/send_otp_result.dart';
import '../repositories/auth_repository.dart';

class SendOtpUseCase {
  const SendOtpUseCase(this._authRepository);

  final IAuthRepository _authRepository;

  Future<Either<Failure, SendOtpResult>> call(String phoneNumber) {
    return _authRepository.sendOtp(phoneNumber);
  }
}
