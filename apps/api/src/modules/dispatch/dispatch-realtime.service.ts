import { ServiceType } from "@dos/shared-types";
import { Injectable, Logger } from "@nestjs/common";

import { DispatchGateway } from "./dispatch.gateway";

export type IncomingOrderPayload = {
  executorId: string;
  executorUserId: string;
  orderId: string;
  offer: {
    orderId: string;
    serviceType: ServiceType;
    currency: string;
    estimatedPrice: string | null;
    distanceMeters: number | null;
    durationSeconds: number | null;
    pickupAddress?: string;
    pickupLat?: number;
    pickupLng?: number;
    destinationAddress?: string;
    destinationLat?: number;
    destinationLng?: number;
  };
};

@Injectable()
export class DispatchRealtimeService {
  private readonly logger = new Logger(DispatchRealtimeService.name);
  private readonly events: IncomingOrderPayload[] = [];

  constructor(private readonly dispatchGateway: DispatchGateway) {}

  emitIncomingOrder(payload: IncomingOrderPayload): void {
    this.events.push(payload);
    this.dispatchGateway.emitIncomingOrder(payload);
    this.logger.debug(
      `executor:incoming_order ${payload.executorId} <= ${payload.orderId}`,
    );
  }

  getBufferedEvents(): IncomingOrderPayload[] {
    return [...this.events];
  }
}
