import { ConfigService } from "@nestjs/config";
import { YandexGeocoderAdapter } from "./yandex-geocoder.adapter";
import { fetchWithProxy } from "../../../shared/http/fetch-with-proxy";
jest.mock("../../../shared/http/fetch-with-proxy");
const request = jest.mocked(fetchWithProxy);
describe("Yandex reverse fallback", () => {
  beforeEach(() => jest.resetAllMocks());
  it("does not call the provider without a configured key", async () => {
    expect(
      await new YandexGeocoderAdapter(new ConfigService()).reverseGeocode(
        52.3,
        77.1,
      ),
    ).toBeNull();
    expect(request).not.toHaveBeenCalled();
  });
  it("passes longitude before latitude and maps a real address", async () => {
    request.mockResolvedValue({
      ok: true,
      json: async () => ({
        response: {
          GeoObjectCollection: {
            featureMember: [
              {
                GeoObject: {
                  name: "Ауэзова 8",
                  Point: { pos: "77.1279 52.3231" },
                },
              },
            ],
          },
        },
      }),
    } as Response);
    const result = await new YandexGeocoderAdapter(
      new ConfigService({ YANDEX_GEOCODER_API_KEY: "test-key" }),
    ).reverseGeocode(52.3, 77.1);
    expect((request.mock.calls[0][0] as URL).searchParams.get("geocode")).toBe(
      "77.1,52.3",
    );
    expect(result).toMatchObject({
      title: "Ауэзова 8",
      lat: 52.3231,
      lng: 77.1279,
    });
  });
});
