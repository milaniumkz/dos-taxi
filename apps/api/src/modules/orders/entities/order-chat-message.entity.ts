import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";

import { UserEntity } from "../../users/entities/user.entity";

import { OrderEntity } from "./order.entity";

export type OrderChatSenderRole = "client" | "executor";

@Entity({ name: "order_chat_messages" })
@Index("IDX_order_chat_messages_order_id_created_at", ["orderId", "createdAt"])
export class OrderChatMessageEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @ManyToOne(() => OrderEntity, { nullable: false, onDelete: "CASCADE" })
  @JoinColumn({ name: "order_id" })
  order!: OrderEntity;

  @Column({ name: "order_id", type: "uuid" })
  orderId!: string;

  @ManyToOne(() => UserEntity, { nullable: false })
  @JoinColumn({ name: "sender_user_id" })
  senderUser!: UserEntity;

  @Column({ name: "sender_user_id", type: "uuid" })
  senderUserId!: string;

  @Column({ name: "sender_role", type: "varchar", length: 20 })
  senderRole!: OrderChatSenderRole;

  @Column({ type: "text" })
  body!: string;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;
}
