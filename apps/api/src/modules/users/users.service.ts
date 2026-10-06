import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";

import { ExecutorEntity } from "../executors/entities/executor.entity";

import { UpdateProfileDto } from "./dto/update-profile.dto";
import { UserEntity } from "./entities/user.entity";

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly usersRepository: Repository<UserEntity>,
    @InjectRepository(ExecutorEntity)
    private readonly executorsRepository: Repository<ExecutorEntity>,
  ) {}

  async getProfile(userId: string): Promise<UserEntity> {
    const user = await this.usersRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException({
        code: "USER_NOT_FOUND",
        message: "User profile not found",
      });
    }

    return user;
  }

  async updateProfile(
    userId: string,
    dto: UpdateProfileDto,
  ): Promise<UserEntity> {
    const user = await this.getProfile(userId);
    const updated = this.usersRepository.merge(user, dto);
    return this.usersRepository.save(updated);
  }

  async deleteProfile(userId: string): Promise<void> {
    const user = await this.getProfile(userId);

    await this.executorsRepository.update(
      { userId },
      {
        isOnline: false,
        verificationStatus: "deleted",
      },
    );

    await this.usersRepository.save(
      this.usersRepository.merge(user, {
        phone: `deleted_${userId.slice(0, 12)}`,
        name: null,
        isBlocked: true,
      }),
    );
  }
}
