// Accept international registrations without imposing a country-specific layout.
export const vehiclePlatePattern = /^[\p{L}\p{N}]{1,20}$/u;

const cyrillicPlateLetters: Record<string, string> = {
  А: "A",
  В: "B",
  Е: "E",
  К: "K",
  М: "M",
  Н: "H",
  О: "O",
  Р: "P",
  С: "C",
  Т: "T",
  У: "Y",
  Х: "X",
};

export function normalizeVehiclePlate(value: unknown): unknown {
  if (typeof value !== "string") {
    return value;
  }

  return value
    .replace(/[\s-]/g, "")
    .toUpperCase()
    .replace(/[АВЕКМНОРСТУХ]/g, (letter) => cyrillicPlateLetters[letter]);
}
