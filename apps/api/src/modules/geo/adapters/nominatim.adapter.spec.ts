import { ConfigService } from "@nestjs/config";
import { NominatimAdapter } from "./nominatim.adapter";
import { fetchWithProxy } from "../../../shared/http/fetch-with-proxy";
jest.mock("../../../shared/http/fetch-with-proxy");
const request = jest.mocked(fetchWithProxy);
describe("Nominatim failure handling", () => {
  beforeEach(() => jest.resetAllMocks());
  it("uses an identifiable agent and a bounded request", async () => {
    request.mockResolvedValue({
      ok: true,
      json: async () => ({
        lat: "52.3230675",
        lon: "77.1279019",
        address: { road: "Ауэзова", house_number: "8" },
      }),
    } as Response);
    const result = await new NominatimAdapter(
      new ConfigService(),
    ).reverseGeocode(52.323063965, 77.12787443);
    expect(result.title).toBe("Ауэзова 8");
    expect(request.mock.calls[0][1]).toMatchObject({
      signal: expect.any(AbortSignal),
      headers: {
        "User-Agent": expect.stringContaining("github.com/milaniumkz/dos-taxi"),
      },
    });
  });
  it.each([403, 429, 503])(
    "normalizes HTTP %s for the fallback chain",
    async (status) => {
      request.mockResolvedValue({ ok: false, status } as Response);
      await expect(
        new NominatimAdapter(new ConfigService()).reverseGeocode(52.3, 77.1),
      ).rejects.toMatchObject({
        response: { code: "GEO_PROVIDER_UNAVAILABLE" },
      });
    },
  );
  it("normalizes transport failures", async () => {
    request.mockRejectedValue(new Error("timeout"));
    await expect(
      new NominatimAdapter(new ConfigService()).reverseGeocode(52.3, 77.1),
    ).rejects.toMatchObject({ response: { code: "GEO_PROVIDER_UNAVAILABLE" } });
  });
  it("rejects malformed provider coordinates", async () => {
    request.mockResolvedValue({
      ok: true,
      json: async () => ({ error: "Unable to geocode" }),
    } as Response);
    await expect(
      new NominatimAdapter(new ConfigService()).reverseGeocode(52.3, 77.1),
    ).rejects.toMatchObject({ response: { code: "GEO_PROVIDER_UNAVAILABLE" } });
  });
});
