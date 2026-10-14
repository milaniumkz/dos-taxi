import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

import { GeoPointDto } from "./geo-point.dto";

export class NavigationManeuverDto {
  @ApiProperty({ type: GeoPointDto }) point!: GeoPointDto;
  @ApiProperty() type!: string;
  @ApiPropertyOptional() modifier?: string;
  @ApiPropertyOptional() exit?: number;
  @ApiProperty() roadName!: string;
  @ApiProperty() distanceFromStartMeters!: number;
  @ApiProperty() bearingAfter!: number;
}
export class RouteResponseDto {
  @ApiPropertyOptional({ type: [NavigationManeuverDto] })
  maneuvers?: NavigationManeuverDto[];
  @ApiProperty()
  polyline!: string;

  @ApiProperty({ type: [GeoPointDto] })
  points!: GeoPointDto[];

  @ApiProperty()
  distanceMeters!: number;

  @ApiProperty()
  durationSeconds!: number;
}
