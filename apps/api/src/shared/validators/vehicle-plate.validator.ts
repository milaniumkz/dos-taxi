export const vehiclePlatePattern =
  /^(?:[A-Z]\d{6}|[A-Z]\d{3}[A-Z]{3}|\d{3}[A-Z]{2,3}\d{2}|[A-Z]\d{3}[A-Z]{2}\d{2}|[ABEKMHOPCTYX]\d{3}[ABEKMHOPCTYX]{2}\d{2,3})$/;

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
