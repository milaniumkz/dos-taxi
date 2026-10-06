import { Injectable, Logger } from '@nestjs/common';

type OrderStatusChangedPayload = {
  orderId: string;
  status: string;
  executorId?: string | null;
};

@Injectable()
export class OrdersRealtimeService {
  private readonly logger = new Logger(OrdersRealtimeService.name);
  private readonly events: OrderStatusChangedPayload[] = [];

  emitOrderStatusChanged(payload: OrderStatusChangedPayload): void {
    this.events.push(payload);
    this.logger.debug(
      `order:status_changed ${payload.orderId} -> ${payload.status}`,
    );
  }

  getBufferedEvents(): OrderStatusChangedPayload[] {
    return [...this.events];
  }
}
