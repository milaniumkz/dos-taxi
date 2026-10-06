import { UserRole } from "@dos/shared-types";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { Repository } from "typeorm";

import { RedisStoreService } from "../../shared/cache/redis-store.service";
import { CityEntity } from "../admin/entities/city.entity";
import { ExecutorEntity } from "../executors/entities/executor.entity";
import { NotificationsService } from "../notifications/notifications.service";
import { UserEntity } from "../users/entities/user.entity";

import { AuthService } from "./auth.service";

function testConfig(values: Record<string, string | number>): ConfigService {
  const config = new ConfigService(values);
  Object.defineProperty(config, "get", { value: (key: string) => values[key] });
  return config;
}

describe("AuthService OTP logic", () => {
  let authService: AuthService;
  let usersRepository: jest.Mocked<Repository<UserEntity>>;
  let executorsRepository: jest.Mocked<Repository<ExecutorEntity>>;
  let citiesRepository: jest.Mocked<Repository<CityEntity>>;
  let redisStoreService: jest.Mocked<RedisStoreService>;
  let jwtService: jest.Mocked<JwtService>;
  let notificationsService: jest.Mocked<NotificationsService>;
  let configService: ConfigService;

  beforeEach(() => {
    usersRepository = {
      create: jest.fn((payload) => payload as UserEntity),
      save: jest.fn(async (payload) => ({
        id: "user-1",
        name: null,
        preferredLanguage: "ru",
        preferredCurrency: "KZT",
        ...payload,
      })),
      findOne: jest.fn(),
    } as unknown as jest.Mocked<Repository<UserEntity>>;
    executorsRepository = {
      create: jest.fn((payload) => payload as ExecutorEntity),
      merge: jest.fn((entity, payload) => ({ ...entity, ...payload })),
      save: jest.fn(async (payload) => payload as ExecutorEntity),
      findOne: jest.fn(),
    } as unknown as jest.Mocked<Repository<ExecutorEntity>>;
    citiesRepository = {
      findOne: jest.fn(),
    } as unknown as jest.Mocked<Repository<CityEntity>>;

    redisStoreService = {
      increment: jest.fn(),
      setJson: jest.fn(),
      getJson: jest.fn(),
      delete: jest.fn(),
      set: jest.fn(),
      get: jest.fn(),
    } as unknown as jest.Mocked<RedisStoreService>;

    jwtService = {
      signAsync: jest.fn(),
      verifyAsync: jest.fn(),
    } as unknown as jest.Mocked<JwtService>;
    notificationsService = {
      sendSms: jest.fn(),
      registerDeviceToken: jest.fn(),
    } as unknown as jest.Mocked<NotificationsService>;

    configService = testConfig({
      OTP_LENGTH: 4,
      OTP_TTL_SECONDS: 300,
      OTP_MAX_ATTEMPTS: 3,
      OTP_DEV_BYPASS: "true",
      JWT_ACCESS_EXPIRES_IN: "15m",
      JWT_REFRESH_EXPIRES_IN: "30d",
    });

    authService = new AuthService(
      usersRepository,
      executorsRepository,
      citiesRepository,
      jwtService,
      configService,
      redisStoreService,
      notificationsService,
    );
  });

  it("stores a dev OTP with ttl", async () => {
    redisStoreService.increment.mockResolvedValue(1);
    redisStoreService.setJson.mockResolvedValue();

    const response = await authService.sendOtp("+77010000000", "127.0.0.1");

    expect(response.expiresInSeconds).toBe(300);
    expect(response.devCode).toBe("1234");
    expect(redisStoreService.setJson).toHaveBeenCalledWith(
      "auth:otp:+77010000000",
      expect.objectContaining({
        code: "1234",
        phone: "+77010000000",
      }),
      300,
    );
    expect(notificationsService.sendSms).not.toHaveBeenCalled();
  });

  it("sends OTP through SMS and hides dev code when bypass is disabled", async () => {
    configService = testConfig({
      OTP_LENGTH: 4,
      OTP_TTL_SECONDS: 300,
      OTP_MAX_ATTEMPTS: 3,
      OTP_DEV_BYPASS: "false",
      OTP_DEBUG_RESPONSE_ENABLED: "false",
      JWT_ACCESS_EXPIRES_IN: "15m",
      JWT_REFRESH_EXPIRES_IN: "30d",
    });
    authService = new AuthService(
      usersRepository,
      executorsRepository,
      citiesRepository,
      jwtService,
      configService,
      redisStoreService,
      notificationsService,
    );
    redisStoreService.increment.mockResolvedValue(1);
    redisStoreService.setJson.mockResolvedValue();
    notificationsService.sendSms.mockResolvedValue();

    const response = await authService.sendOtp("+77010000000", "127.0.0.1");

    expect(response.expiresInSeconds).toBe(300);
    expect(response.devCode).toBeNull();
    expect(redisStoreService.setJson).toHaveBeenCalledWith(
      "auth:otp:+77010000000",
      expect.objectContaining({
        code: expect.stringMatching(/^\d{4}$/),
        phone: "+77010000000",
      }),
      300,
    );
    expect(notificationsService.sendSms).toHaveBeenCalledWith(
      "+77010000000",
      "auth_otp",
      expect.objectContaining({
        code: expect.stringMatching(/^\d{4}$/),
        ttlSeconds: 300,
      }),
    );
  });

  it("returns generated OTP in response and skips SMS when debug response is enabled", async () => {
    configService = testConfig({
      OTP_LENGTH: 4,
      OTP_TTL_SECONDS: 300,
      OTP_MAX_ATTEMPTS: 3,
      OTP_DEV_BYPASS: "false",
      OTP_DEBUG_RESPONSE_ENABLED: "true",
      JWT_ACCESS_EXPIRES_IN: "15m",
      JWT_REFRESH_EXPIRES_IN: "30d",
    });
    authService = new AuthService(
      usersRepository,
      executorsRepository,
      citiesRepository,
      jwtService,
      configService,
      redisStoreService,
      notificationsService,
    );
    redisStoreService.increment.mockResolvedValue(1);
    redisStoreService.setJson.mockResolvedValue();

    const response = await authService.sendOtp("+77010000000", "127.0.0.1");

    expect(response.expiresInSeconds).toBe(300);
    expect(response.devCode).toEqual(expect.stringMatching(/^\d{4}$/));
    expect(redisStoreService.setJson).toHaveBeenCalledWith(
      "auth:otp:+77010000000",
      expect.objectContaining({
        code: response.devCode,
        phone: "+77010000000",
      }),
      300,
    );
    expect(notificationsService.sendSms).not.toHaveBeenCalled();
  });

  it("creates user and returns tokens after otp verification", async () => {
    redisStoreService.getJson.mockResolvedValue({
      code: "1234",
      phone: "+77010000000",
      createdAt: new Date().toISOString(),
    });
    usersRepository.findOne.mockResolvedValue(null);
    jwtService.signAsync
      .mockResolvedValueOnce("access-token")
      .mockResolvedValueOnce("refresh-token");
    redisStoreService.set.mockResolvedValue();

    const result = await authService.verifyOtp(
      "+77010000000",
      "1234",
      UserRole.CLIENT,
    );

    expect(result.accessToken).toBe("access-token");
    expect(result.refreshToken).toBe("refresh-token");
    expect(usersRepository.save).toHaveBeenCalled();
    expect(redisStoreService.delete).toHaveBeenCalledWith(
      "auth:otp:+77010000000",
    );
  });

  it("registers device token on successful otp verification when provided", async () => {
    redisStoreService.getJson.mockResolvedValue({
      code: "1234",
      phone: "+77010000000",
      createdAt: new Date().toISOString(),
    });
    usersRepository.findOne.mockResolvedValue({
      id: "user-1",
      phone: "+77010000000",
      name: null,
      preferredLanguage: "ru",
      preferredCurrency: "KZT",
    } as UserEntity);
    jwtService.signAsync
      .mockResolvedValueOnce("access-token")
      .mockResolvedValueOnce("refresh-token");
    redisStoreService.set.mockResolvedValue();

    await authService.verifyOtp(
      "+77010000000",
      "1234",
      UserRole.EXECUTOR,
      "device-token-1",
      "android",
    );

    expect(notificationsService.registerDeviceToken).toHaveBeenCalledWith(
      "user-1",
      "device-token-1",
      "android",
      UserRole.EXECUTOR,
    );
  });

  it("rejects invalid otp code", async () => {
    redisStoreService.getJson.mockResolvedValue({
      code: "1234",
      phone: "+77010000000",
      createdAt: new Date().toISOString(),
    });

    await expect(
      authService.verifyOtp("+77010000000", "9999", UserRole.CLIENT),
    ).rejects.toThrow("OTP code is invalid or expired");
  });
});
