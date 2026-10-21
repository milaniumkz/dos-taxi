import { OrderStatus } from "@dos/shared-types";
import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { OrderEntity } from "../orders/entities/order.entity";
import { ExecutorEntity } from "./entities/executor.entity";
import { DriverStatisticsDto } from "./dto/driver-statistics.dto";

@Injectable()
export class DriverStatisticsService {
  constructor(
    @InjectRepository(ExecutorEntity)
    private readonly executors: Repository<ExecutorEntity>,
    @InjectRepository(OrderEntity)
    private readonly orders: Repository<OrderEntity>,
  ) {}

  async get(userId: string): Promise<DriverStatisticsDto> {
    const executor = await this.executors.findOneBy({ userId });
    if (!executor)
      throw new NotFoundException({
        code: "EXECUTOR_PROFILE_NOT_FOUND",
        message: "Executor profile not found",
      });
    const rated =
      "orders.status = :completed AND orders.executor_rating BETWEEN 1 AND 5";
    const row = await this.orders
      .createQueryBuilder("orders")
      .select(
        "COUNT(*) FILTER (WHERE orders.status = :completed)",
        "completedOrders",
      )
      .addSelect(
        "COUNT(*) FILTER (WHERE orders.status = :cancelled)",
        "cancelledByDriver",
      )
      .addSelect(`COUNT(*) FILTER (WHERE ${rated})`, "ratedOrders")
      .addSelect(
        `AVG(orders.executor_rating) FILTER (WHERE ${rated})`,
        "rating",
      )
      .where("orders.executorId = :executorId", { executorId: executor.id })
      .setParameters({
        completed: OrderStatus.COMPLETED,
        cancelled: OrderStatus.CANCELLED_EXECUTOR,
      })
      .getRawOne<{
        completedOrders: string;
        cancelledByDriver: string;
        ratedOrders: string;
        rating: string | null;
      }>();
    const completedOrders = Number(row?.completedOrders ?? 0);
    const cancelledByDriver = Number(row?.cancelledByDriver ?? 0);
    const ratedOrders = Number(row?.ratedOrders ?? 0);
    const total = completedOrders + cancelledByDriver;
    return {
      completedOrders,
      cancelledByDriver,
      ratedOrders,
      rating:
        ratedOrders > 0 && row?.rating != null
          ? Number(Number(row.rating).toFixed(2))
          : null,
      activityPercent:
        total > 0 ? Number(((100 * completedOrders) / total).toFixed(1)) : null,
    };
  }
}
