import { ApiProperty } from "@nestjs/swagger";

export class ExecutorTrackingDto {
  @ApiProperty() lat!: number;
  @ApiProperty() lng!: number;
  @ApiProperty({ type: Number, nullable: true }) heading!: number | null;
  @ApiProperty({ format: "date-time" }) updatedAt!: Date;
}
