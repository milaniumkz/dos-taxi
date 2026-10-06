import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export const adminActivityEntityTypes = [
  "order",
  "user",
  "executor",
  "city",
  "tariff",
  "promo_code",
  "payment",
] as const;

export type AdminActivityEntityType = (typeof adminActivityEntityTypes)[number];

export const adminActivityActions = [
  "city.created",
  "city.updated",
  "tariff.created",
  "tariff.updated",
  "order.assigned",
  "order.status_updated",
  "order.dispatch_retried",
  "note.created",
  "note.updated",
  "user.updated",
  "executor.updated",
  "executor.verified",
  "executor.blocked",
  "promo_code.created",
  "promo_code.updated",
  "payment.refunded",
  "payment.cancelled",
] as const;

export type AdminActivityAction = (typeof adminActivityActions)[number];

export class AdminActivityDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ enum: adminActivityActions })
  action!: AdminActivityAction;

  @ApiProperty({ enum: adminActivityEntityTypes })
  entityType!: AdminActivityEntityType;

  @ApiProperty()
  entityId!: string;

  @ApiPropertyOptional()
  actorId!: string | null;

  @ApiPropertyOptional()
  actorName!: string | null;

  @ApiPropertyOptional({
    type: "object",
    additionalProperties: true,
  })
  metadata!: Record<string, unknown> | null;

  @ApiProperty()
  createdAt!: Date;
}
