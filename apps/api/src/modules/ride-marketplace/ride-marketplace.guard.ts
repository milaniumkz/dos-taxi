import { CanActivate, Injectable, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
@Injectable()
export class RideMarketplaceGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}
  canActivate(): boolean {
    if (
      String(
        this.config.get("FEATURE_RIDE_MARKETPLACE") ?? "true",
      ).toLowerCase() === "false"
    ) {
      throw new NotFoundException({
        code: "FEATURE_DISABLED",
        message: "Service temporarily unavailable",
      });
    }
    return true;
  }
}
