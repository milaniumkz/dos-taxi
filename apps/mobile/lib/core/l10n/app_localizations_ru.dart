// ignore: unused_import
import 'package:intl/intl.dart' as intl;
import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for Russian (`ru`).
class AppLocalizationsRu extends AppLocalizations {
  AppLocalizationsRu([String locale = 'ru']) : super(locale);

  @override
  String get passengerAppTitle => 'DOS Пассажир';

  @override
  String get driverAppTitle => 'DOS Водитель';

  @override
  String get splashTitle => 'DOS Platform';

  @override
  String get splashSubtitle => 'Подготавливаем приложение и проверяем сессию';

  @override
  String get authPhoneTitle => 'Вход по номеру';

  @override
  String get authPhoneDescription =>
      'Введите номер телефона, чтобы получить одноразовый код.';

  @override
  String get authPhoneFieldLabel => 'Номер телефона';

  @override
  String get authPhoneFieldHint => '+7 (777) 000-00-00';

  @override
  String get authPhoneSubmit => 'Получить код';

  @override
  String get authPhoneSending => 'Отправляем код…';

  @override
  String get authPhoneNextAction => 'Далее';

  @override
  String get authDriverLoginAction => 'Войти';

  @override
  String get authDriverCreateAccountAction => 'Создать аккаунт';

  @override
  String get passengerWelcomeTitle => 'Добро пожаловать!';

  @override
  String get passengerWelcomeSubtitle => 'Комфортные поездки по вашему городу';

  @override
  String get driverWelcomeTitle => 'Станьте партнёром и зарабатывайте с нами';

  @override
  String get driverWelcomeSubtitle => 'Свободный график и стабильный доход';

  @override
  String get authOtpTitle => 'Подтверждение входа';

  @override
  String get authOtpDescription => 'Введите четырёхзначный код из SMS.';

  @override
  String get authOtpFieldLabel => 'Код подтверждения';

  @override
  String get authOtpResend => 'Отправить код повторно';

  @override
  String authOtpResendTimer(int seconds) {
    return 'Повторная отправка через $seconds сек';
  }

  @override
  String authOtpDebugCodeLabel(String code) {
    return 'Тестовый код: $code';
  }

  @override
  String get authOtpSubmit => 'Подтвердить';

  @override
  String get homePassengerTitle => 'Пассажирское приложение';

  @override
  String get homePassengerDescription =>
      'Здесь будут собраны карта, заказ такси, доставка, история и профиль клиента.';

  @override
  String get homeDriverTitle => 'Приложение водителя';

  @override
  String get homeDriverDescription =>
      'Здесь будут собраны статус онлайн, входящие заказы, активные поездки и доходы.';

  @override
  String get homeTaxiLabel => 'Такси';

  @override
  String get homeDeliveryLabel => 'Доставка';

  @override
  String get homeIntercityLabel => 'Межгород';

  @override
  String get homeSearchPlaceholder => 'Куда едем или что отправляем?';

  @override
  String get homeOrderAction => 'Заказать';

  @override
  String get homeResolvingCurrentAddress => 'Определяем адрес…';

  @override
  String get homeLocationPermissionDenied =>
      'Разрешите доступ к геолокации, чтобы заполнить адрес подачи.';

  @override
  String get homeLocationServiceDisabled =>
      'Включите геолокацию на устройстве, чтобы определить адрес подачи.';

  @override
  String get homeLocationUnavailable =>
      'Не удалось получить точную геолокацию устройства. Разрешите доступ к местоположению и попробуйте ещё раз.';

  @override
  String get homeReverseGeocodeFailed =>
      'Не удалось определить адрес по текущей геолокации.';

  @override
  String get homeDeliveryComingSoon => 'Экран доставки будет следующим блоком.';

  @override
  String get navTaxi => 'Такси';

  @override
  String get navMain => 'Главная';

  @override
  String get navDelivery => 'Доставка';

  @override
  String get navHistory => 'История';

  @override
  String get navFavorites => 'Избранное';

  @override
  String get navProfile => 'Профиль';

  @override
  String get navPayments => 'Оплата';

  @override
  String get homeSavedHome => 'Дом';

  @override
  String get homeSavedWork => 'Работа';

  @override
  String get homeSavedFavorite => 'Избранное';

  @override
  String get homeScooterLabel => 'Самокаты';

  @override
  String get homeScooterComingSoon => 'Самокаты будут доступны позже.';

  @override
  String get favoritesTitle => 'Избранное';

  @override
  String get favoritesEmptyTitle => 'Избранных адресов пока нет';

  @override
  String get favoritesEmptyBody =>
      'Сохранённые адреса появятся здесь после добавления дома, работы или частых поездок.';

  @override
  String get taxiAddressTitle => 'Маршрут поездки';

  @override
  String get taxiAddressPickupLabel => 'Откуда';

  @override
  String get taxiAddressDestinationLabel => 'Куда';

  @override
  String get taxiAddressHint => 'Введите адрес или выберите на карте';

  @override
  String get taxiAddressRouteHelper =>
      'Выберите адрес подачи и адрес назначения, чтобы рассчитать маршрут и стоимость.';

  @override
  String get taxiAddressContinue => 'К выбору класса';

  @override
  String get addressPickerSelectedOnMap => 'Точка на карте';

  @override
  String get addressPickerPickupMapHint =>
      'Нажмите на карту, чтобы выбрать адрес подачи.';

  @override
  String get addressPickerDestinationMapHint =>
      'Нажмите на карту, чтобы выбрать адрес назначения.';

  @override
  String get addressPickerClearPoint => 'Очистить точку';

  @override
  String get addressPickerAddressNotFound =>
      'Адрес не найден. Уточните запрос или выберите точку на карте.';

  @override
  String get addressPickerAddressSearchFailed =>
      'Не удалось найти адрес. Проверьте подключение и попробуйте ещё раз.';

  @override
  String get addressPickerUseManualPoint =>
      'Использовать введённый адрес для выбранной точки';

  @override
  String get addressPickerManualNeedsMapPoint =>
      'Сначала выберите точку на карте, затем укажите адрес вручную.';

  @override
  String get taxiClassTitle => 'Класс автомобиля';

  @override
  String get taxiClassContinue => 'К оплате';

  @override
  String get taxiClassEmpty =>
      'Выберите класс автомобиля с подходящей стоимостью и подачей.';

  @override
  String get taxiClassMinimumPriceLabel => 'Минимум';

  @override
  String get taxiClassEconomy => 'Эконом';

  @override
  String get taxiClassComfort => 'Комфорт';

  @override
  String get taxiClassComfortPlus => 'Комфорт плюс';

  @override
  String get taxiClassBusiness => 'Бизнес';

  @override
  String taxiClassEtaMinutes(int minutes) {
    return 'Подача $minutes мин';
  }

  @override
  String get taxiPaymentTitle => 'Способ оплаты';

  @override
  String get taxiPaymentMethodCard => 'Банковская карта';

  @override
  String get taxiPaymentMethodCash => 'Наличными';

  @override
  String get taxiPaymentMethodBonus => 'Бонусами';

  @override
  String get paymentMethodKaspiTransfer => 'Перевод Kaspi';

  @override
  String get paymentMethodHalykTransfer => 'Перевод Halyk';

  @override
  String get paymentMethodTransferSubtitle => 'Оплата переводом после поездки';

  @override
  String get taxiPaymentPromoLabel => 'Промокод';

  @override
  String get taxiPaymentPromoHint => 'Например, ALMATY10';

  @override
  String get taxiPaymentSummaryTitle => 'Параметры поездки';

  @override
  String get taxiPaymentContinue => 'Подтвердить поездку';

  @override
  String get taxiConfirmTitle => 'Подтверждение поездки';

  @override
  String get taxiConfirmSummaryTitle => 'Сводка перед заказом';

  @override
  String get taxiConfirmPriceLabel => 'Итого';

  @override
  String get taxiConfirmPaymentLabel => 'Оплата';

  @override
  String get taxiConfirmPromoLabel => 'Промокод';

  @override
  String get taxiConfirmDistanceLabel => 'Дистанция';

  @override
  String get taxiConfirmDurationLabel => 'Время в пути';

  @override
  String taxiConfirmDistanceValue(String distance) {
    return '$distance км';
  }

  @override
  String taxiConfirmDurationValue(int minutes) {
    return '$minutes мин';
  }

  @override
  String get taxiConfirmOrderAction => 'Заказать машину';

  @override
  String get taxiConfirmSearchingTitle => 'Ищем водителя';

  @override
  String get taxiConfirmSearchingSubtitle =>
      'Заказ создан. Сразу покажем принятие и номер машины, как только водитель подтвердит заказ.';

  @override
  String taxiConfirmOrderId(String orderId) {
    return 'Номер заказа: $orderId';
  }

  @override
  String get taxiErrorSelectClass => 'Сначала выберите класс автомобиля.';

  @override
  String get taxiErrorCompleteOrder =>
      'Заполните маршрут и параметры поездки полностью.';

  @override
  String get deliveryAddressTitle => 'Адреса доставки';

  @override
  String get deliveryAddressFromLabel => 'Отправитель';

  @override
  String get deliveryAddressToLabel => 'Получатель';

  @override
  String get deliveryAddressHint => 'Введите адрес или выберите из подсказок';

  @override
  String get deliveryAddressHelper =>
      'Сначала укажите точки отправки и вручения посылки.';

  @override
  String get deliveryAddressContinue => 'К деталям посылки';

  @override
  String get deliveryDetailsTitle => 'Детали посылки';

  @override
  String get deliveryDetailsDescriptionLabel => 'Что в посылке';

  @override
  String get deliveryDetailsDeclaredValueLabel => 'Объявленная стоимость';

  @override
  String get deliveryDetailsRecipientNameLabel => 'Имя получателя';

  @override
  String get deliveryDetailsRecipientPhoneLabel => 'Телефон получателя';

  @override
  String get deliveryDetailsFragile => 'Хрупкий груз';

  @override
  String get deliveryDetailsReturn => 'Нужен обратный возврат';

  @override
  String get deliveryDetailsCashOnDelivery => 'Наложенный платёж';

  @override
  String get deliveryDetailsCashOnDeliveryLabel => 'Сумма при вручении';

  @override
  String get deliveryDetailsPhotoAction => 'Добавить фото посылки';

  @override
  String get deliveryDetailsContinue => 'К выбору курьера';

  @override
  String get deliveryVehicleTitle => 'Тип курьера';

  @override
  String get deliveryVehicleHint =>
      'Выберите транспорт курьера. Цена и время подачи зависят от габаритов и срочности.';

  @override
  String get deliveryVehicleBicycle => 'Велосипед';

  @override
  String get deliveryVehicleMoped => 'Мопед';

  @override
  String get deliveryVehicleScooter => 'Самокат';

  @override
  String get deliveryVehicleCar => 'Авто';

  @override
  String deliveryVehicleEtaMinutes(int minutes) {
    return 'Прибудет за $minutes мин';
  }

  @override
  String get deliveryVehicleContinue => 'К оплате';

  @override
  String get deliveryPaymentTitle => 'Оплата доставки';

  @override
  String get deliveryPaymentMethodCard => 'Банковская карта';

  @override
  String get deliveryPaymentMethodCash => 'Наличными';

  @override
  String get deliveryPaymentMethodBonus => 'Бонусами';

  @override
  String get deliveryPaymentPromoLabel => 'Промокод';

  @override
  String get deliveryPaymentPromoHint => 'Например, DELIVERY15';

  @override
  String get deliveryPaymentSummaryTitle => 'Параметры доставки';

  @override
  String get deliveryPaymentContinue => 'Подтвердить доставку';

  @override
  String get deliveryConfirmTitle => 'Подтверждение доставки';

  @override
  String get deliveryConfirmSummaryTitle => 'Сводка перед заказом';

  @override
  String get deliveryConfirmPackageLabel => 'Посылка';

  @override
  String get deliveryConfirmRecipientLabel => 'Получатель';

  @override
  String get deliveryConfirmPaymentLabel => 'Оплата';

  @override
  String get deliveryConfirmPromoLabel => 'Промокод';

  @override
  String get deliveryConfirmDistanceLabel => 'Дистанция';

  @override
  String get deliveryConfirmDurationLabel => 'Время в пути';

  @override
  String get deliveryConfirmPriceLabel => 'Итого';

  @override
  String deliveryConfirmDistanceValue(String distance) {
    return '$distance км';
  }

  @override
  String deliveryConfirmDurationValue(int minutes) {
    return '$minutes мин';
  }

  @override
  String get deliveryConfirmOrderAction => 'Заказать курьера';

  @override
  String get deliveryConfirmSearchingTitle => 'Ищем курьера';

  @override
  String get deliveryConfirmSearchingSubtitle =>
      'Заказ создан. Как только курьер примет заказ, покажем статус и трекинг.';

  @override
  String deliveryConfirmOrderId(String orderId) {
    return 'Номер заказа: $orderId';
  }

  @override
  String get deliveryErrorAddresses =>
      'Укажите адрес отправителя и получателя.';

  @override
  String get deliveryErrorDescription => 'Добавьте описание посылки.';

  @override
  String get deliveryErrorRecipientName => 'Укажите имя получателя.';

  @override
  String get deliveryErrorRecipientPhone => 'Укажите телефон получателя.';

  @override
  String get deliveryErrorVehicle => 'Сначала выберите тип курьера.';

  @override
  String get deliveryErrorCompleteOrder =>
      'Заполните все обязательные поля доставки.';

  @override
  String get activeOrderTitle => 'Активный заказ';

  @override
  String get activeOrderStatusSearching => 'Ищем исполнителя';

  @override
  String get activeOrderStatusAccepted => 'Исполнитель принял заказ';

  @override
  String get activeOrderStatusArriving => 'Исполнитель едет к вам';

  @override
  String get activeOrderStatusWaiting => 'Исполнитель ожидает';

  @override
  String get activeOrderStatusInProgress => 'Заказ в пути';

  @override
  String get activeOrderStatusCompleted => 'Заказ завершён';

  @override
  String get activeOrderStatusCancelled => 'Заказ отменён';

  @override
  String get activeOrderExecutorPending => 'Подбираем исполнителя';

  @override
  String get activeOrderDetailDriver => 'Водитель';

  @override
  String get activeOrderDetailTariff => 'Тариф';

  @override
  String get activeOrderDetailCar => 'Машина';

  @override
  String get activeOrderDetailFrom => 'Откуда';

  @override
  String get activeOrderDetailTo => 'Куда';

  @override
  String get activeOrderDetailPrice => 'Стоимость';

  @override
  String get activeOrderDetailPhone => 'Телефон';

  @override
  String get activeOrderVehicleNotAssigned =>
      'Машина будет показана после назначения';

  @override
  String get activeOrderChangePaymentAction => 'Изменить способ оплаты';

  @override
  String get activeOrderCancelAction => 'Отменить заказ';

  @override
  String get activeOrderCancelConfirmTitle => 'Отменить заказ?';

  @override
  String get activeOrderCancelConfirmBody =>
      'Подтвердите отмену, если поездка или доставка больше не актуальна.';

  @override
  String get activeOrderCancelConfirmAction => 'Да, отменить';

  @override
  String get activeOrderTrackingFailed =>
      'Не удалось подключиться к обновлениям заказа.';

  @override
  String get orderChatTitle => 'Чат по заказу';

  @override
  String get orderChatClosed =>
      'Чат доступен только во время активной поездки или доставки.';

  @override
  String get orderChatInputHint => 'Напишите сообщение';

  @override
  String get orderChatSendAction => 'Отправить';

  @override
  String get orderChatEmpty => 'Сообщений пока нет.';

  @override
  String get orderChatLoadFailed => 'Не удалось загрузить чат.';

  @override
  String get orderChatSendFailed => 'Не удалось отправить сообщение.';

  @override
  String get ratingTitle => 'Оценка поездки';

  @override
  String get ratingSubtitle => 'Как прошла поездка?';

  @override
  String get ratingAction => 'Отправить оценку';

  @override
  String get ratingThanks => 'Спасибо, оценка сохранена.';

  @override
  String get historyTitle => 'История заказов';

  @override
  String get orderHistoryFilterAll => 'Все';

  @override
  String get orderHistoryFilterTaxi => 'Такси';

  @override
  String get orderHistoryFilterDelivery => 'Доставка';

  @override
  String get orderHistoryEmpty => 'Заказы пока не найдены.';

  @override
  String get orderHistoryLoadMore => 'Загрузить ещё';

  @override
  String get orderHistoryDetailTitle => 'Детали заказа';

  @override
  String get orderHistoryStatusLabel => 'Статус';

  @override
  String get orderHistoryDateLabel => 'Дата';

  @override
  String get orderHistoryRatingLabel => 'Оценка';

  @override
  String get orderStatusCompleted => 'Завершён';

  @override
  String get orderStatusCancelled => 'Отменён';

  @override
  String get orderStatusInProgress => 'В процессе';

  @override
  String get profileTitle => 'Профиль';

  @override
  String get profileDefaultName => 'Пассажир';

  @override
  String get profileNameLabel => 'Имя';

  @override
  String get profilePhoneLabel => 'Телефон';

  @override
  String get profileLanguageLabel => 'Язык интерфейса';

  @override
  String get profileLanguageRu => 'Русский';

  @override
  String get profileLanguageKk => 'Қазақша';

  @override
  String get profileThemeLabel => 'Тема интерфейса';

  @override
  String get profileThemeLight => 'Светлая';

  @override
  String get profileThemeDark => 'Тёмная';

  @override
  String get profileThemeSystem => 'Системная';

  @override
  String get profileCurrencyLabel => 'Валюта';

  @override
  String get profileCurrencyKzt => 'Тенге (KZT)';

  @override
  String get profileCurrencyRub => 'Рубль (RUB)';

  @override
  String get profileSignOutAction => 'Выйти из аккаунта';

  @override
  String get paymentsTitle => 'Способы оплаты';

  @override
  String get paymentsEmpty => 'Сохранённых карт пока нет.';

  @override
  String get paymentsAddCardAction => 'Добавить карту';

  @override
  String get paymentsKassa24Provider => 'Касса24';

  @override
  String get paymentsCardLast4Label => 'Последние 4 цифры карты';

  @override
  String get paymentsCardHolderLabel => 'Имя держателя';

  @override
  String get paymentsCardAddedMessage => 'Карта добавлена через Касса24';

  @override
  String get driverOnboardingTitle => 'Регистрация исполнителя';

  @override
  String get driverOnboardingSubtitle =>
      'Заполните профиль и добавьте документы, чтобы начать принимать поездки и доставки.';

  @override
  String get driverOnboardingExecutorTypeLabel => 'Роль исполнителя';

  @override
  String get driverOnboardingExecutorTypeDriver => 'Водитель';

  @override
  String get driverOnboardingExecutorTypeCourier => 'Курьер';

  @override
  String get driverOnboardingVehicleLabel => 'Транспорт курьера';

  @override
  String get driverOnboardingVehicleMakeLabel => 'Марка автомобиля';

  @override
  String get driverOnboardingVehicleModelLabel => 'Модель автомобиля';

  @override
  String get driverOnboardingVehicleYearLabel => 'Год выпуска';

  @override
  String get driverOnboardingVehiclePlateLabel => 'Госномер';

  @override
  String get driverOnboardingDocumentsLabel => 'Документы';

  @override
  String get driverOnboardingLicenseAction => 'Водительское удостоверение';

  @override
  String get driverOnboardingIdAction => 'Удостоверение личности';

  @override
  String driverOnboardingPhotoSelected(Object fileName) {
    return 'Файл: $fileName';
  }

  @override
  String get driverOnboardingSubmitAction => 'Отправить на проверку';

  @override
  String get driverOnboardingNameRequired => 'Укажите имя исполнителя.';

  @override
  String get driverOnboardingDocumentRequired =>
      'Добавьте хотя бы один документ.';

  @override
  String get driverOnboardingVehicleRequired => 'Выберите транспорт курьера.';

  @override
  String get driverOnboardingVehicleDetailsRequired =>
      'Заполните марку, модель, год выпуска и госномер автомобиля.';

  @override
  String get driverVerificationPendingTitle => 'Проверяем профиль';

  @override
  String get driverVerificationPendingDescription =>
      'Пока профиль на проверке, входящие заказы недоступны. После одобрения администратором можно будет выйти онлайн.';

  @override
  String get driverVerificationPendingRefreshAction => 'Проверить статус';

  @override
  String get driverVerificationPendingDemoAction => 'Открыть тестовый режим';

  @override
  String get driverDashboardTitle => 'Рабочий экран';

  @override
  String get driverDashboardStatusOnline => 'Онлайн';

  @override
  String get driverDashboardStatusOffline => 'Оффлайн';

  @override
  String get driverDashboardBalanceLabel => 'Баланс';

  @override
  String get driverBalanceTopUpTitle => 'Пополнить личный счёт';

  @override
  String get driverBalanceTopUpSubtitle =>
      'Заявка уйдёт администратору для счёта Kaspi';

  @override
  String get driverBalanceTopUpAmountLabel => 'Сумма пополнения';

  @override
  String get driverBalanceTopUpPhoneLabel => 'Телефон для счёта Kaspi';

  @override
  String get driverBalanceTopUpSubmit => 'Отправить заявку';

  @override
  String get driverBalanceTopUpSuccess => 'Заявка отправлена администратору.';

  @override
  String get driverBalanceTopUpInvalid => 'Укажите сумму от 100 ₸ и телефон.';

  @override
  String get driverDashboardModeLabel => 'Режим';

  @override
  String get driverDashboardModeDemo => 'Тестовый режим';

  @override
  String get driverDashboardModeVerified => 'Верифицирован';

  @override
  String get driverDashboardHeartbeatLabel => 'Последняя связь';

  @override
  String get driverDashboardHeatZoneHot => 'Горячая зона';

  @override
  String get driverDashboardHeatZoneWarm => 'Тёплая зона';

  @override
  String get driverDashboardHeatZoneCool => 'Спокойная зона';

  @override
  String get driverDashboardWaitingOffer =>
      'Входящие заказы появятся здесь, когда водитель онлайн.';

  @override
  String get driverDashboardOpenActiveOrder => 'Открыть активный заказ';

  @override
  String get driverIncomingOrderTitle => 'Новый заказ';

  @override
  String get driverIncomingOrderAccept => 'Принять';

  @override
  String get driverIncomingOrderReject => 'Отклонить';

  @override
  String driverIncomingOrderCountdown(int seconds) {
    return 'Ответьте за $seconds сек';
  }

  @override
  String get driverIncomingOrderPickupLabel => 'Подача';

  @override
  String get driverIncomingOrderDestinationLabel => 'Назначение';

  @override
  String get driverIncomingOrderPriceLabel => 'Доход';

  @override
  String get driverIncomingOrderDistanceLabel => 'Дистанция';

  @override
  String get driverIncomingOrderDurationLabel => 'Время';

  @override
  String get driverIncomingOrderClientLabel => 'Клиент';

  @override
  String get driverActiveOrderTitle => 'Активный заказ исполнителя';

  @override
  String get driverActiveOrderNavigationAction => 'Навигатор';

  @override
  String get driverActiveOrderNavigationTitle => 'Открыть маршрут';

  @override
  String get driverActiveOrderNavigationBrowser => 'В браузере';

  @override
  String get driverActiveOrderNavigationUnavailable =>
      'Не удалось открыть карты';

  @override
  String get driverActiveOrderPickupLabel => 'Точка подачи';

  @override
  String get driverActiveOrderDestinationLabel => 'Точка назначения';

  @override
  String get driverActiveOrderMeterTitle => 'Таксометр';

  @override
  String get driverActiveOrderMeterMinimum => 'Минимальная стоимость';

  @override
  String get driverActiveOrderMeterDistance => 'Фактическая дистанция';

  @override
  String get driverActiveOrderMeterPrice => 'Текущая стоимость';

  @override
  String get driverActiveOrderClientLabel => 'Контакт клиента';

  @override
  String get driverActiveOrderPhoneLabel => 'Телефон';

  @override
  String get driverActiveOrderPaymentLabel => 'Оплата';

  @override
  String get driverActiveOrderPrimaryArrived => 'На месте';

  @override
  String get driverActiveOrderPrimaryStart => 'Начать';

  @override
  String get driverActiveOrderPrimaryComplete => 'Завершить';

  @override
  String get driverActiveOrderDeliveryPickup => 'Забрал';

  @override
  String get driverActiveOrderDeliveryTransit => 'В пути';

  @override
  String get driverActiveOrderDeliveryAtDoor => 'У двери';

  @override
  String get driverActiveOrderDeliveryDelivered => 'Вручил';

  @override
  String get driverActiveOrderDeliveryFailed => 'Не вручил';

  @override
  String get driverActiveOrderRecipientCodeLabel => 'Код получателя';

  @override
  String get driverActiveOrderProofPhotoAction => 'Добавить фото подтверждения';

  @override
  String get driverActiveOrderStatusAccepted => 'Заказ принят';

  @override
  String get driverActiveOrderStatusWaiting => 'На месте';

  @override
  String get driverActiveOrderStatusInProgress => 'В процессе';

  @override
  String get driverActiveOrderStatusPickedUp => 'Посылка забрана';

  @override
  String get driverActiveOrderStatusInTransit => 'В пути';

  @override
  String get driverActiveOrderStatusAtDoor => 'У двери';

  @override
  String get driverActiveOrderStatusCompleted => 'Завершено';

  @override
  String get driverActiveOrderStatusFailed => 'Не вручено';

  @override
  String get driverEarningsTitle => 'Доходы';

  @override
  String get driverHistoryTitle => 'История поездок';

  @override
  String get driverDefaultName => 'Алексей';

  @override
  String get driverDefaultCar => 'Автомобиль не указан';

  @override
  String get driverPeriodDay => 'День';

  @override
  String get driverPeriodWeek => 'Неделя';

  @override
  String get driverPeriodMonth => 'Месяц';

  @override
  String get driverCompletedFilter => 'Завершенные';

  @override
  String get driverCancelledFilter => 'Отмененные';

  @override
  String get driverRatingLabel => 'Рейтинг';

  @override
  String get driverActivityLabel => 'Активность';

  @override
  String get driverTripsLabel => 'Поездок';

  @override
  String get driverCarLabel => 'Автомобиль';

  @override
  String get driverOrdersLabel => 'Заказы';

  @override
  String get driverBonusesLabel => 'Бонусы';

  @override
  String get driverTipsLabel => 'Чаевые';

  @override
  String get commonSupport => 'Поддержка';

  @override
  String get commonSettings => 'Настройки';

  @override
  String get commonInviteFriends => 'Пригласить друзей';

  @override
  String get commonInviteBonusSubtitle => 'Получайте бонусы';

  @override
  String get commonAboutApp => 'О приложении';

  @override
  String get commonSafety => 'Безопасность';

  @override
  String get commonCurrentLocation => 'Текущее местоположение';

  @override
  String get commonContinue => 'Продолжить';

  @override
  String get commonCancel => 'Отмена';

  @override
  String get commonSave => 'Сохранить';

  @override
  String get commonTotal => 'Итого';

  @override
  String get commonClose => 'Закрыть';

  @override
  String get commonNotSpecified => 'Не указано';

  @override
  String get legalTitle => 'Правовая информация';

  @override
  String get legalPrivacyTitle => 'Политика конфиденциальности';

  @override
  String get legalPrivacySubtitle =>
      'Как DOS обрабатывает телефон, геолокацию, данные заказов и уведомлений.';

  @override
  String get legalTermsTitle => 'Условия использования';

  @override
  String get legalTermsSubtitle =>
      'Правила использования сервиса пассажирами, водителями и курьерами.';

  @override
  String get legalOpenWeb => 'Открыть веб-версию';

  @override
  String get legalPrivacyBody =>
      'DOS использует номер телефона для входа, геолокацию для подбора адреса и исполнителя, данные заказов для выполнения поездок и доставки, а push-токены для уведомлений о статусах. Данные передаются только для работы сервиса, поддержки, безопасности и требований закона.';

  @override
  String get legalTermsBody =>
      'Используя DOS, пользователь подтверждает корректность данных профиля, соблюдает правила сервиса и принимает, что стоимость, статусы заказов, баланс водителя и доступность тарифов управляются платформой и администратором.';

  @override
  String get accountDeleteTitle => 'Удалить аккаунт';

  @override
  String get accountDeleteSubtitle =>
      'Аккаунт будет заблокирован, персональные данные будут обезличены, активные сессии завершены.';

  @override
  String get accountDeleteConfirmTitle => 'Удалить аккаунт?';

  @override
  String get accountDeleteConfirmBody =>
      'Это действие нельзя отменить. История заказов останется в системе в обезличенном виде для отчётности и требований закона.';

  @override
  String get accountDeleteAction => 'Удалить аккаунт';

  @override
  String get accountDeleteFailed =>
      'Не удалось удалить аккаунт. Попробуйте позже или обратитесь в поддержку.';

  @override
  String get profileNameRequired => 'Укажите имя не короче 2 символов.';

  @override
  String get driverProfilePersonalSubtitle => 'Основные данные водителя';

  @override
  String get driverProfileReviewNotice =>
      'После изменения данных профиль снова отправится на проверку администратору. До одобрения заказы недоступны.';

  @override
  String get driverProfileSaveSuccess =>
      'Данные сохранены. Профиль отправлен на проверку.';

  @override
  String get driverProfileVehicleSubtitle =>
      'Данные автомобиля и открытый класс';

  @override
  String get driverVehicleSettingsTitle => 'Настройки автомобиля';

  @override
  String get driverVehicleColorLabel => 'Цвет автомобиля';

  @override
  String get driverTariffsTitle => 'Доступные тарифы';

  @override
  String get driverVehicleSaveSuccess =>
      'Автомобиль и тарифы сохранены. Профиль отправлен на проверку.';

  @override
  String get driverProfileDocumentsSubtitle => 'Статус проверки документов';

  @override
  String get driverProfileSupportSubtitle => 'Помощь по заказам и аккаунту';

  @override
  String get driverProfileSettingsSubtitle => 'Язык, режим и выход';

  @override
  String get driverProfileVerificationStatusLabel => 'Статус проверки';

  @override
  String get driverProfileServiceClassLabel => 'Класс сервиса';

  @override
  String get driverProfileSupportPhoneLabel => 'Телефон поддержки';

  @override
  String get driverProfileSupportPhoneValue => '+7 (700) 000-00-00';

  @override
  String get driverProfileSupportChatLabel => 'Чат поддержки';

  @override
  String get driverProfileSupportChatValue =>
      'Напишите оператору в админ-панели';

  @override
  String get driverProfileAppVersionLabel => 'Версия приложения';

  @override
  String get driverProfileAppVersionValue => '1.0.1';

  @override
  String get promoApplyAction => 'Применить';

  @override
  String get promoApplied => 'Промокод применён';

  @override
  String get promoOriginalPrice => 'Без скидки';

  @override
  String get promoDiscount => 'Скидка';

  @override
  String get promoTotal => 'Итого';

  @override
  String get promoNotFound => 'Промокод не найден. Проверьте написание.';

  @override
  String get promoInactive => 'Этот промокод отключён.';

  @override
  String get promoExpired => 'Срок действия промокода истёк.';

  @override
  String get promoLimitReached => 'Лимит использований промокода исчерпан.';

  @override
  String get promoUnavailable =>
      'Не удалось применить скидку. Попробуйте другой промокод.';

  @override
  String get driverBonusUnavailable => 'Не удалось загрузить условия бонусов';

  @override
  String get driverBonusDisabled => 'Бонусная программа сейчас отключена';

  @override
  String get driverBonusRefresh => 'Обновить прогресс бонуса';

  @override
  String driverBonusConditions(int orders, String amount) {
    return 'За каждые $orders завершённых заказов — $amount';
  }

  @override
  String driverBonusProgress(int completed, int required, int remaining) {
    return 'Выполнено $completed из $required. Осталось $remaining.';
  }
}
