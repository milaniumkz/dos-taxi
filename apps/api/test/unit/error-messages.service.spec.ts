import { DataSource } from "typeorm";
import { ErrorMessagesService } from "../../src/modules/error-messages/error-messages.service";

describe("editable server error catalog", () => {
  it("saves an override and applies it to both public catalog and error responses", async () => {
    let rows: Record<string, unknown>[] = [];
    const query = jest.fn(async (sql: string, params?: string[]) => {
      if (sql.startsWith("INSERT")) {
        rows = [
          {
            code: params![0],
            message_ru: params![1],
            message_kk: params![2],
            updated_at: new Date(),
          },
        ];
        return [];
      }
      return rows;
    });
    const service = new ErrorMessagesService({
      query,
    } as unknown as DataSource);
    expect((await service.catalog()).messages.ru.TARIFF_NOT_FOUND).toContain(
      "тариф",
    );
    await service.update(
      "TARIFF_NOT_FOUND",
      "Выберите другой тариф",
      "Басқа тарифті таңдаңыз",
    );
    expect(await service.message("TARIFF_NOT_FOUND", "legacy", "ru")).toBe(
      "Выберите другой тариф",
    );
    expect(await service.message("TARIFF_NOT_FOUND", "legacy", "kk-KZ")).toBe(
      "Басқа тарифті таңдаңыз",
    );
    expect(query.mock.calls[1][1]).toEqual([
      "TARIFF_NOT_FOUND",
      "Выберите другой тариф",
      "Басқа тарифті таңдаңыз",
    ]);
    await expect(service.update("unknown", "x", "y")).rejects.toThrow();
  });
  it("still reports errors during a database outage", async () => {
    const service = new ErrorMessagesService({
      query: jest.fn().mockRejectedValue(new Error("database unavailable")),
    } as unknown as DataSource);
    expect(await service.message("NETWORK_UNAVAILABLE", "legacy")).toContain(
      "интернет",
    );
    await expect(
      service.update("NETWORK_UNAVAILABLE", "x", "y"),
    ).rejects.toThrow("database unavailable");
  });
});
