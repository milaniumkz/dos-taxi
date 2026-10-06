import { CourierVehicleType, ExecutorType } from "@dos/shared-types";
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";

import { RedisStoreService } from "../../shared/cache/redis-store.service";
import { S3StorageService } from "../../shared/storage/s3-storage.service";
import { CityEntity } from "../admin/entities/city.entity";
import { UserEntity } from "../users/entities/user.entity";

import { UpdateExecutorProfileDto } from "./dto/update-executor-profile.dto";
import { UpdateExecutorStatusDto } from "./dto/update-executor-status.dto";
import { UploadExecutorDocumentDto } from "./dto/upload-executor-document.dto";
import { CreateBalanceTopUpDto } from "./dto/create-balance-top-up.dto";
import { ExecutorBalanceTopUpEntity } from "./entities/executor-balance-top-up.entity";
import { ExecutorDocumentEntity } from "./entities/executor-document.entity";
import { ExecutorLocationEntity } from "./entities/executor-location.entity";
import { ExecutorEntity } from "./entities/executor.entity";

@Injectable()
export class ExecutorsService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly usersRepository: Repository<UserEntity>,
    @InjectRepository(ExecutorEntity)
    private readonly executorsRepository: Repository<ExecutorEntity>,
    @InjectRepository(ExecutorBalanceTopUpEntity)
    private readonly balanceTopUpsRepository: Repository<ExecutorBalanceTopUpEntity>,
    @InjectRepository(ExecutorLocationEntity)
    private readonly executorLocationsRepository: Repository<ExecutorLocationEntity>,
    @InjectRepository(ExecutorDocumentEntity)
    private readonly executorDocumentsRepository: Repository<ExecutorDocumentEntity>,
    @InjectRepository(CityEntity)
    private readonly citiesRepository: Repository<CityEntity>,
    private readonly redisStoreService: RedisStoreService,
    private readonly s3StorageService: S3StorageService,
  ) {}

  async getProfile(userId: string): Promise<ExecutorEntity> {
    const executor = await this.executorsRepository.findOne({
      where: { userId },
      relations: ["user", "city"],
    });

    if (!executor) {
      throw new NotFoundException({
        code: "EXECUTOR_PROFILE_NOT_FOUND",
        message: "Executor profile not found",
      });
    }

    return executor;
  }

  async updateProfile(
    userId: string,
    dto: UpdateExecutorProfileDto,
  ): Promise<ExecutorEntity> {
    const user = await this.usersRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException({
        code: "USER_NOT_FOUND",
        message: "User not found",
      });
    }

    if (dto.cityId) {
      const city = await this.citiesRepository.findOne({
        where: { id: dto.cityId },
      });
      if (!city) {
        throw new NotFoundException({
          code: "CITY_NOT_FOUND",
          message: "City not found",
        });
      }
    }

    const updatedUser = this.usersRepository.merge(user, {
      name: dto.name ?? user.name,
      preferredLanguage: dto.preferredLanguage ?? user.preferredLanguage,
    });
    await this.usersRepository.save(updatedUser);

    let executor = await this.executorsRepository.findOne({
      where: { userId },
      relations: ["user", "city"],
    });
    const requiresReview =
      executor != null && this.profileUpdateRequiresReview(user, executor, dto);

    const inferredExecutorType =
      dto.executorType ?? this.inferExecutorType(dto.vehicleType);

    if (!executor) {
      executor = this.executorsRepository.create({
        userId,
        executorType: inferredExecutorType,
        vehicleType: dto.vehicleType ?? null,
        carClass: null,
        vehicleMake: dto.vehicleMake ?? null,
        vehicleModel: dto.vehicleModel ?? null,
        vehicleYear: dto.vehicleYear ?? null,
        vehicleColor: dto.vehicleColor ?? null,
        vehiclePlate: dto.vehiclePlate ?? null,
        enabledTariffs: this.normalizeEnabledTariffs(dto.enabledTariffs),
        cityId: dto.cityId ?? null,
        verificationStatus: "pending",
      });
    } else {
      executor = this.executorsRepository.merge(executor, {
        executorType: dto.executorType ?? executor.executorType,
        vehicleType:
          dto.vehicleType !== undefined
            ? dto.vehicleType
            : executor.vehicleType,
        vehicleMake:
          dto.vehicleMake !== undefined
            ? dto.vehicleMake
            : executor.vehicleMake,
        vehicleModel:
          dto.vehicleModel !== undefined
            ? dto.vehicleModel
            : executor.vehicleModel,
        vehicleYear:
          dto.vehicleYear !== undefined
            ? dto.vehicleYear
            : executor.vehicleYear,
        vehicleColor:
          dto.vehicleColor !== undefined
            ? dto.vehicleColor
            : executor.vehicleColor,
        vehiclePlate:
          dto.vehiclePlate !== undefined
            ? dto.vehiclePlate
            : executor.vehiclePlate,
        enabledTariffs:
          dto.enabledTariffs !== undefined
            ? this.normalizeEnabledTariffs(dto.enabledTariffs)
            : executor.enabledTariffs,
        cityId: dto.cityId ?? executor.cityId,
      });
      if (requiresReview) {
        executor.verificationStatus = "pending";
        executor.isOnline = false;
      }
    }

    await this.executorsRepository.save(executor);
    if (requiresReview) {
      await this.redisStoreService.delete(`executor:location:${executor.id}`);
    }
    return this.getProfile(userId);
  }

  async createBalanceTopUp(
    userId: string,
    dto: CreateBalanceTopUpDto,
  ): Promise<ExecutorBalanceTopUpEntity> {
    const executor = await this.getProfile(userId);
    const phone = dto.phone.trim();
    if (!phone) {
      throw new BadRequestException({
        code: "BALANCE_TOP_UP_PHONE_REQUIRED",
        message: "Phone is required",
      });
    }

    const request = this.balanceTopUpsRepository.create({
      executorId: executor.id,
      amount: dto.amount.toFixed(2),
      phone,
      status: "pending",
      invoiceProvider: "kaspi",
    });

    return this.balanceTopUpsRepository.save(request);
  }

  async updateStatus(
    userId: string,
    dto: UpdateExecutorStatusDto,
  ): Promise<ExecutorEntity> {
    const executor = await this.getProfile(userId);
    if (dto.isOnline && executor.verificationStatus !== "verified") {
      throw new BadRequestException({
        code: "EXECUTOR_NOT_VERIFIED",
        message: "Executor profile must be verified before going online",
      });
    }

    executor.isOnline = dto.isOnline;
    await this.executorsRepository.save(executor);

    await this.executorLocationsRepository.upsert(
      {
        executorId: executor.id,
        lat: dto.lat,
        lng: dto.lng,
        heading: dto.heading ?? null,
      },
      ["executorId"],
    );

    await this.redisStoreService.setJson(
      `executor:location:${executor.id}`,
      {
        executorId: executor.id,
        lat: dto.lat,
        lng: dto.lng,
        heading: dto.heading ?? null,
        isOnline: dto.isOnline,
        updatedAt: new Date().toISOString(),
      },
      300,
    );

    return this.getProfile(userId);
  }

  async uploadDocument(
    userId: string,
    dto: UploadExecutorDocumentDto,
    file: Express.Multer.File | undefined,
  ): Promise<ExecutorDocumentEntity> {
    if (!file) {
      throw new BadRequestException({
        code: "EXECUTOR_DOCUMENT_FILE_REQUIRED",
        message: "File is required",
      });
    }

    const executor = await this.getProfile(userId);
    const fileUrl = await this.s3StorageService.uploadExecutorDocument({
      executorId: executor.id,
      documentType: dto.documentType,
      file,
    });

    const document = this.executorDocumentsRepository.create({
      executorId: executor.id,
      documentType: dto.documentType,
      fileName: file.originalname,
      fileUrl,
    });

    return this.executorDocumentsRepository.save(document);
  }

  async verifyExecutor(
    executorId: string,
    verificationStatus = "verified",
  ): Promise<ExecutorEntity> {
    const executor = await this.executorsRepository.findOne({
      where: { id: executorId },
    });

    if (!executor) {
      throw new NotFoundException({
        code: "EXECUTOR_NOT_FOUND",
        message: "Executor not found",
      });
    }

    executor.verificationStatus = verificationStatus;
    await this.executorsRepository.save(executor);

    return this.executorsRepository.findOneOrFail({
      where: { id: executorId },
      relations: ["user", "city"],
    });
  }

  private inferExecutorType(vehicleType?: CourierVehicleType): ExecutorType {
    return vehicleType ? ExecutorType.COURIER : ExecutorType.DRIVER;
  }

  private normalizeEnabledTariffs(values?: string[]): string[] {
    const allowed = ["economy", "comfort", "comfort_plus", "business"];
    const normalized = [
      ...new Set(
        (values?.length ? values : allowed).filter((value) =>
          allowed.includes(value),
        ),
      ),
    ];

    return normalized.length > 0 ? normalized : ["economy"];
  }

  private profileUpdateRequiresReview(
    user: UserEntity,
    executor: ExecutorEntity,
    dto: UpdateExecutorProfileDto,
  ): boolean {
    return (
      this.changed(dto.name, user.name) ||
      this.changed(dto.executorType, executor.executorType) ||
      this.changed(dto.vehicleType, executor.vehicleType) ||
      this.changed(dto.vehicleMake, executor.vehicleMake) ||
      this.changed(dto.vehicleModel, executor.vehicleModel) ||
      this.changed(dto.vehicleYear, executor.vehicleYear) ||
      this.changed(dto.vehicleColor, executor.vehicleColor) ||
      this.changed(dto.vehiclePlate, executor.vehiclePlate) ||
      this.changed(dto.cityId, executor.cityId) ||
      (dto.enabledTariffs !== undefined &&
        this.tariffsChanged(
          this.normalizeEnabledTariffs(dto.enabledTariffs),
          executor.enabledTariffs,
        ))
    );
  }

  private changed<T>(next: T | undefined, current: T | null): boolean {
    return next !== undefined && next !== current;
  }

  private tariffsChanged(next: string[], current: string[] | null): boolean {
    const currentValues = current ?? [];
    if (next.length !== currentValues.length) {
      return true;
    }

    return next.some((value, index) => value !== currentValues[index]);
  }
}
