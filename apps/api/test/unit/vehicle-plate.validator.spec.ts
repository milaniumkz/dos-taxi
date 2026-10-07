import "reflect-metadata";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { UpdateExecutorProfileDto } from "../../src/modules/executors/dto/update-executor-profile.dto";

describe("Vehicle plate registration", () => {
  it.each([
    "F261411",
    "F 2025 11",
    "AB-123-CD",
    "沪A12345",
    "١٢٣٤أب",
    "1234567",
    "A1",
    "F2614112345",
    "A123BCD",
    "123ABC01",
    "123AB01",
    "A123BC777",
    " а-123-вс 777 ",
  ])("accepts the supported real plate format %s", async (plate) => {
    const dto = plainToInstance(UpdateExecutorProfileDto, {
      vehiclePlate: plate,
    });
    expect(await validate(dto)).toEqual([]);
  });
  it.each(["AAA!!!", "<script>", "A".repeat(21), "😀123"])(
    "rejects invalid plate %s",
    async (plate) => {
      const dto = plainToInstance(UpdateExecutorProfileDto, {
        vehiclePlate: plate,
      });
      expect((await validate(dto)).length).toBeGreaterThan(0);
    },
  );
  it("accepts explicitly selected together and child tariffs", async () => {
    const dto = plainToInstance(UpdateExecutorProfileDto, {
      enabledTariffs: ["together", "child"],
    });
    expect(await validate(dto)).toEqual([]);
  });
});
