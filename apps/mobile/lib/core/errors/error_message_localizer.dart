import '../l10n/app_localizations.dart';

class ErrorMessageLocalizer {
  const ErrorMessageLocalizer._();

  static String resolve(AppLocalizations l10n, String? codeOrMessage) {
    final raw = codeOrMessage?.trim();
    if (raw == null || raw.isEmpty) {
      return _pick(
        l10n,
        ru: 'Что-то пошло не так',
        kk: 'Бірдеңе дұрыс болмады',
      );
    }

    final key = raw.toUpperCase();
    switch (key) {
      case 'PROMO_CODE_NOT_FOUND':
        return l10n.promoNotFound;
      case 'PROMO_CODE_INACTIVE':
        return l10n.promoInactive;
      case 'PROMO_CODE_EXPIRED':
        return l10n.promoExpired;
      case 'PROMO_CODE_LIMIT_REACHED':
        return l10n.promoLimitReached;
      case 'PROMO_CODE_INVALID_DISCOUNT':
      case 'PROMO_CODE_INVALID_PRICE':
        return l10n.promoUnavailable;
    }
    final normalized = raw.toLowerCase();
    final isKk = l10n.localeName.toLowerCase().startsWith('kk');

    String pick({required String ru, required String kk}) => isKk ? kk : ru;

    switch (key) {
      case 'API_ERROR':
      case 'UNKNOWN_ERROR':
        return pick(
          ru: 'Не удалось выполнить действие. Попробуйте ещё раз.',
          kk: 'Әрекетті орындау мүмкін болмады. Қайталап көріңіз.',
        );
      case 'NETWORK_TIMEOUT':
        return pick(
          ru: 'Сервер долго не отвечает. Проверьте интернет и попробуйте ещё раз.',
          kk: 'Сервер ұзақ жауап бермеді. Интернетті тексеріп, қайталап көріңіз.',
        );
      case 'NETWORK_UNAVAILABLE':
        return pick(
          ru: 'Нет подключения к интернету.',
          kk: 'Интернет байланысы жоқ.',
        );
      case 'UNAUTHORIZED':
      case 'AUTH_UNAUTHORIZED':
        return pick(
          ru: 'Сессия истекла. Войдите заново.',
          kk: 'Сессия аяқталды. Қайта кіріңіз.',
        );
      case 'AUTH_OTP_INVALID':
      case 'OTP_INVALID':
      case 'AUTH_VERIFY_FAILED':
        return pick(
          ru: 'Неверный SMS-код. Проверьте код и попробуйте ещё раз.',
          kk: 'SMS коды қате. Кодты тексеріп, қайта енгізіңіз.',
        );
      case 'AUTH_OTP_EXPIRED':
      case 'OTP_EXPIRED':
        return pick(
          ru: 'SMS-код истёк. Запросите новый код.',
          kk: 'SMS кодының мерзімі өтті. Жаңа код сұраңыз.',
        );
      case 'OTP_RATE_LIMITED':
      case 'AUTH_OTP_RATE_LIMITED':
      case 'TOO_MANY_REQUESTS':
        return pick(
          ru: 'Слишком много попыток. Подождите немного и попробуйте снова.',
          kk: 'Тым көп әрекет жасалды. Біраз күтіп, қайта көріңіз.',
        );
      case 'OTP_DELIVERY_FAILED':
      case 'AUTH_OTP_DELIVERY_FAILED':
        return pick(
          ru: 'Не удалось отправить SMS-код. Проверьте номер и попробуйте ещё раз.',
          kk: 'SMS кодын жіберу мүмкін болмады. Нөмірді тексеріп, қайта көріңіз.',
        );
      case 'VALIDATION_ERROR':
      case 'REQUEST_VALIDATION_FAILED':
        return pick(
          ru: 'Проверьте заполненные данные и попробуйте ещё раз.',
          kk: 'Толтырылған деректерді тексеріп, қайталап көріңіз.',
        );
      case 'CITY_NOT_FOUND':
        return pick(
          ru: 'Город обслуживания не найден. Выберите точку на карте ещё раз.',
          kk: 'Қызмет көрсету қаласы табылмады. Картадан нүктені қайта таңдаңыз.',
        );
      case 'TARIFF_NOT_FOUND':
        return pick(
          ru: 'Для этого направления тариф пока не настроен. Попробуйте другой класс или обратитесь в поддержку.',
          kk: 'Бұл бағыт үшін тариф әлі бапталмаған. Басқа класты таңдаңыз немесе қолдауға хабарласыңыз.',
        );
      case 'ORDER_ROUTE_OUTSIDE_SERVICE_ZONE':
      case 'ORDER_PICKUP_OUTSIDE_SERVICE_ZONE':
        return pick(
          ru: 'Адрес находится вне зоны обслуживания. Выберите точку внутри города.',
          kk: 'Мекенжай қызмет көрсету аймағынан тыс. Қала ішіндегі нүктені таңдаңыз.',
        );
      case 'ORDER_ROUTE_INVALID':
      case 'TAXI_ORDER_INCOMPLETE':
        return pick(
          ru: 'Укажите адрес подачи и адрес назначения.',
          kk: 'Жіберу және бару мекенжайын көрсетіңіз.',
        );
      case 'ORDER_ADDRESS_NOT_FOUND':
        return pick(
          ru: 'Адрес не найден. Уточните запрос или выберите точку на карте.',
          kk: 'Мекенжай табылмады. Сұрауды нақтылаңыз немесе картадан нүктені таңдаңыз.',
        );
      case 'ORDER_MANUAL_ADDRESS_NEEDS_POINT':
        return pick(
          ru: 'Сначала выберите точку на карте, затем укажите адрес вручную.',
          kk: 'Алдымен картадан нүктені таңдаңыз, содан кейін мекенжайды қолмен енгізіңіз.',
        );
      case 'ACTIVE_ORDER_TRACKING_FAILED':
        return pick(
          ru: 'Заказ создан. Обновления статуса временно задерживаются, экран обновится автоматически.',
          kk: 'Тапсырыс жасалды. Мәртебе жаңартулары уақытша кешігуде, экран автоматты түрде жаңарады.',
        );
      case 'ACTIVE_ORDER_FETCH_FAILED':
        return pick(
          ru: 'Не удалось обновить активный заказ. Проверьте интернет или откройте заказ заново.',
          kk: 'Белсенді тапсырысты жаңарту мүмкін болмады. Интернетті тексеріңіз немесе тапсырысты қайта ашыңыз.',
        );
      case 'ORDER_NOT_FOUND':
      case 'CLIENT_ACTIVE_ORDER_NOT_FOUND':
      case 'EXECUTOR_ACTIVE_ORDER_NOT_FOUND':
        return pick(
          ru: 'Активный заказ не найден.',
          kk: 'Белсенді тапсырыс табылмады.',
        );
      case 'INVALID_STATUS_TRANSITION':
        return pick(
          ru: 'Статус заказа уже изменился. Обновите экран.',
          kk: 'Тапсырыс мәртебесі өзгеріп кетті. Экранды жаңартыңыз.',
        );
      case 'EXECUTOR_BALANCE_TOO_LOW':
        return pick(
          ru: 'Баланс водителя меньше 100 ₸. Пополните баланс, чтобы получать заказы.',
          kk: 'Жүргізуші балансы 100 ₸-ден аз. Тапсырыс алу үшін балансты толықтырыңыз.',
        );
      case 'EXECUTOR_NOT_VERIFIED':
        return pick(
          ru: 'Профиль водителя ещё не одобрен администратором.',
          kk: 'Жүргізуші профилін әкімші әлі растаған жоқ.',
        );
      case 'PAYMENT_METHOD_INVALID':
        return pick(
          ru: 'Выберите доступный способ оплаты.',
          kk: 'Қолжетімді төлем тәсілін таңдаңыз.',
        );
    }

    if (normalized.contains('no active tariff')) {
      return resolve(l10n, 'TARIFF_NOT_FOUND');
    }
    if (normalized.contains('outside service zone') ||
        normalized.contains('route point is outside service zone')) {
      return resolve(l10n, 'ORDER_ROUTE_OUTSIDE_SERVICE_ZONE');
    }
    if (normalized.contains('unauthorized')) {
      return resolve(l10n, 'UNAUTHORIZED');
    }
    if (normalized.contains('request validation failed') ||
        normalized.contains('bad request')) {
      return resolve(l10n, 'REQUEST_VALIDATION_FAILED');
    }
    if (normalized.contains('too many otp') ||
        normalized.contains('too many requests')) {
      return resolve(l10n, 'TOO_MANY_REQUESTS');
    }
    if (normalized.contains('failed to confirm') ||
        normalized.contains('verify code')) {
      return resolve(l10n, 'AUTH_VERIFY_FAILED');
    }
    if (normalized.contains('internal server error')) {
      return pick(
        ru: 'Ошибка сервера. Попробуйте ещё раз или обратитесь в поддержку.',
        kk: 'Сервер қатесі. Қайталап көріңіз немесе қолдауға хабарласыңыз.',
      );
    }

    return raw;
  }

  static String _pick(
    AppLocalizations l10n, {
    required String ru,
    required String kk,
  }) => l10n.localeName.toLowerCase().startsWith('kk') ? kk : ru;
}
