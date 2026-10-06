import { ForbiddenException } from "@nestjs/common";
import { OrderStatus } from "@dos/shared-types";
import { DataSource, Repository } from "typeorm";

import { ExecutorEntity } from "../executors/entities/executor.entity";

import { OrderChatMessageEntity } from "./entities/order-chat-message.entity";
import { OrderEntity } from "./entities/order.entity";
import { OrderChatService } from "./order-chat.service";

describe("OrderChatService", () => {
  let service: OrderChatService;
  let messagesRepository: jest.Mocked<Repository<OrderChatMessageEntity>>;
  let ordersRepository: jest.Mocked<Repository<OrderEntity>>;
  let executorsRepository: jest.Mocked<Repository<ExecutorEntity>>;
  let dataSource: jest.Mocked<DataSource>;

  const createdAt = new Date("2026-01-01T10:00:00Z");

  beforeEach(() => {
    messagesRepository = {
      find: jest.fn(),
      create: jest.fn((value) => value as OrderChatMessageEntity),
      save: jest.fn(async (value) => ({
        ...(value as OrderChatMessageEntity),
        id: "message-1",
        createdAt,
      })),
    } as unknown as jest.Mocked<Repository<OrderChatMessageEntity>>;
    ordersRepository = {
      findOne: jest.fn(),
    } as unknown as jest.Mocked<Repository<OrderEntity>>;
    executorsRepository = {
      findOne: jest.fn(),
    } as unknown as jest.Mocked<Repository<ExecutorEntity>>;
    dataSource = {
      query: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<DataSource>;

    service = new OrderChatService(
      messagesRepository,
      ordersRepository,
      executorsRepository,
      dataSource,
    );
  });

  it("sends a client message for assigned active order", async () => {
    ordersRepository.findOne.mockResolvedValue(
      orderFixture({ status: OrderStatus.ACCEPTED }),
    );

    const message = await service.sendFromClient("client-1", "order-1", {
      body: "  Жду у подъезда  ",
    });

    expect(messagesRepository.create).toHaveBeenCalledWith({
      orderId: "order-1",
      senderUserId: "client-1",
      senderRole: "client",
      body: "Жду у подъезда",
    });
    expect(message).toEqual({
      id: "message-1",
      sender: "client",
      body: "Жду у подъезда",
      createdAt,
    });
  });

  it("blocks sending after order is completed", async () => {
    ordersRepository.findOne.mockResolvedValue(
      orderFixture({ status: OrderStatus.COMPLETED }),
    );

    await expect(
      service.sendFromClient("client-1", "order-1", { body: "Спасибо" }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(messagesRepository.save).not.toHaveBeenCalled();
  });

  it("keeps completed order history readable", async () => {
    ordersRepository.findOne.mockResolvedValue(
      orderFixture({ status: OrderStatus.COMPLETED }),
    );
    messagesRepository.find.mockResolvedValue([
      {
        id: "message-1",
        orderId: "order-1",
        senderUserId: "executor-user-1",
        senderRole: "executor",
        body: "Поездка завершена",
        createdAt,
      } as OrderChatMessageEntity,
    ]);

    await expect(service.listForClient("client-1", "order-1")).resolves.toEqual(
      [
        {
          id: "message-1",
          sender: "executor",
          body: "Поездка завершена",
          createdAt,
        },
      ],
    );
  });
});

function orderFixture(overrides: Partial<OrderEntity> = {}): OrderEntity {
  return {
    id: "order-1",
    clientId: "client-1",
    executorId: "executor-1",
    status: OrderStatus.ACCEPTED,
    ...overrides,
  } as OrderEntity;
}
