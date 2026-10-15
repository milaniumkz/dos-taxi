import { UserRole } from "@dos/shared-types";
import { Roles } from "../../shared/decorators/roles.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  UseGuards,
  HttpCode,
} from "@nestjs/common";
import {
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiBearerAuth,
} from "@nestjs/swagger";

import { AddressSuggestionResponseDto } from "./dto/address-suggestion.response.dto";
import { AutocompleteQueryDto } from "./dto/autocomplete-query.dto";
import { NearbyExecutorMarkerDto } from "./dto/nearby-executor-marker.dto";
import { NearbyExecutorsQueryDto } from "./dto/nearby-executors-query.dto";
import { ReverseQueryDto } from "./dto/reverse-query.dto";
import { RouteRequestDto } from "./dto/route-request.dto";
import { RouteResponseDto } from "./dto/route-response.dto";
import { GeoService } from "./geo.service";

@ApiTags("geo")
@Controller("geo")
export class GeoController {
  constructor(private readonly geoService: GeoService) {}

  @Get("autocomplete")
  @ApiOperation({ summary: "Find address suggestions via OSM/Nominatim" })
  @ApiOkResponse({ type: AddressSuggestionResponseDto, isArray: true })
  autocomplete(
    @Query() query: AutocompleteQueryDto,
  ): Promise<AddressSuggestionResponseDto[]> {
    return this.geoService.autocomplete(query.q, {
      cityId: query.cityId,
      lat: query.lat,
      lng: query.lng,
      radiusKm: query.radiusKm,
    });
  }

  @Get("reverse")
  @ApiOperation({
    summary: "Label an exact map pin using reverse geocoding",
    description:
      "Preserves requested coordinates. Falls back to a configured secondary geocoder, then a coordinate label when address providers are unavailable.",
  })
  @ApiOkResponse({ type: AddressSuggestionResponseDto })
  reverse(
    @Query() query: ReverseQueryDto,
  ): Promise<AddressSuggestionResponseDto> {
    return this.geoService.reverse(query.lat, query.lng);
  }

  @Post("route")
  @ApiOperation({ summary: "Build route via OSRM" })
  @ApiOkResponse({ type: RouteResponseDto })
  route(@Body() dto: RouteRequestDto): Promise<RouteResponseDto> {
    return this.geoService.route(dto);
  }

  @Post("navigation")
  @HttpCode(200)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.EXECUTOR)
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Build a driving road route with language-neutral turn maneuvers",
  })
  @ApiOkResponse({ type: RouteResponseDto })
  navigation(@Body() dto: RouteRequestDto): Promise<RouteResponseDto> {
    return this.geoService.route(dto, true);
  }

  @Get("executors-nearby")
  @ApiOperation({ summary: "Return generalized nearby executor markers" })
  @ApiOkResponse({ type: NearbyExecutorMarkerDto, isArray: true })
  executorsNearby(
    @Query() query: NearbyExecutorsQueryDto,
  ): Promise<NearbyExecutorMarkerDto[]> {
    return this.geoService.findNearbyExecutors(query);
  }
}
