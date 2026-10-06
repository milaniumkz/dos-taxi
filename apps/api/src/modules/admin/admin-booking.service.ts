import { createHash, randomUUID } from "node:crypto";
import {
  BadRequestException,
  ConflictException,
  Injectable,
} from "@nestjs/common";
import { DataSource } from "typeorm";
import { OrderEntity } from "../orders/entities/order.entity";
import { OrdersService } from "../orders/orders.service";
import { UserEntity } from "../users/entities/user.entity";
import { CityEntity } from "./entities/city.entity";
import { AdminActivityLogEntity } from "./entities/admin-activity-log.entity";
import { CreateAdminOrderDto } from "./dto/create-admin-order.dto";
import { OrderResponseDto } from "../orders/dto/order-response.dto";

@Injectable()
export class AdminBookingService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly orders: OrdersService,
  ) {}

  async create(
    actorId: string,
    key: string,
    dto: CreateAdminOrderDto,
  ): Promise<OrderResponseDto> {
    const requestKey = `${actorId}:${key}`;
    const hash = createHash("sha256").update(JSON.stringify(dto)).digest("hex");
    const runner = this.dataSource.createQueryRunner();
    await runner.connect();
    try {
      // Session lock serializes retries across API instances, not just one process.
      await runner.query("SELECT pg_advisory_lock(hashtext($1))", [requestKey]);
      const activity = runner.manager.getRepository(AdminActivityLogEntity);
      const previous = await activity
        .createQueryBuilder("activity")
        .where("activity.metadata ->> 'requestKey' = :requestKey", {
          requestKey,
        })
        .andWhere("activity.action = :action", {
          action: "order.creation_requested",
        })
        .getOne();
      if (previous) {
        if (previous.metadata?.payloadHash !== hash)
          throw new ConflictException("IDEMPOTENCY_KEY_CONFLICT");
        if (previous.metadata?.orderId && previous.metadata?.clientId) {
          return this.orders.getOrder(
            String(previous.metadata.clientId),
            String(previous.metadata.orderId),
          );
        }
        // A interrupted/failed request must be inspected, never blindly duplicated.
        throw new ConflictException("ORDER_CREATION_REQUIRES_REVIEW");
      }
      const city = await runner.manager.findOne(CityEntity, {
        where: { id: dto.cityId, isActive: true },
      });
      if (!city) throw new BadRequestException("CITY_NOT_ACTIVE");
      const users = runner.manager.getRepository(UserEntity);
      let client = await users.findOne({ where: { phone: dto.clientPhone } });
      if (!client) {
        await users
          .createQueryBuilder()
          .insert()
          .values({
            phone: dto.clientPhone,
            name: dto.clientName?.trim() || null,
            preferredCurrency: city.currency,
            preferredLanguage: "ru",
          })
          .orIgnore()
          .execute();
        client = await users.findOneByOrFail({ phone: dto.clientPhone });
      }
      if (client.isBlocked) throw new BadRequestException("CLIENT_BLOCKED");
      const orderId = randomUUID();
      const intent = await activity.save(
        activity.create({
          actorId,
          action: "order.creation_requested",
          entityType: "user",
          entityId: client.id,
          metadata: {
            requestKey,
            payloadHash: hash,
            clientId: client.id,
            pendingOrderId: orderId,
          },
        }),
      );
      let order: OrderResponseDto;
      try {
        order = await this.orders.createOrder(client.id, dto, orderId);
      } catch (error) {
        // Safe to retry validation/provider failures that persisted no order.
        // Keep the intent if a partially created order needs operator review.
        if (!(await runner.manager.findOneBy(OrderEntity, { id: orderId })))
          await activity.delete(intent.id);
        throw error;
      }
      intent.metadata = { ...intent.metadata, orderId: order.id };
      await activity.save(intent);
      await activity.save(
        activity.create({
          actorId,
          action: "order.created",
          entityType: "order",
          entityId: order.id,
          metadata: {
            clientId: client.id,
            cityId: dto.cityId,
            source: "admin",
          },
        }),
      );
      return order;
    } finally {
      try {
        await runner.query("SELECT pg_advisory_unlock(hashtext($1))", [
          requestKey,
        ]);
      } finally {
        await runner.release();
      }
    }
  }
}
