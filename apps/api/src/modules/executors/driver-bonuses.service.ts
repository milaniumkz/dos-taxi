import { Currency, OrderStatus } from "@dos/shared-types";
import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";

import { OrderEntity } from "../orders/entities/order.entity";
import { DriverBonusProgressDto } from "./dto/driver-bonus-progress.dto";
import { DriverBonusSettingEntity } from "./entities/driver-bonus-setting.entity";
import { ExecutorEntity } from "./entities/executor.entity";

@Injectable()
export class DriverBonusesService {
  constructor(
    @InjectRepository(ExecutorEntity)
    private readonly executors: Repository<ExecutorEntity>,
    @InjectRepository(OrderEntity)
    private readonly orders: Repository<OrderEntity>,
    @InjectRepository(DriverBonusSettingEntity)
    private readonly settings: Repository<DriverBonusSettingEntity>,
  ) {}

  async getProgress(userId: string): Promise<DriverBonusProgressDto> {
    const executor = await this.executors.findOne({
      where: { userId },
      relations: ["city"],
    });
    if (!executor)
      throw new NotFoundException({
        code: "EXECUTOR_PROFILE_NOT_FOUND",
        message: "Executor profile not found",
      });
    const setting = await this.settings.findOne({ where: { key: "default" } });
    const total = await this.orders.count({
      where: { executorId: executor.id, status: OrderStatus.COMPLETED },
    });
    const required = setting?.ordersRequired ?? 0;
    const amount = Number(setting?.bonusAmount ?? 0);
    const enabled = Boolean(
      setting?.isEnabled &&
      required > 0 &&
      Number.isFinite(amount) &&
      amount > 0,
    );
    const completed = enabled ? total % required : 0;
    return {
      isEnabled: enabled,
      ordersRequired: required,
      bonusAmount: Number.isFinite(amount) ? amount : 0,
      currency: executor.city?.currency ?? Currency.KZT,
      totalCompletedOrders: total,
      completedInCycle: completed,
      remainingOrders: enabled ? required - completed : 0,
      nextThreshold: enabled ? total - completed + required : total,
    };
  }
}
