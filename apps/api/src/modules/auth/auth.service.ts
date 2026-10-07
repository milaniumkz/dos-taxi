import { Currency, ExecutorType, UserRole } from "@dos/shared-types";
import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  ServiceUnavailableException,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";

import { RedisStoreService } from "../../shared/cache/redis-store.service";
import { CityEntity } from "../admin/entities/city.entity";
import { ExecutorEntity } from "../executors/entities/executor.entity";
import { NotificationsService } from "../notifications/notifications.service";
import { UserEntity } from "../users/entities/user.entity";

import { AuthResponseDto } from "./dto/auth-response.dto";
import { SendOtpResponseDto } from "./dto/send-otp-response.dto";
import { JwtPayload } from "./interfaces/jwt-payload.interface";

type OtpSession = {
  code: string;
  phone: string;
  createdAt: string;
};

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(UserEntity)
    private readonly usersRepository: Repository<UserEntity>,
    @InjectRepository(ExecutorEntity)
    private readonly executorsRepository: Repository<ExecutorEntity>,
    @InjectRepository(CityEntity)
    private readonly citiesRepository: Repository<CityEntity>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly redisStoreService: RedisStoreService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async sendOtp(phone: string, ipAddress: string): Promise<SendOtpResponseDto> {
    const reviewerCode = this.getReviewerOtpCode(phone);
    if (reviewerCode) {
      const ttlSeconds = this.getNumberConfig("OTP_TTL_SECONDS", 300);
      await this.redisStoreService.setJson(
        this.getOtpKey(phone),
        {
          code: reviewerCode,
          phone,
          createdAt: new Date().toISOString(),
        } satisfies OtpSession,
        ttlSeconds,
      );
      return {
        expiresInSeconds: ttlSeconds,
        devCode: null,
      };
    }

    const limits = [
      { key: `auth:otp:phone:${phone}`, max: this.getNumberConfig("OTP_MAX_ATTEMPTS", 3) },
      { key: `auth:otp:ip:${ipAddress}`, max: this.getNumberConfig("OTP_IP_MAX_ATTEMPTS", 100) },
    ];
    for (const limit of limits) {
      const attempts = await this.redisStoreService.increment(limit.key, 3600);
      if (attempts > limit.max) {
        const retryAfterSeconds = await this.redisStoreService.ttl(limit.key);
        throw new HttpException({
          code: "OTP_RATE_LIMITED",
          message: "Too many OTP requests",
          details: { retryAfterSeconds },
        }, HttpStatus.TOO_MANY_REQUESTS);
      }
    }

    const otpBypassEnabled = this.isOtpBypassEnabled();
    const otpDebugResponseEnabled = this.isOtpDebugResponseEnabled();
    const code = otpBypassEnabled ? "1234" : this.generateOtpCode();
    const ttlSeconds = this.getNumberConfig("OTP_TTL_SECONDS", 300);
    await this.redisStoreService.setJson(
      this.getOtpKey(phone),
      {
        code,
        phone,
        createdAt: new Date().toISOString(),
      } satisfies OtpSession,
      ttlSeconds,
    );

    if (!otpBypassEnabled && !otpDebugResponseEnabled) {
      try {
        await this.notificationsService.sendSms(phone, "auth_otp", {
          code,
          ttlSeconds,
        });
      } catch (error) {
        await this.redisStoreService.delete(this.getOtpKey(phone));
        const message =
          error instanceof Error ? error.message : "Unknown OTP delivery error";
        this.logger.warn(`OTP delivery failed for ${phone}: ${message}`);
        throw new ServiceUnavailableException({
          code: "OTP_DELIVERY_FAILED",
          message: "OTP delivery failed",
        });
      }
    }

    return {
      expiresInSeconds: ttlSeconds,
      devCode: otpBypassEnabled || otpDebugResponseEnabled ? code : null,
    };
  }

  async verifyOtp(
    phone: string,
    code: string,
    role: UserRole.CLIENT | UserRole.EXECUTOR,
    deviceToken?: string,
    devicePlatform?: string,
  ): Promise<AuthResponseDto> {
    const session = await this.redisStoreService.getJson<OtpSession>(
      this.getOtpKey(phone),
    );

    if (!session || session.code !== code) {
      throw new UnauthorizedException({
        code: "OTP_INVALID",
        message: "OTP code is invalid or expired",
      });
    }

    await this.redisStoreService.delete(this.getOtpKey(phone));

    let user = await this.usersRepository.findOne({
      where: { phone },
    });

    if (!user) {
      const createdUser = this.usersRepository.create({
        phone,
        name: this.getReviewerDisplayName(phone),
        preferredLanguage: "ru",
        preferredCurrency: Currency.KZT,
      } as UserEntity);
      user = await this.usersRepository.save(createdUser);
    } else {
      const reviewerName = this.getReviewerDisplayName(phone);
      if (reviewerName && user.name !== reviewerName) {
        user.name = reviewerName;
        user = await this.usersRepository.save(user);
      }
    }

    if (!user) {
      throw new UnauthorizedException({
        code: "AUTH_USER_NOT_FOUND",
        message: "User not found",
      });
    }

    if (deviceToken?.trim()) {
      try {
        await this.notificationsService.registerDeviceToken(
          user.id,
          deviceToken,
          devicePlatform,
          role,
        );
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Unknown device token registration error";
        this.logger.warn(`Failed to register device token: ${message}`);
      }
    }

    if (role === UserRole.EXECUTOR) {
      await this.ensureReviewerExecutorProfile(user);
    }

    return this.buildAuthResponse(user, role);
  }

  async refresh(refreshToken: string): Promise<AuthResponseDto> {
    let payload: JwtPayload;
    try {
      payload = await this.jwtService.verifyAsync<JwtPayload>(refreshToken);
    } catch {
      throw new UnauthorizedException({
        code: "REFRESH_TOKEN_INVALID",
        message: "Refresh token is invalid",
      });
    }

    const storedRefreshToken = await this.redisStoreService.get(
      this.getRefreshTokenKey(payload.sub, payload.role),
    );

    if (!storedRefreshToken || storedRefreshToken !== refreshToken) {
      throw new UnauthorizedException({
        code: "REFRESH_TOKEN_REVOKED",
        message: "Refresh token has been revoked",
      });
    }

    const user = await this.usersRepository.findOne({
      where: { id: payload.sub },
    });

    if (!user) {
      throw new UnauthorizedException({
        code: "AUTH_USER_NOT_FOUND",
        message: "User not found",
      });
    }

    return this.buildAuthResponse(user, payload.role);
  }

  async logout(user: JwtPayload): Promise<void> {
    await this.redisStoreService.delete(
      this.getRefreshTokenKey(user.sub, user.role),
    );
  }

  private async buildAuthResponse(
    user: UserEntity,
    role: UserRole,
  ): Promise<AuthResponseDto> {
    const payload: JwtPayload = {
      sub: user.id,
      phone: user.phone,
      role,
    };

    const accessToken = await this.jwtService.signAsync(payload, {
      expiresIn:
        this.configService.get<string>("accessExpiresIn") ??
        this.configService.get<string>("JWT_ACCESS_EXPIRES_IN") ??
        "15m",
    });
    const refreshToken = await this.jwtService.signAsync(payload, {
      expiresIn:
        this.configService.get<string>("refreshExpiresIn") ??
        this.configService.get<string>("JWT_REFRESH_EXPIRES_IN") ??
        "30d",
    });

    await this.redisStoreService.set(
      this.getRefreshTokenKey(user.id, role),
      refreshToken,
      60 * 60 * 24 * 30,
    );

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        phone: user.phone,
        name: user.name,
        preferredLanguage: user.preferredLanguage,
        preferredCurrency: user.preferredCurrency,
      },
    };
  }

  private generateOtpCode(): string {
    const otpLength = this.getNumberConfig("OTP_LENGTH", 4);
    const min = 10 ** (otpLength - 1);
    const max = 10 ** otpLength - 1;
    return String(Math.floor(Math.random() * (max - min + 1)) + min);
  }

  private getOtpKey(phone: string): string {
    return `auth:otp:${phone}`;
  }

  private getRefreshTokenKey(userId: string, role: UserRole): string {
    return `auth:refresh:${userId}:${role}`;
  }

  private getNumberConfig(key: string, fallback: number): number {
    const rawValue = this.configService.get<string | number>(key);
    if (rawValue === undefined || rawValue === null) {
      return fallback;
    }

    const parsed = Number(rawValue);
    if (Number.isNaN(parsed)) {
      throw new BadRequestException({
        code: "AUTH_CONFIG_INVALID",
        message: `Invalid numeric configuration for ${key}`,
      });
    }

    return parsed;
  }

  private isOtpBypassEnabled(): boolean {
    const rawValue = this.configService.get<string | boolean>("OTP_DEV_BYPASS");
    return rawValue === true || rawValue === "true";
  }

  private isOtpDebugResponseEnabled(): boolean {
    const rawValue = this.configService.get<string | boolean>(
      "OTP_DEBUG_RESPONSE_ENABLED",
    );
    return rawValue === true || rawValue === "true";
  }

  private getReviewerOtpCode(phone: string): string | null {
    const reviewerPhones = this.getReviewerPhones();
    if (!reviewerPhones.includes(phone)) {
      return null;
    }

    return (
      this.configService.get<string>("APP_REVIEW_OTP_CODE")?.trim() || "2468"
    );
  }

  private getReviewerPhones(): string[] {
    const configured = this.configService
      .get<string>("APP_REVIEW_PHONE_NUMBERS")
      ?.split(",")
      .map((phone) => phone.trim())
      .filter(Boolean);

    return configured?.length
      ? configured
      : ["+77000000001", "+77000000002"];
  }

  private getReviewerDisplayName(phone: string): string | null {
    if (phone === "+77000000001") {
      return "App Review Passenger";
    }
    if (phone === "+77000000002") {
      return "App Review Driver";
    }
    return this.getReviewerPhones().includes(phone) ? "App Review User" : null;
  }

  private async ensureReviewerExecutorProfile(user: UserEntity): Promise<void> {
    if (!this.getReviewerPhones().includes(user.phone)) {
      return;
    }

    let executor = await this.executorsRepository.findOne({
      where: { userId: user.id },
    });
    const city = await this.citiesRepository.findOne({
      where: { isActive: true },
      order: { createdAt: "ASC" },
    });

    const reviewerProfile = {
      executorType: ExecutorType.DRIVER,
      vehicleType: null,
      carClass: "economy",
      vehicleMake: "Hyundai",
      vehicleModel: "Accent",
      vehicleYear: 2020,
      vehicleColor: "Белый",
      vehiclePlate: "777ABC01",
      enabledTariffs: ["economy", "comfort", "comfort_plus", "business"],
      cityId: city?.id ?? null,
      verificationStatus: "verified",
      balance: "5000.00",
      isOnline: false,
    };

    if (!executor) {
      executor = this.executorsRepository.create({
        userId: user.id,
        ...reviewerProfile,
      });
    } else {
      executor = this.executorsRepository.merge(executor, reviewerProfile);
    }

    await this.executorsRepository.save(executor);
  }
}
