import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:intl/intl.dart' as intl;

import 'app_localizations_kk.dart';
import 'app_localizations_ru.dart';

// ignore_for_file: type=lint

/// Callers can lookup localized strings with an instance of AppLocalizations
/// returned by `AppLocalizations.of(context)`.
///
/// Applications need to include `AppLocalizations.delegate()` in their app's
/// `localizationDelegates` list, and the locales they support in the app's
/// `supportedLocales` list. For example:
///
/// ```dart
/// import 'l10n/app_localizations.dart';
///
/// return MaterialApp(
///   localizationsDelegates: AppLocalizations.localizationsDelegates,
///   supportedLocales: AppLocalizations.supportedLocales,
///   home: MyApplicationHome(),
/// );
/// ```
///
/// ## Update pubspec.yaml
///
/// Please make sure to update your pubspec.yaml to include the following
/// packages:
///
/// ```yaml
/// dependencies:
///   # Internationalization support.
///   flutter_localizations:
///     sdk: flutter
///   intl: any # Use the pinned version from flutter_localizations
///
///   # Rest of dependencies
/// ```
///
/// ## iOS Applications
///
/// iOS applications define key application metadata, including supported
/// locales, in an Info.plist file that is built into the application bundle.
/// To configure the locales supported by your app, you’ll need to edit this
/// file.
///
/// First, open your project’s ios/Runner.xcworkspace Xcode workspace file.
/// Then, in the Project Navigator, open the Info.plist file under the Runner
/// project’s Runner folder.
///
/// Next, select the Information Property List item, select Add Item from the
/// Editor menu, then select Localizations from the pop-up menu.
///
/// Select and expand the newly-created Localizations item then, for each
/// locale your application supports, add a new item and select the locale
/// you wish to add from the pop-up menu in the Value field. This list should
/// be consistent with the languages listed in the AppLocalizations.supportedLocales
/// property.
abstract class AppLocalizations {
  AppLocalizations(String locale)
    : localeName = intl.Intl.canonicalizedLocale(locale.toString());

  final String localeName;

  static AppLocalizations? of(BuildContext context) {
    return Localizations.of<AppLocalizations>(context, AppLocalizations);
  }

  static const LocalizationsDelegate<AppLocalizations> delegate =
      _AppLocalizationsDelegate();

  /// A list of this localizations delegate along with the default localizations
  /// delegates.
  ///
  /// Returns a list of localizations delegates containing this delegate along with
  /// GlobalMaterialLocalizations.delegate, GlobalCupertinoLocalizations.delegate,
  /// and GlobalWidgetsLocalizations.delegate.
  ///
  /// Additional delegates can be added by appending to this list in
  /// MaterialApp. This list does not have to be used at all if a custom list
  /// of delegates is preferred or required.
  static const List<LocalizationsDelegate<dynamic>> localizationsDelegates =
      <LocalizationsDelegate<dynamic>>[
        delegate,
        GlobalMaterialLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
      ];

  /// A list of this localizations delegate's supported locales.
  static const List<Locale> supportedLocales = <Locale>[
    Locale('kk'),
    Locale('ru'),
  ];

  /// No description provided for @passengerAppTitle.
  ///
  /// In ru, this message translates to:
  /// **'DOS Пассажир'**
  String get passengerAppTitle;

  /// No description provided for @driverAppTitle.
  ///
  /// In ru, this message translates to:
  /// **'DOS Водитель'**
  String get driverAppTitle;

  /// No description provided for @splashTitle.
  ///
  /// In ru, this message translates to:
  /// **'DOS Platform'**
  String get splashTitle;

  /// No description provided for @splashSubtitle.
  ///
  /// In ru, this message translates to:
  /// **'Подготавливаем приложение и проверяем сессию'**
  String get splashSubtitle;

  /// No description provided for @authPhoneTitle.
  ///
  /// In ru, this message translates to:
  /// **'Вход по номеру'**
  String get authPhoneTitle;

  /// No description provided for @authPhoneDescription.
  ///
  /// In ru, this message translates to:
  /// **'Введите номер телефона, чтобы получить одноразовый код.'**
  String get authPhoneDescription;

  /// No description provided for @authPhoneFieldLabel.
  ///
  /// In ru, this message translates to:
  /// **'Номер телефона'**
  String get authPhoneFieldLabel;

  /// No description provided for @authPhoneFieldHint.
  ///
  /// In ru, this message translates to:
  /// **'+7 (777) 000-00-00'**
  String get authPhoneFieldHint;

  /// No description provided for @authPhoneSubmit.
  ///
  /// In ru, this message translates to:
  /// **'Получить код'**
  String get authPhoneSubmit;

  /// No description provided for @authPhoneSending.
  ///
  /// In ru, this message translates to:
  /// **'Отправляем код…'**
  String get authPhoneSending;

  /// No description provided for @authPhoneNextAction.
  ///
  /// In ru, this message translates to:
  /// **'Далее'**
  String get authPhoneNextAction;

  /// No description provided for @authDriverLoginAction.
  ///
  /// In ru, this message translates to:
  /// **'Войти'**
  String get authDriverLoginAction;

  /// No description provided for @authDriverCreateAccountAction.
  ///
  /// In ru, this message translates to:
  /// **'Создать аккаунт'**
  String get authDriverCreateAccountAction;

  /// No description provided for @passengerWelcomeTitle.
  ///
  /// In ru, this message translates to:
  /// **'Добро пожаловать!'**
  String get passengerWelcomeTitle;

  /// No description provided for @passengerWelcomeSubtitle.
  ///
  /// In ru, this message translates to:
  /// **'Комфортные поездки по вашему городу'**
  String get passengerWelcomeSubtitle;

  /// No description provided for @driverWelcomeTitle.
  ///
  /// In ru, this message translates to:
  /// **'Станьте партнёром и зарабатывайте с нами'**
  String get driverWelcomeTitle;

  /// No description provided for @driverWelcomeSubtitle.
  ///
  /// In ru, this message translates to:
  /// **'Свободный график и стабильный доход'**
  String get driverWelcomeSubtitle;

  /// No description provided for @authOtpTitle.
  ///
  /// In ru, this message translates to:
  /// **'Подтверждение входа'**
  String get authOtpTitle;

  /// No description provided for @authOtpDescription.
  ///
  /// In ru, this message translates to:
  /// **'Введите четырёхзначный код из SMS.'**
  String get authOtpDescription;

  /// No description provided for @authOtpFieldLabel.
  ///
  /// In ru, this message translates to:
  /// **'Код подтверждения'**
  String get authOtpFieldLabel;

  /// No description provided for @authOtpResend.
  ///
  /// In ru, this message translates to:
  /// **'Отправить код повторно'**
  String get authOtpResend;

  /// No description provided for @authOtpResendTimer.
  ///
  /// In ru, this message translates to:
  /// **'Повторная отправка через {seconds} сек'**
  String authOtpResendTimer(int seconds);

  /// No description provided for @authOtpDebugCodeLabel.
  ///
  /// In ru, this message translates to:
  /// **'Тестовый код: {code}'**
  String authOtpDebugCodeLabel(String code);

  /// No description provided for @authOtpSubmit.
  ///
  /// In ru, this message translates to:
  /// **'Подтвердить'**
  String get authOtpSubmit;

  /// No description provided for @homePassengerTitle.
  ///
  /// In ru, this message translates to:
  /// **'Пассажирское приложение'**
  String get homePassengerTitle;

  /// No description provided for @homePassengerDescription.
  ///
  /// In ru, this message translates to:
  /// **'Здесь будут собраны карта, заказ такси, доставка, история и профиль клиента.'**
  String get homePassengerDescription;

  /// No description provided for @homeDriverTitle.
  ///
  /// In ru, this message translates to:
  /// **'Приложение водителя'**
  String get homeDriverTitle;

  /// No description provided for @homeDriverDescription.
  ///
  /// In ru, this message translates to:
  /// **'Здесь будут собраны статус онлайн, входящие заказы, активные поездки и доходы.'**
  String get homeDriverDescription;

  /// No description provided for @homeTaxiLabel.
  ///
  /// In ru, this message translates to:
  /// **'Такси'**
  String get homeTaxiLabel;

  /// No description provided for @homeDeliveryLabel.
  ///
  /// In ru, this message translates to:
  /// **'Доставка'**
  String get homeDeliveryLabel;

  /// No description provided for @homeIntercityLabel.
  ///
  /// In ru, this message translates to:
  /// **'Межгород'**
  String get homeIntercityLabel;

  /// No description provided for @homeSearchPlaceholder.
  ///
  /// In ru, this message translates to:
  /// **'Куда едем или что отправляем?'**
  String get homeSearchPlaceholder;

  /// No description provided for @homeOrderAction.
  ///
  /// In ru, this message translates to:
  /// **'Заказать'**
  String get homeOrderAction;

  /// No description provided for @homeResolvingCurrentAddress.
  ///
  /// In ru, this message translates to:
  /// **'Определяем адрес…'**
  String get homeResolvingCurrentAddress;

  /// No description provided for @homeLocationPermissionDenied.
  ///
  /// In ru, this message translates to:
  /// **'Разрешите доступ к геолокации, чтобы заполнить адрес подачи.'**
  String get homeLocationPermissionDenied;

  /// No description provided for @homeLocationServiceDisabled.
  ///
  /// In ru, this message translates to:
  /// **'Включите геолокацию на устройстве, чтобы определить адрес подачи.'**
  String get homeLocationServiceDisabled;

  /// No description provided for @homeLocationUnavailable.
  ///
  /// In ru, this message translates to:
  /// **'Не удалось получить точную геолокацию устройства. Разрешите доступ к местоположению и попробуйте ещё раз.'**
  String get homeLocationUnavailable;

  /// No description provided for @homeReverseGeocodeFailed.
  ///
  /// In ru, this message translates to:
  /// **'Не удалось определить адрес по текущей геолокации.'**
  String get homeReverseGeocodeFailed;

  /// No description provided for @homeDeliveryComingSoon.
  ///
  /// In ru, this message translates to:
  /// **'Экран доставки будет следующим блоком.'**
  String get homeDeliveryComingSoon;

  /// No description provided for @navTaxi.
  ///
  /// In ru, this message translates to:
  /// **'Такси'**
  String get navTaxi;

  /// No description provided for @navMain.
  ///
  /// In ru, this message translates to:
  /// **'Главная'**
  String get navMain;

  /// No description provided for @navDelivery.
  ///
  /// In ru, this message translates to:
  /// **'Доставка'**
  String get navDelivery;

  /// No description provided for @navHistory.
  ///
  /// In ru, this message translates to:
  /// **'История'**
  String get navHistory;

  /// No description provided for @navFavorites.
  ///
  /// In ru, this message translates to:
  /// **'Избранное'**
  String get navFavorites;

  /// No description provided for @navProfile.
  ///
  /// In ru, this message translates to:
  /// **'Профиль'**
  String get navProfile;

  /// No description provided for @navPayments.
  ///
  /// In ru, this message translates to:
  /// **'Оплата'**
  String get navPayments;

  /// No description provided for @homeSavedHome.
  ///
  /// In ru, this message translates to:
  /// **'Дом'**
  String get homeSavedHome;

  /// No description provided for @homeSavedWork.
  ///
  /// In ru, this message translates to:
  /// **'Работа'**
  String get homeSavedWork;

  /// No description provided for @homeSavedFavorite.
  ///
  /// In ru, this message translates to:
  /// **'Избранное'**
  String get homeSavedFavorite;

  /// No description provided for @homeScooterLabel.
  ///
  /// In ru, this message translates to:
  /// **'Самокаты'**
  String get homeScooterLabel;

  /// No description provided for @homeScooterComingSoon.
  ///
  /// In ru, this message translates to:
  /// **'Самокаты будут доступны позже.'**
  String get homeScooterComingSoon;

  /// No description provided for @favoritesTitle.
  ///
  /// In ru, this message translates to:
  /// **'Избранное'**
  String get favoritesTitle;

  /// No description provided for @favoritesEmptyTitle.
  ///
  /// In ru, this message translates to:
  /// **'Избранных адресов пока нет'**
  String get favoritesEmptyTitle;

  /// No description provided for @favoritesEmptyBody.
  ///
  /// In ru, this message translates to:
  /// **'Сохранённые адреса появятся здесь после добавления дома, работы или частых поездок.'**
  String get favoritesEmptyBody;

  /// No description provided for @taxiAddressTitle.
  ///
  /// In ru, this message translates to:
  /// **'Маршрут поездки'**
  String get taxiAddressTitle;

  /// No description provided for @taxiAddressPickupLabel.
  ///
  /// In ru, this message translates to:
  /// **'Откуда'**
  String get taxiAddressPickupLabel;

  /// No description provided for @taxiAddressDestinationLabel.
  ///
  /// In ru, this message translates to:
  /// **'Куда'**
  String get taxiAddressDestinationLabel;

  /// No description provided for @taxiAddressHint.
  ///
  /// In ru, this message translates to:
  /// **'Введите адрес или выберите на карте'**
  String get taxiAddressHint;

  /// No description provided for @taxiAddressRouteHelper.
  ///
  /// In ru, this message translates to:
  /// **'Выберите адрес подачи и адрес назначения, чтобы рассчитать маршрут и стоимость.'**
  String get taxiAddressRouteHelper;

  /// No description provided for @taxiAddressContinue.
  ///
  /// In ru, this message translates to:
  /// **'К выбору класса'**
  String get taxiAddressContinue;

  /// No description provided for @addressPickerSelectedOnMap.
  ///
  /// In ru, this message translates to:
  /// **'Точка на карте'**
  String get addressPickerSelectedOnMap;

  /// No description provided for @addressPickerPickupMapHint.
  ///
  /// In ru, this message translates to:
  /// **'Нажмите на карту, чтобы выбрать адрес подачи.'**
  String get addressPickerPickupMapHint;

  /// No description provided for @addressPickerDestinationMapHint.
  ///
  /// In ru, this message translates to:
  /// **'Нажмите на карту, чтобы выбрать адрес назначения.'**
  String get addressPickerDestinationMapHint;

  /// No description provided for @addressPickerClearPoint.
  ///
  /// In ru, this message translates to:
  /// **'Очистить точку'**
  String get addressPickerClearPoint;

  /// No description provided for @addressPickerAddressNotFound.
  ///
  /// In ru, this message translates to:
  /// **'Адрес не найден. Уточните запрос или выберите точку на карте.'**
  String get addressPickerAddressNotFound;

  /// No description provided for @addressPickerAddressSearchFailed.
  ///
  /// In ru, this message translates to:
  /// **'Не удалось найти адрес. Проверьте подключение и попробуйте ещё раз.'**
  String get addressPickerAddressSearchFailed;

  /// No description provided for @addressPickerUseManualPoint.
  ///
  /// In ru, this message translates to:
  /// **'Использовать введённый адрес для выбранной точки'**
  String get addressPickerUseManualPoint;

  /// No description provided for @addressPickerManualNeedsMapPoint.
  ///
  /// In ru, this message translates to:
  /// **'Сначала выберите точку на карте, затем укажите адрес вручную.'**
  String get addressPickerManualNeedsMapPoint;

  /// No description provided for @taxiClassTitle.
  ///
  /// In ru, this message translates to:
  /// **'Класс автомобиля'**
  String get taxiClassTitle;

  /// No description provided for @taxiClassContinue.
  ///
  /// In ru, this message translates to:
  /// **'К оплате'**
  String get taxiClassContinue;

  /// No description provided for @taxiClassEmpty.
  ///
  /// In ru, this message translates to:
  /// **'Выберите класс автомобиля с подходящей стоимостью и подачей.'**
  String get taxiClassEmpty;

  /// No description provided for @taxiClassMinimumPriceLabel.
  ///
  /// In ru, this message translates to:
  /// **'Минимум'**
  String get taxiClassMinimumPriceLabel;

  /// No description provided for @taxiClassEconomy.
  ///
  /// In ru, this message translates to:
  /// **'Эконом'**
  String get taxiClassEconomy;

  /// No description provided for @taxiClassComfort.
  ///
  /// In ru, this message translates to:
  /// **'Комфорт'**
  String get taxiClassComfort;

  /// No description provided for @taxiClassComfortPlus.
  ///
  /// In ru, this message translates to:
  /// **'Комфорт плюс'**
  String get taxiClassComfortPlus;

  /// No description provided for @taxiClassBusiness.
  ///
  /// In ru, this message translates to:
  /// **'Бизнес'**
  String get taxiClassBusiness;

  /// No description provided for @taxiClassEtaMinutes.
  ///
  /// In ru, this message translates to:
  /// **'Подача {minutes} мин'**
  String taxiClassEtaMinutes(int minutes);

  /// No description provided for @taxiPaymentTitle.
  ///
  /// In ru, this message translates to:
  /// **'Способ оплаты'**
  String get taxiPaymentTitle;

  /// No description provided for @taxiPaymentMethodCard.
  ///
  /// In ru, this message translates to:
  /// **'Банковская карта'**
  String get taxiPaymentMethodCard;

  /// No description provided for @taxiPaymentMethodCash.
  ///
  /// In ru, this message translates to:
  /// **'Наличными'**
  String get taxiPaymentMethodCash;

  /// No description provided for @taxiPaymentMethodBonus.
  ///
  /// In ru, this message translates to:
  /// **'Бонусами'**
  String get taxiPaymentMethodBonus;

  /// No description provided for @paymentMethodKaspiTransfer.
  ///
  /// In ru, this message translates to:
  /// **'Перевод Kaspi'**
  String get paymentMethodKaspiTransfer;

  /// No description provided for @paymentMethodHalykTransfer.
  ///
  /// In ru, this message translates to:
  /// **'Перевод Halyk'**
  String get paymentMethodHalykTransfer;

  /// No description provided for @paymentMethodTransferSubtitle.
  ///
  /// In ru, this message translates to:
  /// **'Оплата переводом после поездки'**
  String get paymentMethodTransferSubtitle;

  /// No description provided for @taxiPaymentPromoLabel.
  ///
  /// In ru, this message translates to:
  /// **'Промокод'**
  String get taxiPaymentPromoLabel;

  /// No description provided for @taxiPaymentPromoHint.
  ///
  /// In ru, this message translates to:
  /// **'Например, ALMATY10'**
  String get taxiPaymentPromoHint;

  /// No description provided for @taxiPaymentSummaryTitle.
  ///
  /// In ru, this message translates to:
  /// **'Параметры поездки'**
  String get taxiPaymentSummaryTitle;

  /// No description provided for @taxiPaymentContinue.
  ///
  /// In ru, this message translates to:
  /// **'Подтвердить поездку'**
  String get taxiPaymentContinue;

  /// No description provided for @taxiConfirmTitle.
  ///
  /// In ru, this message translates to:
  /// **'Подтверждение поездки'**
  String get taxiConfirmTitle;

  /// No description provided for @taxiConfirmSummaryTitle.
  ///
  /// In ru, this message translates to:
  /// **'Сводка перед заказом'**
  String get taxiConfirmSummaryTitle;

  /// No description provided for @taxiConfirmPriceLabel.
  ///
  /// In ru, this message translates to:
  /// **'Итого'**
  String get taxiConfirmPriceLabel;

  /// No description provided for @taxiConfirmPaymentLabel.
  ///
  /// In ru, this message translates to:
  /// **'Оплата'**
  String get taxiConfirmPaymentLabel;

  /// No description provided for @taxiConfirmPromoLabel.
  ///
  /// In ru, this message translates to:
  /// **'Промокод'**
  String get taxiConfirmPromoLabel;

  /// No description provided for @taxiConfirmDistanceLabel.
  ///
  /// In ru, this message translates to:
  /// **'Дистанция'**
  String get taxiConfirmDistanceLabel;

  /// No description provided for @taxiConfirmDurationLabel.
  ///
  /// In ru, this message translates to:
  /// **'Время в пути'**
  String get taxiConfirmDurationLabel;

  /// No description provided for @taxiConfirmDistanceValue.
  ///
  /// In ru, this message translates to:
  /// **'{distance} км'**
  String taxiConfirmDistanceValue(String distance);

  /// No description provided for @taxiConfirmDurationValue.
  ///
  /// In ru, this message translates to:
  /// **'{minutes} мин'**
  String taxiConfirmDurationValue(int minutes);

  /// No description provided for @taxiConfirmOrderAction.
  ///
  /// In ru, this message translates to:
  /// **'Заказать машину'**
  String get taxiConfirmOrderAction;

  /// No description provided for @taxiConfirmSearchingTitle.
  ///
  /// In ru, this message translates to:
  /// **'Ищем водителя'**
  String get taxiConfirmSearchingTitle;

  /// No description provided for @taxiConfirmSearchingSubtitle.
  ///
  /// In ru, this message translates to:
  /// **'Заказ создан. Сразу покажем принятие и номер машины, как только водитель подтвердит заказ.'**
  String get taxiConfirmSearchingSubtitle;

  /// No description provided for @taxiConfirmOrderId.
  ///
  /// In ru, this message translates to:
  /// **'Номер заказа: {orderId}'**
  String taxiConfirmOrderId(String orderId);

  /// No description provided for @taxiErrorSelectClass.
  ///
  /// In ru, this message translates to:
  /// **'Сначала выберите класс автомобиля.'**
  String get taxiErrorSelectClass;

  /// No description provided for @taxiErrorCompleteOrder.
  ///
  /// In ru, this message translates to:
  /// **'Заполните маршрут и параметры поездки полностью.'**
  String get taxiErrorCompleteOrder;

  /// No description provided for @deliveryAddressTitle.
  ///
  /// In ru, this message translates to:
  /// **'Адреса доставки'**
  String get deliveryAddressTitle;

  /// No description provided for @deliveryAddressFromLabel.
  ///
  /// In ru, this message translates to:
  /// **'Отправитель'**
  String get deliveryAddressFromLabel;

  /// No description provided for @deliveryAddressToLabel.
  ///
  /// In ru, this message translates to:
  /// **'Получатель'**
  String get deliveryAddressToLabel;

  /// No description provided for @deliveryAddressHint.
  ///
  /// In ru, this message translates to:
  /// **'Введите адрес или выберите из подсказок'**
  String get deliveryAddressHint;

  /// No description provided for @deliveryAddressHelper.
  ///
  /// In ru, this message translates to:
  /// **'Сначала укажите точки отправки и вручения посылки.'**
  String get deliveryAddressHelper;

  /// No description provided for @deliveryAddressContinue.
  ///
  /// In ru, this message translates to:
  /// **'К деталям посылки'**
  String get deliveryAddressContinue;

  /// No description provided for @deliveryDetailsTitle.
  ///
  /// In ru, this message translates to:
  /// **'Детали посылки'**
  String get deliveryDetailsTitle;

  /// No description provided for @deliveryDetailsDescriptionLabel.
  ///
  /// In ru, this message translates to:
  /// **'Что в посылке'**
  String get deliveryDetailsDescriptionLabel;

  /// No description provided for @deliveryDetailsDeclaredValueLabel.
  ///
  /// In ru, this message translates to:
  /// **'Объявленная стоимость'**
  String get deliveryDetailsDeclaredValueLabel;

  /// No description provided for @deliveryDetailsRecipientNameLabel.
  ///
  /// In ru, this message translates to:
  /// **'Имя получателя'**
  String get deliveryDetailsRecipientNameLabel;

  /// No description provided for @deliveryDetailsRecipientPhoneLabel.
  ///
  /// In ru, this message translates to:
  /// **'Телефон получателя'**
  String get deliveryDetailsRecipientPhoneLabel;

  /// No description provided for @deliveryDetailsFragile.
  ///
  /// In ru, this message translates to:
  /// **'Хрупкий груз'**
  String get deliveryDetailsFragile;

  /// No description provided for @deliveryDetailsReturn.
  ///
  /// In ru, this message translates to:
  /// **'Нужен обратный возврат'**
  String get deliveryDetailsReturn;

  /// No description provided for @deliveryDetailsCashOnDelivery.
  ///
  /// In ru, this message translates to:
  /// **'Наложенный платёж'**
  String get deliveryDetailsCashOnDelivery;

  /// No description provided for @deliveryDetailsCashOnDeliveryLabel.
  ///
  /// In ru, this message translates to:
  /// **'Сумма при вручении'**
  String get deliveryDetailsCashOnDeliveryLabel;

  /// No description provided for @deliveryDetailsPhotoAction.
  ///
  /// In ru, this message translates to:
  /// **'Добавить фото посылки'**
  String get deliveryDetailsPhotoAction;

  /// No description provided for @deliveryDetailsContinue.
  ///
  /// In ru, this message translates to:
  /// **'К выбору курьера'**
  String get deliveryDetailsContinue;

  /// No description provided for @deliveryVehicleTitle.
  ///
  /// In ru, this message translates to:
  /// **'Тип курьера'**
  String get deliveryVehicleTitle;

  /// No description provided for @deliveryVehicleHint.
  ///
  /// In ru, this message translates to:
  /// **'Выберите транспорт курьера. Цена и время подачи зависят от габаритов и срочности.'**
  String get deliveryVehicleHint;

  /// No description provided for @deliveryVehicleBicycle.
  ///
  /// In ru, this message translates to:
  /// **'Велосипед'**
  String get deliveryVehicleBicycle;

  /// No description provided for @deliveryVehicleMoped.
  ///
  /// In ru, this message translates to:
  /// **'Мопед'**
  String get deliveryVehicleMoped;

  /// No description provided for @deliveryVehicleScooter.
  ///
  /// In ru, this message translates to:
  /// **'Самокат'**
  String get deliveryVehicleScooter;

  /// No description provided for @deliveryVehicleCar.
  ///
  /// In ru, this message translates to:
  /// **'Авто'**
  String get deliveryVehicleCar;

  /// No description provided for @deliveryVehicleEtaMinutes.
  ///
  /// In ru, this message translates to:
  /// **'Прибудет за {minutes} мин'**
  String deliveryVehicleEtaMinutes(int minutes);

  /// No description provided for @deliveryVehicleContinue.
  ///
  /// In ru, this message translates to:
  /// **'К оплате'**
  String get deliveryVehicleContinue;

  /// No description provided for @deliveryPaymentTitle.
  ///
  /// In ru, this message translates to:
  /// **'Оплата доставки'**
  String get deliveryPaymentTitle;

  /// No description provided for @deliveryPaymentMethodCard.
  ///
  /// In ru, this message translates to:
  /// **'Банковская карта'**
  String get deliveryPaymentMethodCard;

  /// No description provided for @deliveryPaymentMethodCash.
  ///
  /// In ru, this message translates to:
  /// **'Наличными'**
  String get deliveryPaymentMethodCash;

  /// No description provided for @deliveryPaymentMethodBonus.
  ///
  /// In ru, this message translates to:
  /// **'Бонусами'**
  String get deliveryPaymentMethodBonus;

  /// No description provided for @deliveryPaymentPromoLabel.
  ///
  /// In ru, this message translates to:
  /// **'Промокод'**
  String get deliveryPaymentPromoLabel;

  /// No description provided for @deliveryPaymentPromoHint.
  ///
  /// In ru, this message translates to:
  /// **'Например, DELIVERY15'**
  String get deliveryPaymentPromoHint;

  /// No description provided for @deliveryPaymentSummaryTitle.
  ///
  /// In ru, this message translates to:
  /// **'Параметры доставки'**
  String get deliveryPaymentSummaryTitle;

  /// No description provided for @deliveryPaymentContinue.
  ///
  /// In ru, this message translates to:
  /// **'Подтвердить доставку'**
  String get deliveryPaymentContinue;

  /// No description provided for @deliveryConfirmTitle.
  ///
  /// In ru, this message translates to:
  /// **'Подтверждение доставки'**
  String get deliveryConfirmTitle;

  /// No description provided for @deliveryConfirmSummaryTitle.
  ///
  /// In ru, this message translates to:
  /// **'Сводка перед заказом'**
  String get deliveryConfirmSummaryTitle;

  /// No description provided for @deliveryConfirmPackageLabel.
  ///
  /// In ru, this message translates to:
  /// **'Посылка'**
  String get deliveryConfirmPackageLabel;

  /// No description provided for @deliveryConfirmRecipientLabel.
  ///
  /// In ru, this message translates to:
  /// **'Получатель'**
  String get deliveryConfirmRecipientLabel;

  /// No description provided for @deliveryConfirmPaymentLabel.
  ///
  /// In ru, this message translates to:
  /// **'Оплата'**
  String get deliveryConfirmPaymentLabel;

  /// No description provided for @deliveryConfirmPromoLabel.
  ///
  /// In ru, this message translates to:
  /// **'Промокод'**
  String get deliveryConfirmPromoLabel;

  /// No description provided for @deliveryConfirmDistanceLabel.
  ///
  /// In ru, this message translates to:
  /// **'Дистанция'**
  String get deliveryConfirmDistanceLabel;

  /// No description provided for @deliveryConfirmDurationLabel.
  ///
  /// In ru, this message translates to:
  /// **'Время в пути'**
  String get deliveryConfirmDurationLabel;

  /// No description provided for @deliveryConfirmPriceLabel.
  ///
  /// In ru, this message translates to:
  /// **'Итого'**
  String get deliveryConfirmPriceLabel;

  /// No description provided for @deliveryConfirmDistanceValue.
  ///
  /// In ru, this message translates to:
  /// **'{distance} км'**
  String deliveryConfirmDistanceValue(String distance);

  /// No description provided for @deliveryConfirmDurationValue.
  ///
  /// In ru, this message translates to:
  /// **'{minutes} мин'**
  String deliveryConfirmDurationValue(int minutes);

  /// No description provided for @deliveryConfirmOrderAction.
  ///
  /// In ru, this message translates to:
  /// **'Заказать курьера'**
  String get deliveryConfirmOrderAction;

  /// No description provided for @deliveryConfirmSearchingTitle.
  ///
  /// In ru, this message translates to:
  /// **'Ищем курьера'**
  String get deliveryConfirmSearchingTitle;

  /// No description provided for @deliveryConfirmSearchingSubtitle.
  ///
  /// In ru, this message translates to:
  /// **'Заказ создан. Как только курьер примет заказ, покажем статус и трекинг.'**
  String get deliveryConfirmSearchingSubtitle;

  /// No description provided for @deliveryConfirmOrderId.
  ///
  /// In ru, this message translates to:
  /// **'Номер заказа: {orderId}'**
  String deliveryConfirmOrderId(String orderId);

  /// No description provided for @deliveryErrorAddresses.
  ///
  /// In ru, this message translates to:
  /// **'Укажите адрес отправителя и получателя.'**
  String get deliveryErrorAddresses;

  /// No description provided for @deliveryErrorDescription.
  ///
  /// In ru, this message translates to:
  /// **'Добавьте описание посылки.'**
  String get deliveryErrorDescription;

  /// No description provided for @deliveryErrorRecipientName.
  ///
  /// In ru, this message translates to:
  /// **'Укажите имя получателя.'**
  String get deliveryErrorRecipientName;

  /// No description provided for @deliveryErrorRecipientPhone.
  ///
  /// In ru, this message translates to:
  /// **'Укажите телефон получателя.'**
  String get deliveryErrorRecipientPhone;

  /// No description provided for @deliveryErrorVehicle.
  ///
  /// In ru, this message translates to:
  /// **'Сначала выберите тип курьера.'**
  String get deliveryErrorVehicle;

  /// No description provided for @deliveryErrorCompleteOrder.
  ///
  /// In ru, this message translates to:
  /// **'Заполните все обязательные поля доставки.'**
  String get deliveryErrorCompleteOrder;

  /// No description provided for @activeOrderTitle.
  ///
  /// In ru, this message translates to:
  /// **'Активный заказ'**
  String get activeOrderTitle;

  /// No description provided for @activeOrderStatusSearching.
  ///
  /// In ru, this message translates to:
  /// **'Ищем исполнителя'**
  String get activeOrderStatusSearching;

  /// No description provided for @activeOrderStatusAccepted.
  ///
  /// In ru, this message translates to:
  /// **'Исполнитель принял заказ'**
  String get activeOrderStatusAccepted;

  /// No description provided for @activeOrderStatusArriving.
  ///
  /// In ru, this message translates to:
  /// **'Исполнитель едет к вам'**
  String get activeOrderStatusArriving;

  /// No description provided for @activeOrderStatusWaiting.
  ///
  /// In ru, this message translates to:
  /// **'Исполнитель ожидает'**
  String get activeOrderStatusWaiting;

  /// No description provided for @activeOrderStatusInProgress.
  ///
  /// In ru, this message translates to:
  /// **'Заказ в пути'**
  String get activeOrderStatusInProgress;

  /// No description provided for @activeOrderStatusCompleted.
  ///
  /// In ru, this message translates to:
  /// **'Заказ завершён'**
  String get activeOrderStatusCompleted;

  /// No description provided for @activeOrderStatusCancelled.
  ///
  /// In ru, this message translates to:
  /// **'Заказ отменён'**
  String get activeOrderStatusCancelled;

  /// No description provided for @activeOrderExecutorPending.
  ///
  /// In ru, this message translates to:
  /// **'Подбираем исполнителя'**
  String get activeOrderExecutorPending;

  /// No description provided for @activeOrderDetailDriver.
  ///
  /// In ru, this message translates to:
  /// **'Водитель'**
  String get activeOrderDetailDriver;

  /// No description provided for @activeOrderDetailTariff.
  ///
  /// In ru, this message translates to:
  /// **'Тариф'**
  String get activeOrderDetailTariff;

  /// No description provided for @activeOrderDetailCar.
  ///
  /// In ru, this message translates to:
  /// **'Машина'**
  String get activeOrderDetailCar;

  /// No description provided for @activeOrderDetailFrom.
  ///
  /// In ru, this message translates to:
  /// **'Откуда'**
  String get activeOrderDetailFrom;

  /// No description provided for @activeOrderDetailTo.
  ///
  /// In ru, this message translates to:
  /// **'Куда'**
  String get activeOrderDetailTo;

  /// No description provided for @activeOrderDetailPrice.
  ///
  /// In ru, this message translates to:
  /// **'Стоимость'**
  String get activeOrderDetailPrice;

  /// No description provided for @activeOrderDetailPhone.
  ///
  /// In ru, this message translates to:
  /// **'Телефон'**
  String get activeOrderDetailPhone;

  /// No description provided for @activeOrderVehicleNotAssigned.
  ///
  /// In ru, this message translates to:
  /// **'Машина будет показана после назначения'**
  String get activeOrderVehicleNotAssigned;

  /// No description provided for @activeOrderChangePaymentAction.
  ///
  /// In ru, this message translates to:
  /// **'Изменить способ оплаты'**
  String get activeOrderChangePaymentAction;

  /// No description provided for @activeOrderCancelAction.
  ///
  /// In ru, this message translates to:
  /// **'Отменить заказ'**
  String get activeOrderCancelAction;

  /// No description provided for @activeOrderCancelConfirmTitle.
  ///
  /// In ru, this message translates to:
  /// **'Отменить заказ?'**
  String get activeOrderCancelConfirmTitle;

  /// No description provided for @activeOrderCancelConfirmBody.
  ///
  /// In ru, this message translates to:
  /// **'Подтвердите отмену, если поездка или доставка больше не актуальна.'**
  String get activeOrderCancelConfirmBody;

  /// No description provided for @activeOrderCancelConfirmAction.
  ///
  /// In ru, this message translates to:
  /// **'Да, отменить'**
  String get activeOrderCancelConfirmAction;

  /// No description provided for @activeOrderTrackingFailed.
  ///
  /// In ru, this message translates to:
  /// **'Не удалось подключиться к обновлениям заказа.'**
  String get activeOrderTrackingFailed;

  /// No description provided for @orderChatTitle.
  ///
  /// In ru, this message translates to:
  /// **'Чат по заказу'**
  String get orderChatTitle;

  /// No description provided for @orderChatClosed.
  ///
  /// In ru, this message translates to:
  /// **'Чат доступен только во время активной поездки или доставки.'**
  String get orderChatClosed;

  /// No description provided for @orderChatInputHint.
  ///
  /// In ru, this message translates to:
  /// **'Напишите сообщение'**
  String get orderChatInputHint;

  /// No description provided for @orderChatSendAction.
  ///
  /// In ru, this message translates to:
  /// **'Отправить'**
  String get orderChatSendAction;

  /// No description provided for @orderChatEmpty.
  ///
  /// In ru, this message translates to:
  /// **'Сообщений пока нет.'**
  String get orderChatEmpty;

  /// No description provided for @orderChatLoadFailed.
  ///
  /// In ru, this message translates to:
  /// **'Не удалось загрузить чат.'**
  String get orderChatLoadFailed;

  /// No description provided for @orderChatSendFailed.
  ///
  /// In ru, this message translates to:
  /// **'Не удалось отправить сообщение.'**
  String get orderChatSendFailed;

  /// No description provided for @ratingTitle.
  ///
  /// In ru, this message translates to:
  /// **'Оценка поездки'**
  String get ratingTitle;

  /// No description provided for @ratingSubtitle.
  ///
  /// In ru, this message translates to:
  /// **'Как прошла поездка?'**
  String get ratingSubtitle;

  /// No description provided for @ratingAction.
  ///
  /// In ru, this message translates to:
  /// **'Отправить оценку'**
  String get ratingAction;

  /// No description provided for @ratingThanks.
  ///
  /// In ru, this message translates to:
  /// **'Спасибо, оценка сохранена.'**
  String get ratingThanks;

  /// No description provided for @historyTitle.
  ///
  /// In ru, this message translates to:
  /// **'История заказов'**
  String get historyTitle;

  /// No description provided for @orderHistoryFilterAll.
  ///
  /// In ru, this message translates to:
  /// **'Все'**
  String get orderHistoryFilterAll;

  /// No description provided for @orderHistoryFilterTaxi.
  ///
  /// In ru, this message translates to:
  /// **'Такси'**
  String get orderHistoryFilterTaxi;

  /// No description provided for @orderHistoryFilterDelivery.
  ///
  /// In ru, this message translates to:
  /// **'Доставка'**
  String get orderHistoryFilterDelivery;

  /// No description provided for @orderHistoryEmpty.
  ///
  /// In ru, this message translates to:
  /// **'Заказы пока не найдены.'**
  String get orderHistoryEmpty;

  /// No description provided for @orderHistoryLoadMore.
  ///
  /// In ru, this message translates to:
  /// **'Загрузить ещё'**
  String get orderHistoryLoadMore;

  /// No description provided for @orderHistoryDetailTitle.
  ///
  /// In ru, this message translates to:
  /// **'Детали заказа'**
  String get orderHistoryDetailTitle;

  /// No description provided for @orderHistoryStatusLabel.
  ///
  /// In ru, this message translates to:
  /// **'Статус'**
  String get orderHistoryStatusLabel;

  /// No description provided for @orderHistoryDateLabel.
  ///
  /// In ru, this message translates to:
  /// **'Дата'**
  String get orderHistoryDateLabel;

  /// No description provided for @orderHistoryRatingLabel.
  ///
  /// In ru, this message translates to:
  /// **'Оценка'**
  String get orderHistoryRatingLabel;

  /// No description provided for @orderStatusCompleted.
  ///
  /// In ru, this message translates to:
  /// **'Завершён'**
  String get orderStatusCompleted;

  /// No description provided for @orderStatusCancelled.
  ///
  /// In ru, this message translates to:
  /// **'Отменён'**
  String get orderStatusCancelled;

  /// No description provided for @orderStatusInProgress.
  ///
  /// In ru, this message translates to:
  /// **'В процессе'**
  String get orderStatusInProgress;

  /// No description provided for @profileTitle.
  ///
  /// In ru, this message translates to:
  /// **'Профиль'**
  String get profileTitle;

  /// No description provided for @profileDefaultName.
  ///
  /// In ru, this message translates to:
  /// **'Пассажир'**
  String get profileDefaultName;

  /// No description provided for @profileNameLabel.
  ///
  /// In ru, this message translates to:
  /// **'Имя'**
  String get profileNameLabel;

  /// No description provided for @profilePhoneLabel.
  ///
  /// In ru, this message translates to:
  /// **'Телефон'**
  String get profilePhoneLabel;

  /// No description provided for @profileLanguageLabel.
  ///
  /// In ru, this message translates to:
  /// **'Язык интерфейса'**
  String get profileLanguageLabel;

  /// No description provided for @profileLanguageRu.
  ///
  /// In ru, this message translates to:
  /// **'Русский'**
  String get profileLanguageRu;

  /// No description provided for @profileLanguageKk.
  ///
  /// In ru, this message translates to:
  /// **'Қазақша'**
  String get profileLanguageKk;

  /// No description provided for @profileThemeLabel.
  ///
  /// In ru, this message translates to:
  /// **'Тема интерфейса'**
  String get profileThemeLabel;

  /// No description provided for @profileThemeLight.
  ///
  /// In ru, this message translates to:
  /// **'Светлая'**
  String get profileThemeLight;

  /// No description provided for @profileThemeDark.
  ///
  /// In ru, this message translates to:
  /// **'Тёмная'**
  String get profileThemeDark;

  /// No description provided for @profileThemeSystem.
  ///
  /// In ru, this message translates to:
  /// **'Системная'**
  String get profileThemeSystem;

  /// No description provided for @profileCurrencyLabel.
  ///
  /// In ru, this message translates to:
  /// **'Валюта'**
  String get profileCurrencyLabel;

  /// No description provided for @profileCurrencyKzt.
  ///
  /// In ru, this message translates to:
  /// **'Тенге (KZT)'**
  String get profileCurrencyKzt;

  /// No description provided for @profileCurrencyRub.
  ///
  /// In ru, this message translates to:
  /// **'Рубль (RUB)'**
  String get profileCurrencyRub;

  /// No description provided for @profileSignOutAction.
  ///
  /// In ru, this message translates to:
  /// **'Выйти из аккаунта'**
  String get profileSignOutAction;

  /// No description provided for @paymentsTitle.
  ///
  /// In ru, this message translates to:
  /// **'Способы оплаты'**
  String get paymentsTitle;

  /// No description provided for @paymentsEmpty.
  ///
  /// In ru, this message translates to:
  /// **'Сохранённых карт пока нет.'**
  String get paymentsEmpty;

  /// No description provided for @paymentsAddCardAction.
  ///
  /// In ru, this message translates to:
  /// **'Добавить карту'**
  String get paymentsAddCardAction;

  /// No description provided for @paymentsKassa24Provider.
  ///
  /// In ru, this message translates to:
  /// **'Касса24'**
  String get paymentsKassa24Provider;

  /// No description provided for @paymentsCardLast4Label.
  ///
  /// In ru, this message translates to:
  /// **'Последние 4 цифры карты'**
  String get paymentsCardLast4Label;

  /// No description provided for @paymentsCardHolderLabel.
  ///
  /// In ru, this message translates to:
  /// **'Имя держателя'**
  String get paymentsCardHolderLabel;

  /// No description provided for @paymentsCardAddedMessage.
  ///
  /// In ru, this message translates to:
  /// **'Карта добавлена через Касса24'**
  String get paymentsCardAddedMessage;

  /// No description provided for @driverOnboardingTitle.
  ///
  /// In ru, this message translates to:
  /// **'Регистрация исполнителя'**
  String get driverOnboardingTitle;

  /// No description provided for @driverOnboardingSubtitle.
  ///
  /// In ru, this message translates to:
  /// **'Заполните профиль и добавьте документы, чтобы начать принимать поездки и доставки.'**
  String get driverOnboardingSubtitle;

  /// No description provided for @driverOnboardingExecutorTypeLabel.
  ///
  /// In ru, this message translates to:
  /// **'Роль исполнителя'**
  String get driverOnboardingExecutorTypeLabel;

  /// No description provided for @driverOnboardingExecutorTypeDriver.
  ///
  /// In ru, this message translates to:
  /// **'Водитель'**
  String get driverOnboardingExecutorTypeDriver;

  /// No description provided for @driverOnboardingExecutorTypeCourier.
  ///
  /// In ru, this message translates to:
  /// **'Курьер'**
  String get driverOnboardingExecutorTypeCourier;

  /// No description provided for @driverOnboardingVehicleLabel.
  ///
  /// In ru, this message translates to:
  /// **'Транспорт курьера'**
  String get driverOnboardingVehicleLabel;

  /// No description provided for @driverOnboardingVehicleMakeLabel.
  ///
  /// In ru, this message translates to:
  /// **'Марка автомобиля'**
  String get driverOnboardingVehicleMakeLabel;

  /// No description provided for @driverOnboardingVehicleModelLabel.
  ///
  /// In ru, this message translates to:
  /// **'Модель автомобиля'**
  String get driverOnboardingVehicleModelLabel;

  /// No description provided for @driverOnboardingVehicleYearLabel.
  ///
  /// In ru, this message translates to:
  /// **'Год выпуска'**
  String get driverOnboardingVehicleYearLabel;

  /// No description provided for @driverOnboardingVehiclePlateLabel.
  ///
  /// In ru, this message translates to:
  /// **'Госномер'**
  String get driverOnboardingVehiclePlateLabel;

  /// No description provided for @driverOnboardingDocumentsLabel.
  ///
  /// In ru, this message translates to:
  /// **'Документы'**
  String get driverOnboardingDocumentsLabel;

  /// No description provided for @driverOnboardingLicenseAction.
  ///
  /// In ru, this message translates to:
  /// **'Водительское удостоверение'**
  String get driverOnboardingLicenseAction;

  /// No description provided for @driverOnboardingIdAction.
  ///
  /// In ru, this message translates to:
  /// **'Удостоверение личности'**
  String get driverOnboardingIdAction;

  /// No description provided for @driverOnboardingPhotoSelected.
  ///
  /// In ru, this message translates to:
  /// **'Файл: {fileName}'**
  String driverOnboardingPhotoSelected(Object fileName);

  /// No description provided for @driverOnboardingSubmitAction.
  ///
  /// In ru, this message translates to:
  /// **'Отправить на проверку'**
  String get driverOnboardingSubmitAction;

  /// No description provided for @driverOnboardingNameRequired.
  ///
  /// In ru, this message translates to:
  /// **'Укажите имя исполнителя.'**
  String get driverOnboardingNameRequired;

  /// No description provided for @driverOnboardingDocumentRequired.
  ///
  /// In ru, this message translates to:
  /// **'Добавьте хотя бы один документ.'**
  String get driverOnboardingDocumentRequired;

  /// No description provided for @driverOnboardingVehicleRequired.
  ///
  /// In ru, this message translates to:
  /// **'Выберите транспорт курьера.'**
  String get driverOnboardingVehicleRequired;

  /// No description provided for @driverOnboardingVehicleDetailsRequired.
  ///
  /// In ru, this message translates to:
  /// **'Заполните марку, модель, год выпуска и госномер автомобиля.'**
  String get driverOnboardingVehicleDetailsRequired;

  /// No description provided for @driverVerificationPendingTitle.
  ///
  /// In ru, this message translates to:
  /// **'Проверяем профиль'**
  String get driverVerificationPendingTitle;

  /// No description provided for @driverVerificationPendingDescription.
  ///
  /// In ru, this message translates to:
  /// **'Пока профиль на проверке, входящие заказы недоступны. После одобрения администратором можно будет выйти онлайн.'**
  String get driverVerificationPendingDescription;

  /// No description provided for @driverVerificationPendingRefreshAction.
  ///
  /// In ru, this message translates to:
  /// **'Проверить статус'**
  String get driverVerificationPendingRefreshAction;

  /// No description provided for @driverVerificationPendingDemoAction.
  ///
  /// In ru, this message translates to:
  /// **'Открыть тестовый режим'**
  String get driverVerificationPendingDemoAction;

  /// No description provided for @driverDashboardTitle.
  ///
  /// In ru, this message translates to:
  /// **'Рабочий экран'**
  String get driverDashboardTitle;

  /// No description provided for @driverDashboardStatusOnline.
  ///
  /// In ru, this message translates to:
  /// **'Онлайн'**
  String get driverDashboardStatusOnline;

  /// No description provided for @driverDashboardStatusOffline.
  ///
  /// In ru, this message translates to:
  /// **'Оффлайн'**
  String get driverDashboardStatusOffline;

  /// No description provided for @driverDashboardBalanceLabel.
  ///
  /// In ru, this message translates to:
  /// **'Баланс'**
  String get driverDashboardBalanceLabel;

  /// No description provided for @driverBalanceTopUpTitle.
  ///
  /// In ru, this message translates to:
  /// **'Пополнить личный счёт'**
  String get driverBalanceTopUpTitle;

  /// No description provided for @driverBalanceTopUpSubtitle.
  ///
  /// In ru, this message translates to:
  /// **'Заявка уйдёт администратору для счёта Kaspi'**
  String get driverBalanceTopUpSubtitle;

  /// No description provided for @driverBalanceTopUpAmountLabel.
  ///
  /// In ru, this message translates to:
  /// **'Сумма пополнения'**
  String get driverBalanceTopUpAmountLabel;

  /// No description provided for @driverBalanceTopUpPhoneLabel.
  ///
  /// In ru, this message translates to:
  /// **'Телефон для счёта Kaspi'**
  String get driverBalanceTopUpPhoneLabel;

  /// No description provided for @driverBalanceTopUpSubmit.
  ///
  /// In ru, this message translates to:
  /// **'Отправить заявку'**
  String get driverBalanceTopUpSubmit;

  /// No description provided for @driverBalanceTopUpSuccess.
  ///
  /// In ru, this message translates to:
  /// **'Заявка отправлена администратору.'**
  String get driverBalanceTopUpSuccess;

  /// No description provided for @driverBalanceTopUpInvalid.
  ///
  /// In ru, this message translates to:
  /// **'Укажите сумму от 100 ₸ и телефон.'**
  String get driverBalanceTopUpInvalid;

  /// No description provided for @driverDashboardModeLabel.
  ///
  /// In ru, this message translates to:
  /// **'Режим'**
  String get driverDashboardModeLabel;

  /// No description provided for @driverDashboardModeDemo.
  ///
  /// In ru, this message translates to:
  /// **'Тестовый режим'**
  String get driverDashboardModeDemo;

  /// No description provided for @driverDashboardModeVerified.
  ///
  /// In ru, this message translates to:
  /// **'Верифицирован'**
  String get driverDashboardModeVerified;

  /// No description provided for @driverDashboardHeartbeatLabel.
  ///
  /// In ru, this message translates to:
  /// **'Последняя связь'**
  String get driverDashboardHeartbeatLabel;

  /// No description provided for @driverDashboardHeatZoneHot.
  ///
  /// In ru, this message translates to:
  /// **'Горячая зона'**
  String get driverDashboardHeatZoneHot;

  /// No description provided for @driverDashboardHeatZoneWarm.
  ///
  /// In ru, this message translates to:
  /// **'Тёплая зона'**
  String get driverDashboardHeatZoneWarm;

  /// No description provided for @driverDashboardHeatZoneCool.
  ///
  /// In ru, this message translates to:
  /// **'Спокойная зона'**
  String get driverDashboardHeatZoneCool;

  /// No description provided for @driverDashboardWaitingOffer.
  ///
  /// In ru, this message translates to:
  /// **'Входящие заказы появятся здесь, когда водитель онлайн.'**
  String get driverDashboardWaitingOffer;

  /// No description provided for @driverDashboardOpenActiveOrder.
  ///
  /// In ru, this message translates to:
  /// **'Открыть активный заказ'**
  String get driverDashboardOpenActiveOrder;

  /// No description provided for @driverIncomingOrderTitle.
  ///
  /// In ru, this message translates to:
  /// **'Новый заказ'**
  String get driverIncomingOrderTitle;

  /// No description provided for @driverIncomingOrderAccept.
  ///
  /// In ru, this message translates to:
  /// **'Принять'**
  String get driverIncomingOrderAccept;

  /// No description provided for @driverIncomingOrderReject.
  ///
  /// In ru, this message translates to:
  /// **'Отклонить'**
  String get driverIncomingOrderReject;

  /// No description provided for @driverIncomingOrderCountdown.
  ///
  /// In ru, this message translates to:
  /// **'Ответьте за {seconds} сек'**
  String driverIncomingOrderCountdown(int seconds);

  /// No description provided for @driverIncomingOrderPickupLabel.
  ///
  /// In ru, this message translates to:
  /// **'Подача'**
  String get driverIncomingOrderPickupLabel;

  /// No description provided for @driverIncomingOrderDestinationLabel.
  ///
  /// In ru, this message translates to:
  /// **'Назначение'**
  String get driverIncomingOrderDestinationLabel;

  /// No description provided for @driverIncomingOrderPriceLabel.
  ///
  /// In ru, this message translates to:
  /// **'Доход'**
  String get driverIncomingOrderPriceLabel;

  /// No description provided for @driverIncomingOrderDistanceLabel.
  ///
  /// In ru, this message translates to:
  /// **'Дистанция'**
  String get driverIncomingOrderDistanceLabel;

  /// No description provided for @driverIncomingOrderDurationLabel.
  ///
  /// In ru, this message translates to:
  /// **'Время'**
  String get driverIncomingOrderDurationLabel;

  /// No description provided for @driverIncomingOrderClientLabel.
  ///
  /// In ru, this message translates to:
  /// **'Клиент'**
  String get driverIncomingOrderClientLabel;

  /// No description provided for @driverActiveOrderTitle.
  ///
  /// In ru, this message translates to:
  /// **'Активный заказ исполнителя'**
  String get driverActiveOrderTitle;

  /// No description provided for @driverActiveOrderNavigationAction.
  ///
  /// In ru, this message translates to:
  /// **'Навигатор'**
  String get driverActiveOrderNavigationAction;

  /// No description provided for @driverActiveOrderNavigationTitle.
  ///
  /// In ru, this message translates to:
  /// **'Открыть маршрут'**
  String get driverActiveOrderNavigationTitle;

  /// No description provided for @driverActiveOrderNavigationBrowser.
  ///
  /// In ru, this message translates to:
  /// **'В браузере'**
  String get driverActiveOrderNavigationBrowser;

  /// No description provided for @driverActiveOrderNavigationUnavailable.
  ///
  /// In ru, this message translates to:
  /// **'Не удалось открыть карты'**
  String get driverActiveOrderNavigationUnavailable;

  /// No description provided for @driverActiveOrderPickupLabel.
  ///
  /// In ru, this message translates to:
  /// **'Точка подачи'**
  String get driverActiveOrderPickupLabel;

  /// No description provided for @driverActiveOrderDestinationLabel.
  ///
  /// In ru, this message translates to:
  /// **'Точка назначения'**
  String get driverActiveOrderDestinationLabel;

  /// No description provided for @driverActiveOrderMeterTitle.
  ///
  /// In ru, this message translates to:
  /// **'Таксометр'**
  String get driverActiveOrderMeterTitle;

  /// No description provided for @driverActiveOrderMeterMinimum.
  ///
  /// In ru, this message translates to:
  /// **'Минимальная стоимость'**
  String get driverActiveOrderMeterMinimum;

  /// No description provided for @driverActiveOrderMeterDistance.
  ///
  /// In ru, this message translates to:
  /// **'Фактическая дистанция'**
  String get driverActiveOrderMeterDistance;

  /// No description provided for @driverActiveOrderMeterPrice.
  ///
  /// In ru, this message translates to:
  /// **'Текущая стоимость'**
  String get driverActiveOrderMeterPrice;

  /// No description provided for @driverActiveOrderClientLabel.
  ///
  /// In ru, this message translates to:
  /// **'Контакт клиента'**
  String get driverActiveOrderClientLabel;

  /// No description provided for @driverActiveOrderPhoneLabel.
  ///
  /// In ru, this message translates to:
  /// **'Телефон'**
  String get driverActiveOrderPhoneLabel;

  /// No description provided for @driverActiveOrderPaymentLabel.
  ///
  /// In ru, this message translates to:
  /// **'Оплата'**
  String get driverActiveOrderPaymentLabel;

  /// No description provided for @driverActiveOrderPrimaryArrived.
  ///
  /// In ru, this message translates to:
  /// **'На месте'**
  String get driverActiveOrderPrimaryArrived;

  /// No description provided for @driverActiveOrderPrimaryStart.
  ///
  /// In ru, this message translates to:
  /// **'Начать'**
  String get driverActiveOrderPrimaryStart;

  /// No description provided for @driverActiveOrderPrimaryComplete.
  ///
  /// In ru, this message translates to:
  /// **'Завершить'**
  String get driverActiveOrderPrimaryComplete;

  /// No description provided for @driverActiveOrderDeliveryPickup.
  ///
  /// In ru, this message translates to:
  /// **'Забрал'**
  String get driverActiveOrderDeliveryPickup;

  /// No description provided for @driverActiveOrderDeliveryTransit.
  ///
  /// In ru, this message translates to:
  /// **'В пути'**
  String get driverActiveOrderDeliveryTransit;

  /// No description provided for @driverActiveOrderDeliveryAtDoor.
  ///
  /// In ru, this message translates to:
  /// **'У двери'**
  String get driverActiveOrderDeliveryAtDoor;

  /// No description provided for @driverActiveOrderDeliveryDelivered.
  ///
  /// In ru, this message translates to:
  /// **'Вручил'**
  String get driverActiveOrderDeliveryDelivered;

  /// No description provided for @driverActiveOrderDeliveryFailed.
  ///
  /// In ru, this message translates to:
  /// **'Не вручил'**
  String get driverActiveOrderDeliveryFailed;

  /// No description provided for @driverActiveOrderRecipientCodeLabel.
  ///
  /// In ru, this message translates to:
  /// **'Код получателя'**
  String get driverActiveOrderRecipientCodeLabel;

  /// No description provided for @driverActiveOrderProofPhotoAction.
  ///
  /// In ru, this message translates to:
  /// **'Добавить фото подтверждения'**
  String get driverActiveOrderProofPhotoAction;

  /// No description provided for @driverActiveOrderStatusAccepted.
  ///
  /// In ru, this message translates to:
  /// **'Заказ принят'**
  String get driverActiveOrderStatusAccepted;

  /// No description provided for @driverActiveOrderStatusWaiting.
  ///
  /// In ru, this message translates to:
  /// **'На месте'**
  String get driverActiveOrderStatusWaiting;

  /// No description provided for @driverActiveOrderStatusInProgress.
  ///
  /// In ru, this message translates to:
  /// **'В процессе'**
  String get driverActiveOrderStatusInProgress;

  /// No description provided for @driverActiveOrderStatusPickedUp.
  ///
  /// In ru, this message translates to:
  /// **'Посылка забрана'**
  String get driverActiveOrderStatusPickedUp;

  /// No description provided for @driverActiveOrderStatusInTransit.
  ///
  /// In ru, this message translates to:
  /// **'В пути'**
  String get driverActiveOrderStatusInTransit;

  /// No description provided for @driverActiveOrderStatusAtDoor.
  ///
  /// In ru, this message translates to:
  /// **'У двери'**
  String get driverActiveOrderStatusAtDoor;

  /// No description provided for @driverActiveOrderStatusCompleted.
  ///
  /// In ru, this message translates to:
  /// **'Завершено'**
  String get driverActiveOrderStatusCompleted;

  /// No description provided for @driverActiveOrderStatusFailed.
  ///
  /// In ru, this message translates to:
  /// **'Не вручено'**
  String get driverActiveOrderStatusFailed;

  /// No description provided for @driverEarningsTitle.
  ///
  /// In ru, this message translates to:
  /// **'Доходы'**
  String get driverEarningsTitle;

  /// No description provided for @driverHistoryTitle.
  ///
  /// In ru, this message translates to:
  /// **'История поездок'**
  String get driverHistoryTitle;

  /// No description provided for @driverDefaultName.
  ///
  /// In ru, this message translates to:
  /// **'Алексей'**
  String get driverDefaultName;

  /// No description provided for @driverDefaultCar.
  ///
  /// In ru, this message translates to:
  /// **'Автомобиль не указан'**
  String get driverDefaultCar;

  /// No description provided for @driverPeriodDay.
  ///
  /// In ru, this message translates to:
  /// **'День'**
  String get driverPeriodDay;

  /// No description provided for @driverPeriodWeek.
  ///
  /// In ru, this message translates to:
  /// **'Неделя'**
  String get driverPeriodWeek;

  /// No description provided for @driverPeriodMonth.
  ///
  /// In ru, this message translates to:
  /// **'Месяц'**
  String get driverPeriodMonth;

  /// No description provided for @driverCompletedFilter.
  ///
  /// In ru, this message translates to:
  /// **'Завершенные'**
  String get driverCompletedFilter;

  /// No description provided for @driverCancelledFilter.
  ///
  /// In ru, this message translates to:
  /// **'Отмененные'**
  String get driverCancelledFilter;

  /// No description provided for @driverRatingLabel.
  ///
  /// In ru, this message translates to:
  /// **'Рейтинг'**
  String get driverRatingLabel;

  /// No description provided for @driverActivityLabel.
  ///
  /// In ru, this message translates to:
  /// **'Активность'**
  String get driverActivityLabel;

  /// No description provided for @driverTripsLabel.
  ///
  /// In ru, this message translates to:
  /// **'Поездок'**
  String get driverTripsLabel;

  /// No description provided for @driverCarLabel.
  ///
  /// In ru, this message translates to:
  /// **'Автомобиль'**
  String get driverCarLabel;

  /// No description provided for @driverOrdersLabel.
  ///
  /// In ru, this message translates to:
  /// **'Заказы'**
  String get driverOrdersLabel;

  /// No description provided for @driverBonusesLabel.
  ///
  /// In ru, this message translates to:
  /// **'Бонусы'**
  String get driverBonusesLabel;

  /// No description provided for @driverTipsLabel.
  ///
  /// In ru, this message translates to:
  /// **'Чаевые'**
  String get driverTipsLabel;

  /// No description provided for @commonSupport.
  ///
  /// In ru, this message translates to:
  /// **'Поддержка'**
  String get commonSupport;

  /// No description provided for @commonSettings.
  ///
  /// In ru, this message translates to:
  /// **'Настройки'**
  String get commonSettings;

  /// No description provided for @commonInviteFriends.
  ///
  /// In ru, this message translates to:
  /// **'Пригласить друзей'**
  String get commonInviteFriends;

  /// No description provided for @commonInviteBonusSubtitle.
  ///
  /// In ru, this message translates to:
  /// **'Получайте бонусы'**
  String get commonInviteBonusSubtitle;

  /// No description provided for @commonAboutApp.
  ///
  /// In ru, this message translates to:
  /// **'О приложении'**
  String get commonAboutApp;

  /// No description provided for @commonSafety.
  ///
  /// In ru, this message translates to:
  /// **'Безопасность'**
  String get commonSafety;

  /// No description provided for @commonCurrentLocation.
  ///
  /// In ru, this message translates to:
  /// **'Текущее местоположение'**
  String get commonCurrentLocation;

  /// No description provided for @commonContinue.
  ///
  /// In ru, this message translates to:
  /// **'Продолжить'**
  String get commonContinue;

  /// No description provided for @commonCancel.
  ///
  /// In ru, this message translates to:
  /// **'Отмена'**
  String get commonCancel;

  /// No description provided for @commonSave.
  ///
  /// In ru, this message translates to:
  /// **'Сохранить'**
  String get commonSave;

  /// No description provided for @commonTotal.
  ///
  /// In ru, this message translates to:
  /// **'Итого'**
  String get commonTotal;

  /// No description provided for @commonClose.
  ///
  /// In ru, this message translates to:
  /// **'Закрыть'**
  String get commonClose;

  /// No description provided for @commonNotSpecified.
  ///
  /// In ru, this message translates to:
  /// **'Не указано'**
  String get commonNotSpecified;

  /// No description provided for @legalTitle.
  ///
  /// In ru, this message translates to:
  /// **'Правовая информация'**
  String get legalTitle;

  /// No description provided for @legalPrivacyTitle.
  ///
  /// In ru, this message translates to:
  /// **'Политика конфиденциальности'**
  String get legalPrivacyTitle;

  /// No description provided for @legalPrivacySubtitle.
  ///
  /// In ru, this message translates to:
  /// **'Как DOS обрабатывает телефон, геолокацию, данные заказов и уведомлений.'**
  String get legalPrivacySubtitle;

  /// No description provided for @legalTermsTitle.
  ///
  /// In ru, this message translates to:
  /// **'Условия использования'**
  String get legalTermsTitle;

  /// No description provided for @legalTermsSubtitle.
  ///
  /// In ru, this message translates to:
  /// **'Правила использования сервиса пассажирами, водителями и курьерами.'**
  String get legalTermsSubtitle;

  /// No description provided for @legalOpenWeb.
  ///
  /// In ru, this message translates to:
  /// **'Открыть веб-версию'**
  String get legalOpenWeb;

  /// No description provided for @legalPrivacyBody.
  ///
  /// In ru, this message translates to:
  /// **'DOS использует номер телефона для входа, геолокацию для подбора адреса и исполнителя, данные заказов для выполнения поездок и доставки, а push-токены для уведомлений о статусах. Данные передаются только для работы сервиса, поддержки, безопасности и требований закона.'**
  String get legalPrivacyBody;

  /// No description provided for @legalTermsBody.
  ///
  /// In ru, this message translates to:
  /// **'Используя DOS, пользователь подтверждает корректность данных профиля, соблюдает правила сервиса и принимает, что стоимость, статусы заказов, баланс водителя и доступность тарифов управляются платформой и администратором.'**
  String get legalTermsBody;

  /// No description provided for @accountDeleteTitle.
  ///
  /// In ru, this message translates to:
  /// **'Удалить аккаунт'**
  String get accountDeleteTitle;

  /// No description provided for @accountDeleteSubtitle.
  ///
  /// In ru, this message translates to:
  /// **'Аккаунт будет заблокирован, персональные данные будут обезличены, активные сессии завершены.'**
  String get accountDeleteSubtitle;

  /// No description provided for @accountDeleteConfirmTitle.
  ///
  /// In ru, this message translates to:
  /// **'Удалить аккаунт?'**
  String get accountDeleteConfirmTitle;

  /// No description provided for @accountDeleteConfirmBody.
  ///
  /// In ru, this message translates to:
  /// **'Это действие нельзя отменить. История заказов останется в системе в обезличенном виде для отчётности и требований закона.'**
  String get accountDeleteConfirmBody;

  /// No description provided for @accountDeleteAction.
  ///
  /// In ru, this message translates to:
  /// **'Удалить аккаунт'**
  String get accountDeleteAction;

  /// No description provided for @accountDeleteFailed.
  ///
  /// In ru, this message translates to:
  /// **'Не удалось удалить аккаунт. Попробуйте позже или обратитесь в поддержку.'**
  String get accountDeleteFailed;

  /// No description provided for @profileNameRequired.
  ///
  /// In ru, this message translates to:
  /// **'Укажите имя не короче 2 символов.'**
  String get profileNameRequired;

  /// No description provided for @driverProfilePersonalSubtitle.
  ///
  /// In ru, this message translates to:
  /// **'Основные данные водителя'**
  String get driverProfilePersonalSubtitle;

  /// No description provided for @driverProfileReviewNotice.
  ///
  /// In ru, this message translates to:
  /// **'После изменения данных профиль снова отправится на проверку администратору. До одобрения заказы недоступны.'**
  String get driverProfileReviewNotice;

  /// No description provided for @driverProfileSaveSuccess.
  ///
  /// In ru, this message translates to:
  /// **'Данные сохранены. Профиль отправлен на проверку.'**
  String get driverProfileSaveSuccess;

  /// No description provided for @driverProfileVehicleSubtitle.
  ///
  /// In ru, this message translates to:
  /// **'Данные автомобиля и открытый класс'**
  String get driverProfileVehicleSubtitle;

  /// No description provided for @driverVehicleSettingsTitle.
  ///
  /// In ru, this message translates to:
  /// **'Настройки автомобиля'**
  String get driverVehicleSettingsTitle;

  /// No description provided for @driverVehicleColorLabel.
  ///
  /// In ru, this message translates to:
  /// **'Цвет автомобиля'**
  String get driverVehicleColorLabel;

  /// No description provided for @driverTariffsTitle.
  ///
  /// In ru, this message translates to:
  /// **'Доступные тарифы'**
  String get driverTariffsTitle;

  /// No description provided for @driverVehicleSaveSuccess.
  ///
  /// In ru, this message translates to:
  /// **'Автомобиль и тарифы сохранены. Профиль отправлен на проверку.'**
  String get driverVehicleSaveSuccess;

  /// No description provided for @driverProfileDocumentsSubtitle.
  ///
  /// In ru, this message translates to:
  /// **'Статус проверки документов'**
  String get driverProfileDocumentsSubtitle;

  /// No description provided for @driverProfileSupportSubtitle.
  ///
  /// In ru, this message translates to:
  /// **'Помощь по заказам и аккаунту'**
  String get driverProfileSupportSubtitle;

  /// No description provided for @driverProfileSettingsSubtitle.
  ///
  /// In ru, this message translates to:
  /// **'Язык, режим и выход'**
  String get driverProfileSettingsSubtitle;

  /// No description provided for @driverProfileVerificationStatusLabel.
  ///
  /// In ru, this message translates to:
  /// **'Статус проверки'**
  String get driverProfileVerificationStatusLabel;

  /// No description provided for @driverProfileServiceClassLabel.
  ///
  /// In ru, this message translates to:
  /// **'Класс сервиса'**
  String get driverProfileServiceClassLabel;

  /// No description provided for @driverProfileSupportPhoneLabel.
  ///
  /// In ru, this message translates to:
  /// **'Телефон поддержки'**
  String get driverProfileSupportPhoneLabel;

  /// No description provided for @driverProfileSupportPhoneValue.
  ///
  /// In ru, this message translates to:
  /// **'+7 (700) 000-00-00'**
  String get driverProfileSupportPhoneValue;

  /// No description provided for @driverProfileSupportChatLabel.
  ///
  /// In ru, this message translates to:
  /// **'Чат поддержки'**
  String get driverProfileSupportChatLabel;

  /// No description provided for @driverProfileSupportChatValue.
  ///
  /// In ru, this message translates to:
  /// **'Напишите оператору в админ-панели'**
  String get driverProfileSupportChatValue;

  /// No description provided for @driverProfileAppVersionLabel.
  ///
  /// In ru, this message translates to:
  /// **'Версия приложения'**
  String get driverProfileAppVersionLabel;

  /// No description provided for @driverProfileAppVersionValue.
  ///
  /// In ru, this message translates to:
  /// **'1.0.1'**
  String get driverProfileAppVersionValue;

  /// No description provided for @promoApplyAction.
  ///
  /// In ru, this message translates to:
  /// **'Применить'**
  String get promoApplyAction;

  /// No description provided for @promoApplied.
  ///
  /// In ru, this message translates to:
  /// **'Промокод применён'**
  String get promoApplied;

  /// No description provided for @promoOriginalPrice.
  ///
  /// In ru, this message translates to:
  /// **'Без скидки'**
  String get promoOriginalPrice;

  /// No description provided for @promoDiscount.
  ///
  /// In ru, this message translates to:
  /// **'Скидка'**
  String get promoDiscount;

  /// No description provided for @promoTotal.
  ///
  /// In ru, this message translates to:
  /// **'Итого'**
  String get promoTotal;

  /// No description provided for @promoNotFound.
  ///
  /// In ru, this message translates to:
  /// **'Промокод не найден. Проверьте написание.'**
  String get promoNotFound;

  /// No description provided for @promoInactive.
  ///
  /// In ru, this message translates to:
  /// **'Этот промокод отключён.'**
  String get promoInactive;

  /// No description provided for @promoExpired.
  ///
  /// In ru, this message translates to:
  /// **'Срок действия промокода истёк.'**
  String get promoExpired;

  /// No description provided for @promoLimitReached.
  ///
  /// In ru, this message translates to:
  /// **'Лимит использований промокода исчерпан.'**
  String get promoLimitReached;

  /// No description provided for @promoUnavailable.
  ///
  /// In ru, this message translates to:
  /// **'Не удалось применить скидку. Попробуйте другой промокод.'**
  String get promoUnavailable;

  /// No description provided for @driverBonusUnavailable.
  ///
  /// In ru, this message translates to:
  /// **'Не удалось загрузить условия бонусов'**
  String get driverBonusUnavailable;

  /// No description provided for @driverBonusDisabled.
  ///
  /// In ru, this message translates to:
  /// **'Бонусная программа сейчас отключена'**
  String get driverBonusDisabled;

  /// No description provided for @driverBonusRefresh.
  ///
  /// In ru, this message translates to:
  /// **'Обновить прогресс бонуса'**
  String get driverBonusRefresh;

  /// No description provided for @driverBonusConditions.
  ///
  /// In ru, this message translates to:
  /// **'За каждые {orders} завершённых заказов — {amount}'**
  String driverBonusConditions(int orders, String amount);

  /// No description provided for @driverBonusProgress.
  ///
  /// In ru, this message translates to:
  /// **'Выполнено {completed} из {required}. Осталось {remaining}.'**
  String driverBonusProgress(int completed, int required, int remaining);
}

class _AppLocalizationsDelegate
    extends LocalizationsDelegate<AppLocalizations> {
  const _AppLocalizationsDelegate();

  @override
  Future<AppLocalizations> load(Locale locale) {
    return SynchronousFuture<AppLocalizations>(lookupAppLocalizations(locale));
  }

  @override
  bool isSupported(Locale locale) =>
      <String>['kk', 'ru'].contains(locale.languageCode);

  @override
  bool shouldReload(_AppLocalizationsDelegate old) => false;
}

AppLocalizations lookupAppLocalizations(Locale locale) {
  // Lookup logic when only language code is specified.
  switch (locale.languageCode) {
    case 'kk':
      return AppLocalizationsKk();
    case 'ru':
      return AppLocalizationsRu();
  }

  throw FlutterError(
    'AppLocalizations.delegate failed to load unsupported locale "$locale". This is likely '
    'an issue with the localizations generation tool. Please file an issue '
    'on GitHub with a reproducible sample app and the gen-l10n configuration '
    'that was used.',
  );
}
