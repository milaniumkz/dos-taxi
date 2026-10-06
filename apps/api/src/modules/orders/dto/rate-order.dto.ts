import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, MaxLength, Min, Max } from 'class-validator';

export class RateOrderDto {
  @ApiProperty({ example: 5, minimum: 1, maximum: 5 })
  @IsInt()
  @Min(1)
  @Max(5)
  executorRating!: number;

  @ApiPropertyOptional({ example: 'Driver was careful and arrived fast' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  comment?: string;
}
