import { BadRequestException, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { EntityManager, Repository } from "typeorm";

import { OrderEntity } from "../orders/entities/order.entity";
import { PromoCodeEntity } from "./entities/promo-code.entity";

@Injectable()
export class PromoCodesService {
  constructor(
    @InjectRepository(PromoCodeEntity)
    private readonly promos: Repository<PromoCodeEntity>,
    @InjectRepository(OrderEntity)
    private readonly orders: Repository<OrderEntity>,
  ) {}

  async preview(
    code: string,
    price: number,
  ): Promise<{
    promoCodeId: string;
    discountAmount: number;
    estimatedPrice: number;
  }> {
    const promo = await this.validate(code, this.promos, this.orders);
    const discountAmount = this.discount(promo, price);
    return {
      promoCodeId: promo.id,
      discountAmount,
      estimatedPrice: Number((price - discountAmount).toFixed(2)),
    };
  }

  async saveOrder(order: OrderEntity, code: string): Promise<OrderEntity> {
    // Serialize redemptions against the same promo row to enforce maxUses.
    return this.orders.manager.transaction(async (manager: EntityManager) => {
      const orders = manager.getRepository(OrderEntity);
      const promo = await this.validate(
        code,
        manager.getRepository(PromoCodeEntity),
        orders,
        true,
      );
      const price = Number(order.estimatedPrice);
      const amount = this.discount(promo, price);
      order.promoCodeId = promo.id;
      order.discountAmount = amount.toFixed(2);
      order.estimatedPrice = (price - amount).toFixed(2);
      return orders.save(order);
    });
  }

  private async validate(
    code: string,
    promos: Repository<PromoCodeEntity>,
    orders: Repository<OrderEntity>,
    lock = false,
  ): Promise<PromoCodeEntity> {
    const promo = await promos.findOne({
      where: { code: code.trim().toUpperCase() },
      ...(lock ? { lock: { mode: "pessimistic_write" as const } } : {}),
    });
    if (!promo) this.fail("PROMO_CODE_NOT_FOUND");
    if (!promo.isActive) this.fail("PROMO_CODE_INACTIVE");
    if (promo.validTo && promo.validTo.getTime() <= Date.now())
      this.fail("PROMO_CODE_EXPIRED");
    if (promo.maxUses != null) {
      const uses = await orders.count({ where: { promoCodeId: promo.id } });
      if (uses >= promo.maxUses) this.fail("PROMO_CODE_LIMIT_REACHED");
    }
    const value = Number(promo.discountValue);
    if (
      !Number.isFinite(value) ||
      value <= 0 ||
      !["fixed", "percent"].includes(promo.discountType) ||
      (promo.discountType === "percent" && value > 100)
    ) {
      this.fail("PROMO_CODE_INVALID_DISCOUNT");
    }
    return promo;
  }

  private discount(promo: PromoCodeEntity, price: number): number {
    if (!Number.isFinite(price) || price < 0)
      this.fail("PROMO_CODE_INVALID_PRICE");
    const value = Number(promo.discountValue);
    return Number(
      Math.min(
        price,
        promo.discountType === "percent" ? (price * value) / 100 : value,
      ).toFixed(2),
    );
  }

  private fail(code: string): never {
    throw new BadRequestException({ code, message: code });
  }
}
