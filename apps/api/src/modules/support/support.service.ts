import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";

import { AdminNoteEntity } from "../admin/entities/admin-note.entity";
import { ExecutorEntity } from "../executors/entities/executor.entity";
import { UserEntity } from "../users/entities/user.entity";

import {
  SendSupportMessageDto,
  SupportMessageDto,
} from "./dto/support-message.dto";

const userMessagePrefix = "Чат поддержки:";
const operatorMessagePrefix = "Ответ поддержки:";

@Injectable()
export class SupportService {
  constructor(
    @InjectRepository(AdminNoteEntity)
    private readonly adminNotesRepository: Repository<AdminNoteEntity>,
    @InjectRepository(ExecutorEntity)
    private readonly executorsRepository: Repository<ExecutorEntity>,
    @InjectRepository(UserEntity)
    private readonly usersRepository: Repository<UserEntity>,
  ) {}

  async listMessages(userId: string): Promise<SupportMessageDto[]> {
    const entity = await this.resolveSupportEntity(userId);
    const notes = await this.adminNotesRepository.find({
      where: {
        entityType: entity.type,
        entityId: entity.id,
      },
      order: {
        createdAt: "ASC",
      },
    });

    return notes
      .map((note) => this.toSupportMessage(note, userId))
      .filter((message): message is SupportMessageDto => message !== null);
  }

  async sendMessage(
    userId: string,
    dto: SendSupportMessageDto,
  ): Promise<SupportMessageDto> {
    const entity = await this.resolveSupportEntity(userId);
    const body = dto.body.trim();
    const note = await this.adminNotesRepository.save(
      this.adminNotesRepository.create({
        entityType: entity.type,
        entityId: entity.id,
        body: `${userMessagePrefix} ${body}`,
        kind: "escalation",
        isPinned: false,
        state: "open",
        createdById: userId,
        assignedToId: null,
      }),
    );

    return {
      id: note.id,
      sender: "user",
      body,
      createdAt: note.createdAt,
    };
  }

  private async resolveSupportEntity(
    userId: string,
  ): Promise<{ type: "executor" | "user"; id: string }> {
    const executor = await this.executorsRepository.findOne({
      where: { userId },
    });
    if (executor) {
      return { type: "executor", id: executor.id };
    }

    const user = await this.usersRepository.findOne({
      where: { id: userId },
    });
    if (!user) {
      throw new NotFoundException({
        code: "USER_NOT_FOUND",
        message: "User not found",
      });
    }

    return { type: "user", id: user.id };
  }

  private toSupportMessage(
    note: AdminNoteEntity,
    userId: string,
  ): SupportMessageDto | null {
    const body = note.body.trim();
    const isUserMessage = body.startsWith(userMessagePrefix);
    const isOperatorMessage = body.startsWith(operatorMessagePrefix);
    if (!isUserMessage && !isOperatorMessage) {
      return null;
    }

    const prefix = isUserMessage ? userMessagePrefix : operatorMessagePrefix;
    return {
      id: note.id,
      sender: note.createdById === userId ? "user" : "operator",
      body: body.slice(prefix.length).trim(),
      createdAt: note.createdAt,
    };
  }
}
