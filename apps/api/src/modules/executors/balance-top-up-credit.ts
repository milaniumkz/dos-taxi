import { Currency } from "@dos/shared-types";
import { BadRequestException } from "@nestjs/common";

/** Payment is KZT; credit is in the wallet currency, rounded once to cents. */
export function balanceTopUpCredit(
  amount: string | number,
  currency: Currency,
  kztPerRub: string | number,
) {
  const minor = Math.round(Number(amount) * 100);
  const rate = currency === Currency.RUB ? Number(kztPerRub) : 1;
  const rateUnits = Math.round(rate * 10000);
  if (
    !Number.isSafeInteger(minor) ||
    minor <= 0 ||
    minor > 999999999999 ||
    ![Currency.KZT, Currency.RUB].includes(currency) ||
    !Number.isSafeInteger(rateUnits) ||
    rateUnits <= 0
  ) {
    throw new BadRequestException({
      code: "BALANCE_TOP_UP_CONVERSION_INVALID",
      message: "BALANCE_TOP_UP_CONVERSION_INVALID",
    });
  }
  const creditedMinor = Number(
    (BigInt(minor) * 10000n + BigInt(rateUnits) / 2n) / BigInt(rateUnits),
  );
  if (creditedMinor <= 0 || creditedMinor > 999999999999) {
    throw new BadRequestException({
      code: "BALANCE_TOP_UP_CONVERSION_INVALID",
      message: "BALANCE_TOP_UP_CONVERSION_INVALID",
    });
  }
  return {
    paymentCurrency: Currency.KZT,
    creditedCurrency: currency,
    creditedAmount: (creditedMinor / 100).toFixed(2),
    exchangeRate: rate.toFixed(4),
  };
}
