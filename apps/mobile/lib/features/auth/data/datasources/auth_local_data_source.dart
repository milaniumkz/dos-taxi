import '../../../../core/storage/token_storage.dart';
import '../../domain/entities/user.dart';
import '../models/auth_session_model.dart';
import '../models/user_model.dart';

class AuthLocalDataSource {
  const AuthLocalDataSource(this._tokenStorage);

  final TokenStorage _tokenStorage;

  Future<UserModel?> restoreUser() async {
    final accessToken = await _tokenStorage.readAccessToken();
    final userJson = await _tokenStorage.readUserJson();

    if (accessToken == null || userJson == null) {
      return null;
    }

    return UserModel.fromJsonString(userJson);
  }

  Future<void> persistSession(AuthSessionModel session) async {
    await _tokenStorage.writeTokens(
      accessToken: session.accessToken,
      refreshToken: session.refreshToken,
    );
    await persistUser(session.user);
  }

  Future<void> persistUser(User user) async {
    final model = UserModel.fromEntity(user);
    await _tokenStorage.writeUserJson(model.toJsonString());
  }

  Future<void> clearSession() {
    return _tokenStorage.clear();
  }
}
