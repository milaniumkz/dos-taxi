import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { OrderStatus } from "@dos/shared-types";
import { DataSource, Repository } from "typeorm";

import { ExecutorEntity } from "../executors/entities/executor.entity";

import {
  OrderChatMessageDto,
  SendOrderChatMessageDto,
} from "./dto/order-chat-message.dto";
import {
  OrderChatMessageEntity,
  OrderChatSenderRole,
} from "./entities/order-chat-message.entity";
import { OrderEntity } from "./entities/order.entity";

const terminalStatuses = new Set<OrderStatus>([
  OrderStatus.COMPLETED,
  OrderStatus.CANCELLED_CLIENT,
  OrderStatus.CANCELLED_EXECUTOR,
  OrderStatus.CANCELLED_SYSTEM,
  OrderStatus.FAILED,
]);

@Injectable()
export class OrderChatService {
  constructor(
    @InjectRepository(OrderChatMessageEntity)
    private readonly messagesRepository: Repository<OrderChatMessageEntity>,
    @InjectRepository(OrderEntity)
    private readonly ordersRepository: Repository<OrderEntity>,
    @InjectRepository(ExecutorEntity)
    private readonly executorsRepository: Repository<ExecutorEntity>,
    private readonly dataSource: DataSource,
  ) {}

  private storageReady?: Promise<void>;

  async listForClient(
    clientUserId: string,
    orderId: string,
  ): Promise<OrderChatMessageDto[]> {
    const order = await this.getClientOrder(clientUserId, orderId);
    return this.listMessages(order.id);
  }

  async sendFromClient(
    clientUserId: string,
    orderId: string,
    dto: SendOrderChatMessageDto,
  ): Promise<OrderChatMessageDto> {
    const order = await this.getClientOrder(clientUserId, orderId);
    this.ensureChatWritable(order);
    return this.createMessage(order.id, clientUserId, "client", dto);
  }

  async listForExecutor(
    executorUserId: string,
    orderId: string,
  ): Promise<OrderChatMessageDto[]> {
    const order = await this.getExecutorOrder(executorUserId, orderId);
    return this.listMessages(order.id);
  }

  async sendFromExecutor(
    executorUserId: string,
    orderId: string,
    dto: SendOrderChatMessageDto,
  ): Promise<OrderChatMessageDto> {
    const order = await this.getExecutorOrder(executorUserId, orderId);
    this.ensureChatWritable(order);
    return this.createMessage(order.id, executorUserId, "executor", dto);
  }

  private async listMessages(orderId: string): Promise<OrderChatMessageDto[]> {
    await this.ensureStorageReady();
    const messages = await this.messagesRepository.find({
      where: { orderId },
      order: { createdAt: "ASC" },
    });

    return messages.map((message) => this.toDto(message));
  }

  private async createMessage(
    orderId: string,
    senderUserId: string,
    senderRole: OrderChatSenderRole,
    dto: SendOrderChatMessageDto,
  ): Promise<OrderChatMessageDto> {
    await this.ensureStorageReady();
    const body = dto.body.trim();
    if (!body) {
      throw new BadRequestException({
        code: "ORDER_CHAT_MESSAGE_EMPTY",
        message: "Message must not be empty",
      });
    }

    const message = await this.messagesRepository.save(
      this.messagesRepository.create({
        orderId,
        senderUserId,
        senderRole,
        body,
      }),
    );
    return this.toDto(message);
  }

  private ensureStorageReady(): Promise<void> {
    this.storageReady ??= this.dataSource
      .query(`
        CREATE TABLE IF NOT EXISTS "order_chat_messages" (
          "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          "order_id" UUID NOT NULL REFERENCES "orders"("id") ON DELETE CASCADE,
          "sender_user_id" UUID NOT NULL REFERENCES "users"("id"),
          "sender_role" VARCHAR(20) NOT NULL,
          "body" TEXT NOT NULL,
          "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `)
      .then(() =>
        this.dataSource.query(
          `CREATE INDEX IF NOT EXISTS "IDX_order_chat_messages_order_id_created_at" ON "order_chat_messages" ("order_id", "created_at")`,
        ),
      )
      .then(() => undefined);
    return this.storageReady;
  }

  private async getClientOrder(
    clientUserId: string,
    orderId: string,
  ): Promise<OrderEntity> {
    const order = await this.ordersRepository.findOne({
      where: { id: orderId, clientId: clientUserId },
    });
    if (!order) {
      throw new NotFoundException({
        code: "ORDER_NOT_FOUND",
        message: "Order not found",
      });
    }
    return order;
  }

  private async getExecutorOrder(
    executorUserId: string,
    orderId: string,
  ): Promise<OrderEntity> {
    const executor = await this.executorsRepository.findOne({
      where: { userId: executorUserId },
    });
    if (!executor) {
      throw new NotFoundException({
        code: "EXECUTOR_NOT_FOUND",
        message: "Executor not found",
      });
    }

    const order = await this.ordersRepository.findOne({
      where: { id: orderId, executorId: executor.id },
    });
    if (!order) {
      throw new NotFoundException({
        code: "ORDER_NOT_FOUND",
        message: "Order not found",
      });
    }
    return order;
  }

  private ensureChatWritable(order: OrderEntity): void {
    if (!order.executorId) {
      throw new ForbiddenException({
        code: "ORDER_CHAT_EXECUTOR_NOT_ASSIGNED",
        message: "Chat opens after executor is assigned",
      });
    }

    if (terminalStatuses.has(order.status)) {
      throw new ForbiddenException({
        code: "ORDER_CHAT_CLOSED",
        message: "Order chat is closed",
      });
    }
  }

  private toDto(message: OrderChatMessageEntity): OrderChatMessageDto {
    return {
      id: message.id,
      sender: message.senderRole,
      body: message.body,
      createdAt: message.createdAt,
    };
  }
}
