import { ConfigService } from "@nestjs/config";
import { OsrmAdapter } from "./osrm.adapter";
import { fetchWithProxy } from "../../../shared/http/fetch-with-proxy";
jest.mock("../../../shared/http/fetch-with-proxy");
const fetchMock = jest.mocked(fetchWithProxy);
describe("OSRM road maneuvers", () => {
  const points = [
    { lat: 46.8, lng: 61.67 },
    { lat: 46.81, lng: 61.64 },
  ];
  const payload = {
    routes: [
      {
        distance: 1200,
        duration: 180,
        geometry: {
          coordinates: [
            [61.67, 46.8],
            [61.66, 46.81],
            [61.64, 46.81],
          ],
        },
        legs: [
          {
            steps: [
              {
                distance: 400,
                name: "",
                maneuver: { type: "depart", location: [61.67, 46.8] },
              },
              {
                distance: 800,
                name: "Абай",
                maneuver: {
                  type: "turn",
                  modifier: "left",
                  location: [61.66, 46.81],
                  bearing_after: 270,
                },
              },
              {
                distance: 0,
                name: "",
                maneuver: { type: "arrive", location: [61.64, 46.81] },
              },
            ],
          },
        ],
      },
    ],
  };
  beforeEach(() => {
    jest.clearAllMocks();
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => payload,
    } as Response);
  });
  it("requests full driving geometry and returns cumulative language-neutral maneuvers", async () => {
    const result = await new OsrmAdapter(new ConfigService()).route(
      points,
      true,
    );
    expect((fetchMock.mock.calls[0][0] as URL).searchParams.get("steps")).toBe(
      "true",
    );
    expect(result.points[0]).toEqual(points[0]);
    expect(result.maneuvers?.map((m) => m.distanceFromStartMeters)).toEqual([
      0, 400, 1200,
    ]);
    expect(result.maneuvers?.[1]).toMatchObject({
      type: "turn",
      modifier: "left",
      roadName: "Абай",
      bearingAfter: 270,
    });
  });
  it("reports provider transport and timeout failures with a stable error code", async () => {
    fetchMock.mockRejectedValue(new Error("timeout"));
    await expect(
      new OsrmAdapter(new ConfigService()).route(points, true),
    ).rejects.toMatchObject({ response: { code: "GEO_PROVIDER_UNAVAILABLE" } });
  });
  it("preserves the old geometry-only API", async () => {
    const result = await new OsrmAdapter(new ConfigService()).route(points);
    expect((fetchMock.mock.calls[0][0] as URL).searchParams.get("steps")).toBe(
      "false",
    );
    expect(result.maneuvers).toBeUndefined();
  });
  it("does not invent a straight-line navigation route when steps are unavailable", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        routes: [
          { distance: 100, duration: 20, geometry: { coordinates: [] } },
        ],
      }),
    } as Response);
    await expect(
      new OsrmAdapter(new ConfigService()).route(points, true),
    ).rejects.toMatchObject({ response: { code: "GEO_ROUTE_UNAVAILABLE" } });
  });
});
