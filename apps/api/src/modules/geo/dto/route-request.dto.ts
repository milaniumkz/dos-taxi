import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsDefined,
  IsOptional,
  ValidateNested,
} from "class-validator";

import { GeoPointDto } from "./geo-point.dto";

export class RouteRequestDto {
  @ApiProperty({ type: GeoPointDto })
  @IsDefined()
  @ValidateNested()
  @Type(() => GeoPointDto)
  from!: GeoPointDto;

  @ApiProperty({ type: GeoPointDto })
  @IsDefined()
  @ValidateNested()
  @Type(() => GeoPointDto)
  to!: GeoPointDto;

  @ApiPropertyOptional({ type: [GeoPointDto] })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(0)
  @ArrayMaxSize(8)
  @ValidateNested({ each: true })
  @Type(() => GeoPointDto)
  waypoints?: GeoPointDto[];
}
