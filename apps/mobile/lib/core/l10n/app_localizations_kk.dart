// ignore: unused_import
import 'package:intl/intl.dart' as intl;
import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for Kazakh (`kk`).
class AppLocalizationsKk extends AppLocalizations {
  AppLocalizationsKk([String locale = 'kk']) : super(locale);

  @override
  String get passengerAppTitle => 'DOS Жолаушы';

  @override
  String get driverAppTitle => 'DOS Жүргізуші';

  @override
  String get splashTitle => 'DOS Platform';

  @override
  String get splashSubtitle =>
      'Қолданбаны дайындап, сессияны тексеріп жатырмыз';

  @override
  String get authPhoneTitle => 'Нөмір арқылы кіру';

  @override
  String get authPhoneDescription =>
      'Бір реттік код алу үшін телефон нөміріңізді енгізіңіз.';

  @override
  String get authPhoneFieldLabel => 'Телефон нөмірі';

  @override
  String get authPhoneFieldHint => '+7 (777) 000-00-00';

  @override
  String get authPhoneSubmit => 'Код алу';

  @override
  String get authPhoneSending => 'Код жіберілуде…';

  @override
  String get authPhoneNextAction => 'Әрі қарай';

  @override
  String get authDriverLoginAction => 'Кіру';

  @override
  String get authDriverCreateAccountAction => 'Аккаунт жасау';

  @override
  String get passengerWelcomeTitle => 'Қош келдіңіз!';

  @override
  String get passengerWelcomeSubtitle => 'Қалаңыздағы жайлы сапарлар';

  @override
  String get driverWelcomeTitle => 'Серіктес болып, бізбен табыс табыңыз';

  @override
  String get driverWelcomeSubtitle => 'Еркін кесте және тұрақты табыс';

  @override
  String get authOtpTitle => 'Кіруді растау';

  @override
  String get authOtpDescription =>
      'SMS арқылы келген төрт таңбалы кодты енгізіңіз.';

  @override
  String get authOtpFieldLabel => 'Растау коды';

  @override
  String get authOtpResend => 'Кодты қайта жіберу';

  @override
  String authOtpResendTimer(int seconds) {
    return 'Қайта жіберу $seconds сек кейін';
  }

  @override
  String authOtpDebugCodeLabel(String code) {
    return 'Тест коды: $code';
  }

  @override
  String get authOtpSubmit => 'Растау';

  @override
  String get homePassengerTitle => 'Жолаушы қолданбасы';

  @override
  String get homePassengerDescription =>
      'Бұл жерде карта, такси тапсырысы, жеткізу, тарих және клиент профилі болады.';

  @override
  String get homeDriverTitle => 'Жүргізуші қолданбасы';

  @override
  String get homeDriverDescription =>
      'Бұл жерде онлайн мәртебесі, кіріс тапсырыстар, белсенді сапарлар және табыс болады.';

  @override
  String get homeTaxiLabel => 'Такси';

  @override
  String get homeDeliveryLabel => 'Жеткізу';

  @override
  String get homeIntercityLabel => 'Қалааралық';

  @override
  String get homeSearchPlaceholder => 'Қайда барамыз немесе не жібереміз?';

  @override
  String get homeOrderAction => 'Тапсырыс беру';

  @override
  String get homeResolvingCurrentAddress => 'Мекенжай анықталуда…';

  @override
  String get homeLocationPermissionDenied =>
      'Жіберу мекенжайын толтыру үшін геолокацияға рұқсат беріңіз.';

  @override
  String get homeLocationServiceDisabled =>
      'Жіберу мекенжайын анықтау үшін құрылғыдағы геолокацияны қосыңыз.';

  @override
  String get homeLocationUnavailable =>
      'Құрылғының нақты геолокациясын алу мүмкін болмады. Орналасуға рұқсат беріп, қайталап көріңіз.';

  @override
  String get homeReverseGeocodeFailed =>
      'Ағымдағы геолокация бойынша мекенжайды анықтау мүмкін болмады.';

  @override
  String get homeDeliveryComingSoon => 'Жеткізу экраны келесі блокта қосылады.';

  @override
  String get navTaxi => 'Такси';

  @override
  String get navMain => 'Басты';

  @override
  String get navDelivery => 'Жеткізу';

  @override
  String get navHistory => 'Тарих';

  @override
  String get navFavorites => 'Таңдаулы';

  @override
  String get navProfile => 'Профиль';

  @override
  String get navPayments => 'Төлем';

  @override
  String get homeSavedHome => 'Үй';

  @override
  String get homeSavedWork => 'Жұмыс';

  @override
  String get homeSavedFavorite => 'Таңдаулы';

  @override
  String get homeScooterLabel => 'Самокаттар';

  @override
  String get homeScooterComingSoon => 'Самокаттар кейін қолжетімді болады.';

  @override
  String get favoritesTitle => 'Таңдаулы';

  @override
  String get favoritesEmptyTitle => 'Таңдаулы мекенжайлар әзірге жоқ';

  @override
  String get favoritesEmptyBody =>
      'Үй, жұмыс немесе жиі қолданылатын бағыттар қосылғаннан кейін сақталған мекенжайлар осында көрсетіледі.';

  @override
  String get taxiAddressTitle => 'Сапар бағыты';

  @override
  String get taxiAddressPickupLabel => 'Қай жерден';

  @override
  String get taxiAddressDestinationLabel => 'Қайда';

  @override
  String get taxiAddressHint => 'Мекенжайды енгізіңіз немесе картадан таңдаңыз';

  @override
  String get taxiAddressRouteHelper =>
      'Маршрут пен бағаны есептеу үшін жіберу және бару мекенжайын таңдаңыз.';

  @override
  String get taxiAddressContinue => 'Класс таңдауға өту';

  @override
  String get addressPickerSelectedOnMap => 'Картадағы нүкте';

  @override
  String get addressPickerPickupMapHint =>
      'Жіберу мекенжайын таңдау үшін картаға басыңыз.';

  @override
  String get addressPickerDestinationMapHint =>
      'Бару мекенжайын таңдау үшін картаға басыңыз.';

  @override
  String get addressPickerClearPoint => 'Нүктені тазарту';

  @override
  String get addressPickerAddressNotFound =>
      'Мекенжай табылмады. Сұрауды нақтылаңыз немесе картадан таңдаңыз.';

  @override
  String get addressPickerAddressSearchFailed =>
      'Мекенжайды табу мүмкін болмады. Байланысты тексеріп, қайталап көріңіз.';

  @override
  String get addressPickerUseManualPoint =>
      'Енгізілген мекенжайды таңдалған нүктеге қолдану';

  @override
  String get addressPickerManualNeedsMapPoint =>
      'Алдымен картадан нүктені таңдаңыз, содан кейін мекенжайды қолмен енгізіңіз.';

  @override
  String get taxiClassTitle => 'Көлік класы';

  @override
  String get taxiClassContinue => 'Төлемге өту';

  @override
  String get taxiClassEmpty =>
      'Бағасы мен келу уақыты қолайлы көлік класын таңдаңыз.';

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
    return 'Келуі $minutes мин';
  }

  @override
  String get taxiPaymentTitle => 'Төлем тәсілі';

  @override
  String get taxiPaymentMethodCard => 'Банк картасы';

  @override
  String get taxiPaymentMethodCash => 'Қолма-қол';

  @override
  String get taxiPaymentMethodBonus => 'Бонустармен';

  @override
  String get paymentMethodKaspiTransfer => 'Kaspi аударымы';

  @override
  String get paymentMethodHalykTransfer => 'Halyk аударымы';

  @override
  String get paymentMethodTransferSubtitle => 'Сапардан кейін аударыммен төлеу';

  @override
  String get taxiPaymentPromoLabel => 'Промокод';

  @override
  String get taxiPaymentPromoHint => 'Мысалы, ALMATY10';

  @override
  String get taxiPaymentSummaryTitle => 'Сапар параметрлері';

  @override
  String get taxiPaymentContinue => 'Сапарды растау';

  @override
  String get taxiConfirmTitle => 'Сапарды растау';

  @override
  String get taxiConfirmSummaryTitle => 'Тапсырыс алдындағы қысқаша мәлімет';

  @override
  String get taxiConfirmPriceLabel => 'Жиыны';

  @override
  String get taxiConfirmPaymentLabel => 'Төлем';

  @override
  String get taxiConfirmPromoLabel => 'Промокод';

  @override
  String get taxiConfirmDistanceLabel => 'Қашықтық';

  @override
  String get taxiConfirmDurationLabel => 'Жол уақыты';

  @override
  String taxiConfirmDistanceValue(String distance) {
    return '$distance км';
  }

  @override
  String taxiConfirmDurationValue(int minutes) {
    return '$minutes мин';
  }

  @override
  String get taxiConfirmOrderAction => 'Көлікке тапсырыс беру';

  @override
  String get taxiConfirmSearchingTitle => 'Жүргізуші ізделуде';

  @override
  String get taxiConfirmSearchingSubtitle =>
      'Тапсырыс жасалды. Жүргізуші тапсырысты растаған бойда көлік нөмірі мен қабылдау статусын көрсетеміз.';

  @override
  String taxiConfirmOrderId(String orderId) {
    return 'Тапсырыс нөмірі: $orderId';
  }

  @override
  String get taxiErrorSelectClass => 'Алдымен көлік класын таңдаңыз.';

  @override
  String get taxiErrorCompleteOrder =>
      'Маршрут пен сапар параметрлерін толық толтырыңыз.';

  @override
  String get deliveryAddressTitle => 'Жеткізу мекенжайлары';

  @override
  String get deliveryAddressFromLabel => 'Жіберуші';

  @override
  String get deliveryAddressToLabel => 'Алушы';

  @override
  String get deliveryAddressHint =>
      'Мекенжайды енгізіңіз немесе ұсыныстан таңдаңыз';

  @override
  String get deliveryAddressHelper =>
      'Алдымен жіберу және тапсыру нүктелерін көрсетіңіз.';

  @override
  String get deliveryAddressContinue => 'Сәлемдеме деректеріне өту';

  @override
  String get deliveryDetailsTitle => 'Сәлемдеме деректері';

  @override
  String get deliveryDetailsDescriptionLabel => 'Сәлемдеме ішінде не бар';

  @override
  String get deliveryDetailsDeclaredValueLabel => 'Жарияланған құны';

  @override
  String get deliveryDetailsRecipientNameLabel => 'Алушының аты';

  @override
  String get deliveryDetailsRecipientPhoneLabel => 'Алушының телефоны';

  @override
  String get deliveryDetailsFragile => 'Сынғыш жүк';

  @override
  String get deliveryDetailsReturn => 'Қайтару қажет';

  @override
  String get deliveryDetailsCashOnDelivery => 'Қолма-қол төлеммен тапсыру';

  @override
  String get deliveryDetailsCashOnDeliveryLabel => 'Тапсыру кезіндегі сома';

  @override
  String get deliveryDetailsPhotoAction => 'Сәлемдеме фотосын қосу';

  @override
  String get deliveryDetailsContinue => 'Курьер таңдауға өту';

  @override
  String get deliveryVehicleTitle => 'Курьер түрі';

  @override
  String get deliveryVehicleHint =>
      'Курьердің көлігін таңдаңыз. Баға мен келу уақыты өлшем мен шұғылдыққа байланысты.';

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
    return '$minutes мин ішінде келеді';
  }

  @override
  String get deliveryVehicleContinue => 'Төлемге өту';

  @override
  String get deliveryPaymentTitle => 'Жеткізуді төлеу';

  @override
  String get deliveryPaymentMethodCard => 'Банк картасы';

  @override
  String get deliveryPaymentMethodCash => 'Қолма-қол';

  @override
  String get deliveryPaymentMethodBonus => 'Бонустармен';

  @override
  String get deliveryPaymentPromoLabel => 'Промокод';

  @override
  String get deliveryPaymentPromoHint => 'Мысалы, DELIVERY15';

  @override
  String get deliveryPaymentSummaryTitle => 'Жеткізу параметрлері';

  @override
  String get deliveryPaymentContinue => 'Жеткізуді растау';

  @override
  String get deliveryConfirmTitle => 'Жеткізуді растау';

  @override
  String get deliveryConfirmSummaryTitle =>
      'Тапсырыс алдындағы қысқаша мәлімет';

  @override
  String get deliveryConfirmPackageLabel => 'Сәлемдеме';

  @override
  String get deliveryConfirmRecipientLabel => 'Алушы';

  @override
  String get deliveryConfirmPaymentLabel => 'Төлем';

  @override
  String get deliveryConfirmPromoLabel => 'Промокод';

  @override
  String get deliveryConfirmDistanceLabel => 'Қашықтық';

  @override
  String get deliveryConfirmDurationLabel => 'Жол уақыты';

  @override
  String get deliveryConfirmPriceLabel => 'Жиыны';

  @override
  String deliveryConfirmDistanceValue(String distance) {
    return '$distance км';
  }

  @override
  String deliveryConfirmDurationValue(int minutes) {
    return '$minutes мин';
  }

  @override
  String get deliveryConfirmOrderAction => 'Курьерге тапсырыс беру';

  @override
  String get deliveryConfirmSearchingTitle => 'Курьер ізделуде';

  @override
  String get deliveryConfirmSearchingSubtitle =>
      'Тапсырыс жасалды. Курьер тапсырысты қабылдаған бойда статус пен трекинг көрсетіледі.';

  @override
  String deliveryConfirmOrderId(String orderId) {
    return 'Тапсырыс нөмірі: $orderId';
  }

  @override
  String get deliveryErrorAddresses =>
      'Жіберуші мен алушы мекенжайларын көрсетіңіз.';

  @override
  String get deliveryErrorDescription => 'Сәлемдеме сипаттамасын қосыңыз.';

  @override
  String get deliveryErrorRecipientName => 'Алушының атын көрсетіңіз.';

  @override
  String get deliveryErrorRecipientPhone => 'Алушының телефонын көрсетіңіз.';

  @override
  String get deliveryErrorVehicle => 'Алдымен курьер түрін таңдаңыз.';

  @override
  String get deliveryErrorCompleteOrder =>
      'Жеткізудің барлық міндетті өрістерін толтырыңыз.';

  @override
  String get activeOrderTitle => 'Белсенді тапсырыс';

  @override
  String get activeOrderStatusSearching => 'Орындаушы ізделуде';

  @override
  String get activeOrderStatusAccepted => 'Орындаушы тапсырысты қабылдады';

  @override
  String get activeOrderStatusArriving => 'Орындаушы сізге қарай келе жатыр';

  @override
  String get activeOrderStatusWaiting => 'Орындаушы күтіп тұр';

  @override
  String get activeOrderStatusInProgress => 'Тапсырыс орындалып жатыр';

  @override
  String get activeOrderStatusCompleted => 'Тапсырыс аяқталды';

  @override
  String get activeOrderStatusCancelled => 'Тапсырыс тоқтатылды';

  @override
  String get activeOrderExecutorPending => 'Орындаушы таңдалып жатыр';

  @override
  String get activeOrderDetailDriver => 'Жүргізуші';

  @override
  String get activeOrderDetailTariff => 'Тариф';

  @override
  String get activeOrderDetailCar => 'Көлік';

  @override
  String get activeOrderDetailFrom => 'Қайдан';

  @override
  String get activeOrderDetailTo => 'Қайда';

  @override
  String get activeOrderDetailPrice => 'Құны';

  @override
  String get activeOrderDetailPhone => 'Телефон';

  @override
  String get activeOrderVehicleNotAssigned =>
      'Көлік тағайындалғаннан кейін көрсетіледі';

  @override
  String get activeOrderChangePaymentAction => 'Төлем тәсілін өзгерту';

  @override
  String get activeOrderCancelAction => 'Тапсырысты тоқтату';

  @override
  String get activeOrderCancelConfirmTitle => 'Тапсырысты тоқтатасыз ба?';

  @override
  String get activeOrderCancelConfirmBody =>
      'Егер сапар немесе жеткізу енді қажет болмаса, тоқтатуды растаңыз.';

  @override
  String get activeOrderCancelConfirmAction => 'Иә, тоқтату';

  @override
  String get activeOrderTrackingFailed =>
      'Тапсырыс жаңартуларына қосылу мүмкін болмады.';

  @override
  String get orderChatTitle => 'Тапсырыс чаты';

  @override
  String get orderChatClosed =>
      'Чат тек белсенді сапар немесе жеткізу кезінде қолжетімді.';

  @override
  String get orderChatInputHint => 'Хабарлама жазыңыз';

  @override
  String get orderChatSendAction => 'Жіберу';

  @override
  String get orderChatEmpty => 'Әзірге хабарламалар жоқ.';

  @override
  String get orderChatLoadFailed => 'Чатты жүктеу мүмкін болмады.';

  @override
  String get orderChatSendFailed => 'Хабарламаны жіберу мүмкін болмады.';

  @override
  String get ratingTitle => 'Сапарды бағалау';

  @override
  String get ratingSubtitle => 'Сапар қалай өтті?';

  @override
  String get ratingAction => 'Бағаны жіберу';

  @override
  String get ratingThanks => 'Рақмет, баға сақталды.';

  @override
  String get historyTitle => 'Тапсырыс тарихы';

  @override
  String get orderHistoryFilterAll => 'Барлығы';

  @override
  String get orderHistoryFilterTaxi => 'Такси';

  @override
  String get orderHistoryFilterDelivery => 'Жеткізу';

  @override
  String get orderHistoryEmpty => 'Тапсырыстар әлі табылған жоқ.';

  @override
  String get orderHistoryLoadMore => 'Тағы жүктеу';

  @override
  String get orderHistoryDetailTitle => 'Тапсырыс деректері';

  @override
  String get orderHistoryStatusLabel => 'Күйі';

  @override
  String get orderHistoryDateLabel => 'Күні';

  @override
  String get orderHistoryRatingLabel => 'Баға';

  @override
  String get orderStatusCompleted => 'Аяқталды';

  @override
  String get orderStatusCancelled => 'Тоқтатылды';

  @override
  String get orderStatusInProgress => 'Орындалуда';

  @override
  String get profileTitle => 'Профиль';

  @override
  String get profileDefaultName => 'Жолаушы';

  @override
  String get profileNameLabel => 'Аты';

  @override
  String get profilePhoneLabel => 'Телефон';

  @override
  String get profileLanguageLabel => 'Интерфейс тілі';

  @override
  String get profileLanguageRu => 'Русский';

  @override
  String get profileLanguageKk => 'Қазақша';

  @override
  String get profileThemeLabel => 'Интерфейс тақырыбы';

  @override
  String get profileThemeLight => 'Жарық';

  @override
  String get profileThemeDark => 'Қараңғы';

  @override
  String get profileThemeSystem => 'Жүйелік';

  @override
  String get profileCurrencyLabel => 'Валюта';

  @override
  String get profileCurrencyKzt => 'Теңге (KZT)';

  @override
  String get profileCurrencyRub => 'Рубль (RUB)';

  @override
  String get profileSignOutAction => 'Аккаунттан шығу';

  @override
  String get paymentsTitle => 'Төлем тәсілдері';

  @override
  String get paymentsEmpty => 'Сақталған карталар әлі жоқ.';

  @override
  String get paymentsAddCardAction => 'Карта қосу';

  @override
  String get paymentsKassa24Provider => 'Касса24';

  @override
  String get paymentsCardLast4Label => 'Картаның соңғы 4 саны';

  @override
  String get paymentsCardHolderLabel => 'Карта иесінің аты';

  @override
  String get paymentsCardAddedMessage => 'Карта Касса24 арқылы қосылды';

  @override
  String get driverOnboardingTitle => 'Орындаушыны тіркеу';

  @override
  String get driverOnboardingSubtitle =>
      'Тапсырыстарды қабылдау үшін профильді толтырып, құжаттарды жүктеңіз.';

  @override
  String get driverOnboardingExecutorTypeLabel => 'Орындаушы рөлі';

  @override
  String get driverOnboardingExecutorTypeDriver => 'Жүргізуші';

  @override
  String get driverOnboardingExecutorTypeCourier => 'Курьер';

  @override
  String get driverOnboardingVehicleLabel => 'Курьер көлігі';

  @override
  String get driverOnboardingVehicleMakeLabel => 'Автокөлік маркасы';

  @override
  String get driverOnboardingVehicleModelLabel => 'Автокөлік моделі';

  @override
  String get driverOnboardingVehicleYearLabel => 'Шығарылған жылы';

  @override
  String get driverOnboardingVehiclePlateLabel => 'Мемлекеттік нөмір';

  @override
  String get driverOnboardingDocumentsLabel => 'Құжаттар';

  @override
  String get driverOnboardingLicenseAction => 'Жүргізуші куәлігі';

  @override
  String get driverOnboardingIdAction => 'Жеке куәлік';

  @override
  String driverOnboardingPhotoSelected(Object fileName) {
    return 'Файл: $fileName';
  }

  @override
  String get driverOnboardingSubmitAction => 'Тексеруге жіберу';

  @override
  String get driverOnboardingNameRequired => 'Орындаушының атын енгізіңіз.';

  @override
  String get driverOnboardingDocumentRequired => 'Кемінде бір құжат қосыңыз.';

  @override
  String get driverOnboardingVehicleRequired => 'Курьер көлігін таңдаңыз.';

  @override
  String get driverOnboardingVehicleDetailsRequired =>
      'Автокөлік маркасын, моделін, шығарылған жылын және мемлекеттік нөмірін толтырыңыз.';

  @override
  String get driverVerificationPendingTitle => 'Профиль тексерілуде';

  @override
  String get driverVerificationPendingDescription =>
      'Профиль тексеріліп жатқанда кіріс тапсырыстар қолжетімсіз. Әкімші мақұлдағаннан кейін онлайн шығуға болады.';

  @override
  String get driverVerificationPendingRefreshAction => 'Статусты жаңарту';

  @override
  String get driverVerificationPendingDemoAction => 'Тест режимін ашу';

  @override
  String get driverDashboardTitle => 'Жұмыс экраны';

  @override
  String get driverDashboardStatusOnline => 'Онлайн';

  @override
  String get driverDashboardStatusOffline => 'Оффлайн';

  @override
  String get driverDashboardBalanceLabel => 'Баланс';

  @override
  String get driverBalanceTopUpTitle => 'Жеке шотты толықтыру';

  @override
  String get driverBalanceTopUpSubtitle =>
      'Өтінім Kaspi шоты үшін әкімшіге түседі';

  @override
  String get driverBalanceTopUpAmountLabel => 'Толықтыру сомасы';

  @override
  String get driverBalanceTopUpPhoneLabel => 'Kaspi шоты үшін телефон';

  @override
  String get driverBalanceTopUpSubmit => 'Өтінім жіберу';

  @override
  String get driverBalanceTopUpSuccess => 'Өтінім әкімшіге жіберілді.';

  @override
  String get driverBalanceTopUpInvalid =>
      '100 ₸ бастап сома мен телефонды көрсетіңіз.';

  @override
  String get driverDashboardModeLabel => 'Режим';

  @override
  String get driverDashboardModeDemo => 'Тест режимі';

  @override
  String get driverDashboardModeVerified => 'Расталған';

  @override
  String get driverDashboardHeartbeatLabel => 'Соңғы байланыс';

  @override
  String get driverDashboardHeatZoneHot => 'Қызу аймақ';

  @override
  String get driverDashboardHeatZoneWarm => 'Белсенді аймақ';

  @override
  String get driverDashboardHeatZoneCool => 'Тыныш аймақ';

  @override
  String get driverDashboardWaitingOffer =>
      'Жүргізуші онлайн болғанда кіріс тапсырыстар осы жерде пайда болады.';

  @override
  String get driverDashboardOpenActiveOrder => 'Белсенді тапсырысты ашу';

  @override
  String get driverIncomingOrderTitle => 'Жаңа тапсырыс';

  @override
  String get driverIncomingOrderAccept => 'Қабылдау';

  @override
  String get driverIncomingOrderReject => 'Бас тарту';

  @override
  String driverIncomingOrderCountdown(int seconds) {
    return '$seconds сек ішінде жауап беріңіз';
  }

  @override
  String get driverIncomingOrderPickupLabel => 'Алу нүктесі';

  @override
  String get driverIncomingOrderDestinationLabel => 'Бару нүктесі';

  @override
  String get driverIncomingOrderPriceLabel => 'Табыс';

  @override
  String get driverIncomingOrderDistanceLabel => 'Қашықтық';

  @override
  String get driverIncomingOrderDurationLabel => 'Уақыт';

  @override
  String get driverIncomingOrderClientLabel => 'Клиент';

  @override
  String get driverActiveOrderTitle => 'Орындаушының белсенді тапсырысы';

  @override
  String get driverActiveOrderNavigationAction => 'Навигатор';

  @override
  String get driverActiveOrderNavigationTitle => 'Маршрутты ашу';

  @override
  String get driverActiveOrderNavigationBrowser => 'Браузерде';

  @override
  String get driverActiveOrderNavigationUnavailable =>
      'Картаны ашу мүмкін болмады';

  @override
  String get driverActiveOrderPickupLabel => 'Алу мекені';

  @override
  String get driverActiveOrderDestinationLabel => 'Жеткізу мекені';

  @override
  String get driverActiveOrderMeterTitle => 'Таксометр';

  @override
  String get driverActiveOrderMeterMinimum => 'Минималды құн';

  @override
  String get driverActiveOrderMeterDistance => 'Нақты қашықтық';

  @override
  String get driverActiveOrderMeterPrice => 'Ағымдағы құн';

  @override
  String get driverActiveOrderClientLabel => 'Клиент байланысы';

  @override
  String get driverActiveOrderPhoneLabel => 'Телефон';

  @override
  String get driverActiveOrderPaymentLabel => 'Төлем';

  @override
  String get driverActiveOrderPrimaryArrived => 'Орнында';

  @override
  String get driverActiveOrderPrimaryStart => 'Бастау';

  @override
  String get driverActiveOrderPrimaryComplete => 'Аяқтау';

  @override
  String get driverActiveOrderDeliveryPickup => 'Алып кетті';

  @override
  String get driverActiveOrderDeliveryTransit => 'Жолда';

  @override
  String get driverActiveOrderDeliveryAtDoor => 'Есіктің алдында';

  @override
  String get driverActiveOrderDeliveryDelivered => 'Табыс етті';

  @override
  String get driverActiveOrderDeliveryFailed => 'Тапсыра алмады';

  @override
  String get driverActiveOrderRecipientCodeLabel => 'Алушы коды';

  @override
  String get driverActiveOrderProofPhotoAction => 'Растау фотосын қосу';

  @override
  String get driverActiveOrderStatusAccepted => 'Тапсырыс қабылданды';

  @override
  String get driverActiveOrderStatusWaiting => 'Орнында';

  @override
  String get driverActiveOrderStatusInProgress => 'Орындалуда';

  @override
  String get driverActiveOrderStatusPickedUp => 'Сәлемдеме алынды';

  @override
  String get driverActiveOrderStatusInTransit => 'Жолда';

  @override
  String get driverActiveOrderStatusAtDoor => 'Есіктің алдында';

  @override
  String get driverActiveOrderStatusCompleted => 'Аяқталды';

  @override
  String get driverActiveOrderStatusFailed => 'Тапсырылмады';

  @override
  String get driverEarningsTitle => 'Табыс';

  @override
  String get driverHistoryTitle => 'Сапарлар тарихы';

  @override
  String get driverDefaultName => 'Алексей';

  @override
  String get driverDefaultCar => 'Автокөлік көрсетілмеген';

  @override
  String get driverPeriodDay => 'Күн';

  @override
  String get driverPeriodWeek => 'Апта';

  @override
  String get driverPeriodMonth => 'Ай';

  @override
  String get driverCompletedFilter => 'Аяқталған';

  @override
  String get driverCancelledFilter => 'Бас тартылған';

  @override
  String get driverRatingLabel => 'Рейтинг';

  @override
  String get driverActivityLabel => 'Белсенділік';

  @override
  String get driverTripsLabel => 'Сапарлар';

  @override
  String get driverCarLabel => 'Автомобиль';

  @override
  String get driverOrdersLabel => 'Тапсырыстар';

  @override
  String get driverBonusesLabel => 'Бонустар';

  @override
  String get driverTipsLabel => 'Шайпұл';

  @override
  String get commonSupport => 'Қолдау';

  @override
  String get commonSettings => 'Баптаулар';

  @override
  String get commonInviteFriends => 'Достарды шақыру';

  @override
  String get commonInviteBonusSubtitle => 'Бонустар алыңыз';

  @override
  String get commonAboutApp => 'Қолданба туралы';

  @override
  String get commonSafety => 'Қауіпсіздік';

  @override
  String get commonCurrentLocation => 'Ағымдағы орналасу';

  @override
  String get commonContinue => 'Жалғастыру';

  @override
  String get commonCancel => 'Бас тарту';

  @override
  String get commonSave => 'Сақтау';

  @override
  String get commonTotal => 'Жиыны';

  @override
  String get commonClose => 'Жабу';

  @override
  String get commonNotSpecified => 'Көрсетілмеген';

  @override
  String get legalTitle => 'Құқықтық ақпарат';

  @override
  String get legalPrivacyTitle => 'Құпиялық саясаты';

  @override
  String get legalPrivacySubtitle =>
      'DOS телефон, геолокация, тапсырыс және хабарлама деректерін қалай өңдейді.';

  @override
  String get legalTermsTitle => 'Пайдалану шарттары';

  @override
  String get legalTermsSubtitle =>
      'Жолаушылар, жүргізушілер және курьерлер үшін сервисті пайдалану ережелері.';

  @override
  String get legalOpenWeb => 'Веб-нұсқасын ашу';

  @override
  String get legalPrivacyBody =>
      'DOS кіру үшін телефон нөмірін, мекенжай мен орындаушыны таңдау үшін геолокацияны, сапарлар мен жеткізуді орындау үшін тапсырыс деректерін, ал мәртебе хабарламалары үшін push-токендерді пайдаланады. Деректер тек сервис жұмысы, қолдау, қауіпсіздік және заң талаптары үшін қолданылады.';

  @override
  String get legalTermsBody =>
      'DOS қолдана отырып, пайдаланушы профиль деректерінің дұрыстығын растайды, сервис ережелерін сақтайды және баға, тапсырыс мәртебелері, жүргізуші балансы мен тарифтердің қолжетімділігі платформа және әкімші арқылы басқарылатынын қабылдайды.';

  @override
  String get accountDeleteTitle => 'Аккаунтты жою';

  @override
  String get accountDeleteSubtitle =>
      'Аккаунт бұғатталады, жеке деректер иесіздендіріледі, белсенді сессиялар аяқталады.';

  @override
  String get accountDeleteConfirmTitle => 'Аккаунтты жою керек пе?';

  @override
  String get accountDeleteConfirmBody =>
      'Бұл әрекетті қайтару мүмкін емес. Тапсырыс тарихы есептілік және заң талаптары үшін жүйеде иесіздендірілген түрде қалады.';

  @override
  String get accountDeleteAction => 'Аккаунтты жою';

  @override
  String get accountDeleteFailed =>
      'Аккаунтты жою мүмкін болмады. Кейінірек қайталап көріңіз немесе қолдауға хабарласыңыз.';

  @override
  String get profileNameRequired => 'Аты кемінде 2 таңбадан тұруы керек.';

  @override
  String get driverProfilePersonalSubtitle => 'Жүргізушінің негізгі деректері';

  @override
  String get driverProfileReviewNotice =>
      'Деректер өзгергеннен кейін профиль әкімші тексеруіне қайта жіберіледі. Мақұлданғанға дейін тапсырыстар қолжетімсіз.';

  @override
  String get driverProfileSaveSuccess =>
      'Деректер сақталды. Профиль тексеруге жіберілді.';

  @override
  String get driverProfileVehicleSubtitle =>
      'Автокөлік деректері және ашылған класс';

  @override
  String get driverVehicleSettingsTitle => 'Автокөлік баптаулары';

  @override
  String get driverVehicleColorLabel => 'Автокөлік түсі';

  @override
  String get driverTariffsTitle => 'Қолжетімді тарифтер';

  @override
  String get driverVehicleSaveSuccess =>
      'Автокөлік пен тарифтер сақталды. Профиль тексеруге жіберілді.';

  @override
  String get driverProfileDocumentsSubtitle => 'Құжаттарды тексеру мәртебесі';

  @override
  String get driverProfileSupportSubtitle =>
      'Тапсырыстар мен аккаунт бойынша көмек';

  @override
  String get driverProfileSettingsSubtitle => 'Тіл, режим және шығу';

  @override
  String get driverProfileVerificationStatusLabel => 'Тексеру мәртебесі';

  @override
  String get driverProfileServiceClassLabel => 'Қызмет класы';

  @override
  String get driverProfileSupportPhoneLabel => 'Қолдау телефоны';

  @override
  String get driverProfileSupportPhoneValue => '+7 (700) 000-00-00';

  @override
  String get driverProfileSupportChatLabel => 'Қолдау чаты';

  @override
  String get driverProfileSupportChatValue =>
      'Операторға админ-панельде жазыңыз';

  @override
  String get driverProfileAppVersionLabel => 'Қолданба нұсқасы';

  @override
  String get driverProfileAppVersionValue => '1.0.1';

  @override
  String get promoApplyAction => 'Қолдану';

  @override
  String get promoApplied => 'Промокод қолданылды';

  @override
  String get promoOriginalPrice => 'Жеңілдіксіз';

  @override
  String get promoDiscount => 'Жеңілдік';

  @override
  String get promoTotal => 'Барлығы';

  @override
  String get promoNotFound =>
      'Промокод табылмады. Дұрыс жазылғанын тексеріңіз.';

  @override
  String get promoInactive => 'Бұл промокод өшірілген.';

  @override
  String get promoExpired => 'Промокодтың жарамдылық мерзімі аяқталды.';

  @override
  String get promoLimitReached => 'Промокодты қолдану шегі таусылды.';

  @override
  String get promoUnavailable =>
      'Жеңілдік қолданылмады. Басқа промокодты қолданып көріңіз.';

  @override
  String get driverBonusUnavailable => 'Бонус шарттарын жүктеу мүмкін болмады';

  @override
  String get driverBonusDisabled => 'Бонус бағдарламасы қазір өшірілген';

  @override
  String get driverBonusRefresh => 'Бонус барысын жаңарту';

  @override
  String driverBonusConditions(int orders, String amount) {
    return 'Әрбір $orders аяқталған тапсырыс үшін — $amount';
  }

  @override
  String driverBonusProgress(int completed, int required, int remaining) {
    return '$required тапсырыстың $completed орындалды. Қалғаны: $remaining.';
  }
}
