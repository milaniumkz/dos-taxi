import { ApiProperty } from '@nestjs/swagger';

import { GeoPointDto } from './geo-point.dto';

export class RouteResponseDto {
  @ApiProperty()
  polyline!: string;

  @ApiProperty({ type: [GeoPointDto] })
  points!: GeoPointDto[];

  @ApiProperty()
  distanceMeters!: number;

  @ApiProperty()
  durationSeconds!: number;
}
