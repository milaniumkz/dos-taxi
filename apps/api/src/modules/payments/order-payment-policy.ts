import { PaymentMethod } from "@dos/shared-types";
import { BadRequestException } from "@nestjs/common";

type PaymentCity = { nameRu: string; nameKk: string };
export function availableOrderPaymentMethods(
  city: PaymentCity,
): PaymentMethod[] {
  const methods = [
    PaymentMethod.CASH,
    PaymentMethod.TRANSFER_KASPI,
    PaymentMethod.TRANSFER_HALYK,
  ];
  if (
    [city.nameRu, city.nameKk].some((name) =>
      ["байконур", "байқоңыр", "baikonur"].includes(name.trim().toLowerCase()),
    )
  ) {
    methods.push(PaymentMethod.TRANSFER_PSB);
  }
  return methods;
}
export function assertOrderPaymentAllowed(
  city: PaymentCity,
  method: PaymentMethod,
): void {
  if (
    method === PaymentMethod.TRANSFER_PSB &&
    !availableOrderPaymentMethods(city).includes(method)
  ) {
    throw new BadRequestException({
      code: "PAYMENT_METHOD_UNAVAILABLE",
      message: "ПСБ доступен только в Байконуре.",
    });
  }
}
