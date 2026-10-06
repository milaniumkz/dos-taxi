import 'dart:async';

import 'package:equatable/equatable.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../auth/domain/entities/user.dart';
import '../../../auth/domain/repositories/auth_repository.dart';
import '../../../../core/storage/token_storage.dart';

part 'profile_settings_state.dart';

class ProfileSettingsCubit extends Cubit<ProfileSettingsState> {
  ProfileSettingsCubit([this._authRepository, this._tokenStorage])
    : super(const ProfileSettingsState());

  final IAuthRepository? _authRepository;
  final TokenStorage? _tokenStorage;
  bool _hasLocalLocaleOverride = false;

  Future<void> loadLocalSettings() async {
    final storage = _tokenStorage;
    if (storage == null) {
      return;
    }

    final storedLocale = await storage.readLocaleCode();
    final storedTheme = await storage.readThemeMode();
    if (isClosed) {
      return;
    }

    final normalizedLocale = storedLocale == null
        ? state.localeCode
        : _normalizeLocaleCode(storedLocale);
    _hasLocalLocaleOverride = storedLocale != null;
    emit(
      state.copyWith(
        localeCode: normalizedLocale,
        themeMode: _normalizeThemeMode(storedTheme),
        errorMessage: null,
      ),
    );
  }

  void syncAuthenticatedUser(User user) {
    final nextLocale = _hasLocalLocaleOverride
        ? state.localeCode
        : _normalizeLocaleCode(user.preferredLanguage);
    emit(
      state.copyWith(
        displayName: user.name ?? '',
        phone: user.phone,
        localeCode: nextLocale,
        currencyCode: user.preferredCurrency,
        errorMessage: null,
      ),
    );
  }

  void reset() {
    emit(
      ProfileSettingsState(
        localeCode: state.localeCode,
        themeMode: state.themeMode,
      ),
    );
  }

  void changeLocale(String localeCode) {
    final normalized = _normalizeLocaleCode(localeCode);
    _hasLocalLocaleOverride = true;
    emit(state.copyWith(localeCode: normalized, errorMessage: null));
    unawaited(_tokenStorage?.writeLocaleCode(normalized));
    unawaited(_persistProfile(preferredLanguage: normalized));
  }

  void changeThemeMode(ThemeMode themeMode) {
    emit(state.copyWith(themeMode: themeMode, errorMessage: null));
    unawaited(_tokenStorage?.writeThemeMode(themeMode.name));
  }

  void changeCurrency(String currencyCode) {
    final normalized = currencyCode.toUpperCase();
    emit(state.copyWith(currencyCode: normalized, errorMessage: null));
    unawaited(_persistProfile(preferredCurrency: normalized));
  }

  void changeDisplayName(String displayName) {
    emit(state.copyWith(displayName: displayName.trim()));
  }

  Future<void> saveDisplayName(String displayName) {
    final normalized = displayName.trim();
    emit(state.copyWith(displayName: normalized, errorMessage: null));
    return _persistProfile(name: normalized);
  }

  Future<void> _persistProfile({
    String? name,
    String? preferredLanguage,
    String? preferredCurrency,
  }) async {
    final repository = _authRepository;
    if (repository == null) {
      return;
    }

    emit(state.copyWith(isSaving: true, errorMessage: null));
    final result = await repository.updateProfile(
      name: name,
      preferredLanguage: preferredLanguage,
      preferredCurrency: preferredCurrency,
    );

    if (isClosed) {
      return;
    }

    result.fold(
      (failure) =>
          emit(state.copyWith(isSaving: false, errorMessage: failure.message)),
      (user) => emit(
        state.copyWith(
          displayName: user.name ?? '',
          phone: user.phone,
          localeCode: _normalizeLocaleCode(user.preferredLanguage),
          currencyCode: user.preferredCurrency,
          isSaving: false,
          errorMessage: null,
        ),
      ),
    );
  }

  String _normalizeLocaleCode(String rawLocaleCode) {
    final normalized = rawLocaleCode.toLowerCase();
    if (normalized == 'kz') {
      return 'kk';
    }

    return normalized == 'kk' ? 'kk' : 'ru';
  }

  ThemeMode _normalizeThemeMode(String? rawThemeMode) {
    return switch (rawThemeMode) {
      'dark' => ThemeMode.dark,
      'system' => ThemeMode.system,
      _ => ThemeMode.light,
    };
  }
}
