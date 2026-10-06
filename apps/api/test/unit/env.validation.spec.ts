import { validateEnvironment } from "../../src/config/env.validation";

describe("validateEnvironment", () => {
  it("applies development defaults for optional runtime variables", () => {
    const validated = validateEnvironment({});

    expect(validated.NODE_ENV).toBe("development");
    expect(validated.PORT).toBe("3000");
    expect(validated.API_PREFIX).toBe("api/v1");
    expect(validated.DATABASE_URL).toBe(
      "postgresql://platform:platform@localhost:5432/platform_db",
    );
    expect(validated.REDIS_URL).toBe("redis://localhost:6379");
    expect(validated.JWT_SECRET).toBe("development-secret");
    expect(validated.OTP_DEV_BYPASS).toBe("false");
    expect(validated.NOTIFICATIONS_SMS_PROVIDER).toBe("stub");
    expect(validated.WAPPI_API_BASE_URL).toBe("https://wappi.pro");
  });

  it("rejects malformed scalar values", () => {
    expect(() =>
      validateEnvironment({
        PORT: "abc",
      }),
    ).toThrow("Environment variable PORT must be an integer");

    expect(() =>
      validateEnvironment({
        API_PREFIX: "/api/v1",
      }),
    ).toThrow('Environment variable API_PREFIX must not start with "/"');

    expect(() =>
      validateEnvironment({
        REDIS_URL: "not-a-url",
      }),
    ).toThrow("Environment variable REDIS_URL must be a valid URL");

    expect(() =>
      validateEnvironment({
        OTP_DEV_BYPASS: "yes",
      }),
    ).toThrow(
      'Environment variable OTP_DEV_BYPASS must be either "true" or "false"',
    );

    expect(() =>
      validateEnvironment({
        NOTIFICATIONS_SMS_STUB: "yes",
      }),
    ).toThrow(
      'Environment variable NOTIFICATIONS_SMS_STUB must be either "true" or "false"',
    );
  });

  it("requires Wappi credentials when Wappi SMS provider is enabled", () => {
    expect(() =>
      validateEnvironment({
        NOTIFICATIONS_SMS_PROVIDER: "wappi",
      }),
    ).toThrow("Environment variable WAPPI_TOKEN is required");

    const validated = validateEnvironment({
      NOTIFICATIONS_SMS_PROVIDER: "wappi",
      WAPPI_TOKEN: "token",
      WAPPI_PROFILE_ID: "profile",
    });

    expect(validated.NOTIFICATIONS_SMS_PROVIDER).toBe("wappi");
    expect(validated.WAPPI_TOKEN).toBe("token");
    expect(validated.WAPPI_PROFILE_ID).toBe("profile");
  });

  it("requires secure runtime secrets and storage config in production", () => {
    expect(() =>
      validateEnvironment({
        NODE_ENV: "production",
      }),
    ).toThrow(
      "Environment variable JWT_SECRET must be overridden in production",
    );

    expect(() =>
      validateEnvironment({
        NODE_ENV: "production",
        JWT_SECRET: "super-secret",
      }),
    ).toThrow("Environment variable S3_ENDPOINT is required");
  });

  it("accepts a complete production configuration", () => {
    const validated = validateEnvironment({
      NODE_ENV: "production",
      PORT: "8080",
      API_PREFIX: "api/v2",
      DATABASE_URL: "postgresql://prod:prod@db.example.com:5432/platform",
      REDIS_URL: "redis://cache.example.com:6379",
      JWT_SECRET: "super-secret",
      JWT_ACCESS_EXPIRES_IN: "10m",
      JWT_REFRESH_EXPIRES_IN: "7d",
      OTP_LENGTH: "4",
      OTP_TTL_SECONDS: "180",
      OTP_MAX_ATTEMPTS: "5",
      OTP_DEV_BYPASS: "false",
      S3_ENDPOINT: "https://s3.example.com",
      S3_REGION: "eu-central-1",
      S3_ACCESS_KEY_ID: "access",
      S3_SECRET_ACCESS_KEY: "secret",
      S3_BUCKET: "platform-prod",
      S3_FORCE_PATH_STYLE: "false",
    });

    expect(validated.NODE_ENV).toBe("production");
    expect(validated.PORT).toBe("8080");
    expect(validated.S3_BUCKET).toBe("platform-prod");
  });
});
