part of 'profile_settings_cubit.dart';

class ProfileSettingsState extends Equatable {
  const ProfileSettingsState({
    this.displayName = '',
    this.phone = '',
    this.localeCode = 'ru',
    this.currencyCode = 'KZT',
    this.themeMode = ThemeMode.light,
    this.isSaving = false,
    this.errorMessage,
  });

  final String displayName;
  final String phone;
  final String localeCode;
  final String currencyCode;
  final ThemeMode themeMode;
  final bool isSaving;
  final String? errorMessage;

  Locale get locale => Locale(localeCode);

  ProfileSettingsState copyWith({
    String? displayName,
    String? phone,
    String? localeCode,
    String? currencyCode,
    ThemeMode? themeMode,
    bool? isSaving,
    Object? errorMessage = _unset,
  }) {
    return ProfileSettingsState(
      displayName: displayName ?? this.displayName,
      phone: phone ?? this.phone,
      localeCode: localeCode ?? this.localeCode,
      currencyCode: currencyCode ?? this.currencyCode,
      themeMode: themeMode ?? this.themeMode,
      isSaving: isSaving ?? this.isSaving,
      errorMessage: errorMessage == _unset
          ? this.errorMessage
          : errorMessage as String?,
    );
  }

  @override
  List<Object?> get props => [
    displayName,
    phone,
    localeCode,
    currencyCode,
    themeMode,
    isSaving,
    errorMessage,
  ];
}

const _unset = Object();
