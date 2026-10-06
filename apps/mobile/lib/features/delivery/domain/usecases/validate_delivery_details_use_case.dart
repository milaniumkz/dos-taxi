import '../../../../core/errors/failure.dart';
import '../../../../core/utils/app_formatters.dart';

class ValidateDeliveryDetailsParams {
  const ValidateDeliveryDetailsParams({
    required this.packageDescription,
    required this.contactName,
    required this.contactPhone,
  });

  final String packageDescription;
  final String contactName;
  final String contactPhone;
}

class ValidateDeliveryDetailsUseCase {
  const ValidateDeliveryDetailsUseCase();

  Failure? call(ValidateDeliveryDetailsParams params) {
    if (params.packageDescription.trim().isEmpty) {
      return const Failure(
        code: 'DELIVERY_DESCRIPTION_REQUIRED',
        message: 'Укажите описание посылки',
      );
    }

    if (params.contactName.trim().isEmpty) {
      return const Failure(
        code: 'DELIVERY_RECIPIENT_NAME_REQUIRED',
        message: 'Укажите имя получателя',
      );
    }

    if (!AppFormatters.isCompleteKazakhstanPhone(params.contactPhone)) {
      return const Failure(
        code: 'DELIVERY_RECIPIENT_PHONE_REQUIRED',
        message: 'Укажите телефон получателя',
      );
    }

    return null;
  }
}
