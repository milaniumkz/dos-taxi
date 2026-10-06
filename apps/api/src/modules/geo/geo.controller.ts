import { Body, Controller, Get, Post, Query } from "@nestjs/common";
import { ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";

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
  @ApiOperation({ summary: "Reverse geocode coordinates via OSM/Nominatim" })
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

  @Get("executors-nearby")
  @ApiOperation({ summary: "Return generalized nearby executor markers" })
  @ApiOkResponse({ type: NearbyExecutorMarkerDto, isArray: true })
  executorsNearby(
    @Query() query: NearbyExecutorsQueryDto,
  ): Promise<NearbyExecutorMarkerDto[]> {
    return this.geoService.findNearbyExecutors(query);
  }
}
