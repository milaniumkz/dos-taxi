import { Currency } from "@dos/shared-types";
import { balanceTopUpCredit } from "../../src/modules/executors/balance-top-up-credit";
describe("KZT payment to wallet conversion", () => {
  it("rounds positive RUB credits once, and leaves KZT credits unchanged", () => {
    expect(balanceTopUpCredit("1000.00", Currency.RUB, "7")).toMatchObject({
      creditedAmount: "142.86",
      exchangeRate: "7.0000",
      creditedCurrency: Currency.RUB,
      paymentCurrency: Currency.KZT,
    });
    expect(
      balanceTopUpCredit("1000.00", Currency.RUB, "8").creditedAmount,
    ).toBe("125.00");
    expect(
      balanceTopUpCredit("1000.00", Currency.KZT, "7").creditedAmount,
    ).toBe("1000.00");
    expect(balanceTopUpCredit("0.01", Currency.RUB, "0.5").creditedAmount).toBe(
      "0.02",
    );
  });
  it("rejects zero/negative/invalid rates and amounts without silently crediting zero", () => {
    for (const rate of ["0", "-7", "NaN"])
      expect(() => balanceTopUpCredit("1000", Currency.RUB, rate)).toThrow();
    for (const amount of ["0", "-100", "NaN", "0.01"])
      expect(() => balanceTopUpCredit(amount, Currency.RUB, "7")).toThrow();
  });
});
