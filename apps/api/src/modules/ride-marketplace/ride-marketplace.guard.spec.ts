import { ConfigService } from "@nestjs/config";
import { RideMarketplaceGuard } from "./ride-marketplace.guard";
describe("ride marketplace rollout flag", () => {
  it("enables the authorized new flow by default and allows pausing only the new endpoints", () => {
    expect(new RideMarketplaceGuard(new ConfigService()).canActivate()).toBe(
      true,
    );
    expect(() =>
      new RideMarketplaceGuard(
        new ConfigService({ FEATURE_RIDE_MARKETPLACE: "false" }),
      ).canActivate(),
    ).toThrow("Service temporarily unavailable");
  });
});
