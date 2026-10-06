import 'package:dartz/dartz.dart';

import '../../../../core/errors/failure.dart';
import '../entities/send_otp_result.dart';
import '../entities/user.dart';

abstract class IAuthRepository {
  Future<Either<Failure, SendOtpResult>> sendOtp(String phoneNumber);

  Future<Either<Failure, User>> verifyOtp({
    required String phoneNumber,
    required String code,
  });

  Future<Either<Failure, User?>> restoreSession();

  Future<Either<Failure, User>> updateProfile({
    String? name,
    String? preferredLanguage,
    String? preferredCurrency,
  });

  Future<Either<Failure, Unit>> deleteAccount();

  Future<Either<Failure, Unit>> clearSession();
}
