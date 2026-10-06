import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class NearbyExecutorMarkerDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  lat!: number;

  @ApiProperty()
  lng!: number;

  @ApiPropertyOptional()
  heading?: number | null;

  @ApiProperty()
  label!: string;

  @ApiPropertyOptional()
  type?: string;

  @ApiPropertyOptional()
  vehicleType?: string | null;

  @ApiProperty()
  distanceMeters!: number;
}
