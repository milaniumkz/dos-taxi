import 'package:dartz/dartz.dart';

import '../../../../core/errors/failure.dart';
import '../../domain/entities/send_otp_result.dart';
import '../../domain/entities/user.dart';
import '../../domain/repositories/auth_repository.dart';
import '../datasources/auth_local_data_source.dart';
import '../datasources/auth_remote_data_source.dart';

class AuthRepositoryImpl implements IAuthRepository {
  const AuthRepositoryImpl({
    required AuthRemoteDataSource remoteDataSource,
    required AuthLocalDataSource localDataSource,
  }) : _remoteDataSource = remoteDataSource,
       _localDataSource = localDataSource;

  final AuthRemoteDataSource _remoteDataSource;
  final AuthLocalDataSource _localDataSource;

  @override
  Future<Either<Failure, Unit>> clearSession() async {
    try {
      await _localDataSource.clearSession();
      return right(unit);
    } on Failure catch (failure) {
      return left(failure);
    } catch (_) {
      return left(
        const Failure(
          code: 'AUTH_CLEAR_SESSION_FAILED',
          message: 'Не удалось завершить сессию',
        ),
      );
    }
  }

  @override
  Future<Either<Failure, User?>> restoreSession() async {
    try {
      final user = await _localDataSource.restoreUser();
      return right(user);
    } on Failure catch (failure) {
      return left(failure);
    } catch (_) {
      return left(
        const Failure(
          code: 'AUTH_RESTORE_SESSION_FAILED',
          message: 'Не удалось восстановить сессию',
        ),
      );
    }
  }

  @override
  Future<Either<Failure, SendOtpResult>> sendOtp(String phoneNumber) async {
    try {
      final result = await _remoteDataSource.sendOtp(phoneNumber);
      return right(result);
    } on Failure catch (failure) {
      return left(failure);
    } catch (_) {
      return left(
        const Failure(
          code: 'AUTH_SEND_OTP_FAILED',
          message: 'Не удалось отправить код',
        ),
      );
    }
  }

  @override
  Future<Either<Failure, User>> verifyOtp({
    required String phoneNumber,
    required String code,
  }) async {
    try {
      final session = await _remoteDataSource.verifyOtp(
        phoneNumber: phoneNumber,
        code: code,
      );
      if (session.accessToken.trim().isEmpty ||
          session.user.id.trim().isEmpty) {
        return left(
          const Failure(
            code: 'AUTH_VERIFY_RESPONSE_INVALID',
            message: 'Сервер подтвердил код, но не вернул данные входа',
          ),
        );
      }
      try {
        await _localDataSource.persistSession(session);
      } catch (_) {
        // Browser storage can be restricted in Safari/Yandex. The token storage
        // has an in-memory fallback, so do not fail a successful OTP check.
      }
      return right(session.user);
    } on Failure catch (failure) {
      return left(failure);
    } catch (_) {
      return left(
        const Failure(
          code: 'AUTH_VERIFY_OTP_FAILED',
          message: 'Не удалось подтвердить код',
        ),
      );
    }
  }

  @override
  Future<Either<Failure, User>> updateProfile({
    String? name,
    String? preferredLanguage,
    String? preferredCurrency,
  }) async {
    try {
      final user = await _remoteDataSource.updateProfile(
        name: name,
        preferredLanguage: preferredLanguage,
        preferredCurrency: preferredCurrency,
      );
      await _localDataSource.persistUser(user);
      return right(user);
    } on Failure catch (failure) {
      return left(failure);
    } catch (_) {
      return left(
        const Failure(
          code: 'PROFILE_UPDATE_FAILED',
          message: 'Не удалось обновить профиль',
        ),
      );
    }
  }

  @override
  Future<Either<Failure, Unit>> deleteAccount() async {
    try {
      await _remoteDataSource.deleteAccount();
      await _localDataSource.clearSession();
      return right(unit);
    } on Failure catch (failure) {
      return left(failure);
    } catch (_) {
      return left(
        const Failure(
          code: 'ACCOUNT_DELETE_FAILED',
          message: 'Не удалось удалить аккаунт',
        ),
      );
    }
  }
}
