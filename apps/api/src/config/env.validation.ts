type RawEnv = Record<string, unknown>;

const DEFAULTS = {
  NODE_ENV: "development",
  PORT: "3000",
  API_PREFIX: "api/v1",
  DATABASE_URL: "postgresql://platform:platform@localhost:5432/platform_db",
  REDIS_URL: "redis://localhost:6379",
  JWT_SECRET: "development-secret",
  JWT_ACCESS_EXPIRES_IN: "15m",
  JWT_REFRESH_EXPIRES_IN: "30d",
  OTP_LENGTH: "4",
  OTP_TTL_SECONDS: "300",
  OTP_MAX_ATTEMPTS: "3",
  OTP_DEV_BYPASS: "false",
  OTP_DEBUG_RESPONSE_ENABLED: "false",
  APP_REVIEW_OTP_CODE: "2468",
  APP_REVIEW_PHONE_NUMBERS: "+77000000001,+77000000002",
  NOTIFICATIONS_SMS_STUB: "false",
  NOTIFICATIONS_SMS_PROVIDER: "stub",
  WAPPI_API_BASE_URL: "https://wappi.pro",
  S3_REGION: "auto",
  S3_FORCE_PATH_STYLE: "false",
} as const;

function readString(
  env: RawEnv,
  key: keyof typeof DEFAULTS | string,
): string | undefined {
  const value = env[key];

  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function readRequiredString(env: RawEnv, key: string): string {
  const value = readString(env, key);

  if (!value) {
    throw new Error(`Environment variable ${key} is required`);
  }

  return value;
}

function readStringWithDefault(
  env: RawEnv,
  key: keyof typeof DEFAULTS,
): string {
  return readString(env, key) ?? DEFAULTS[key];
}

function readInteger(
  env: RawEnv,
  key: keyof typeof DEFAULTS | string,
  options: {
    min: number;
    fallback: string;
  },
): string {
  const rawValue = readString(env, key) ?? options.fallback;
  const numericValue = Number(rawValue);

  if (!Number.isInteger(numericValue) || numericValue < options.min) {
    throw new Error(
      `Environment variable ${key} must be an integer greater than or equal to ${options.min}`,
    );
  }

  return String(numericValue);
}

function readBoolean(
  env: RawEnv,
  key: keyof typeof DEFAULTS | string,
  fallback: string,
): string {
  const rawValue = readString(env, key) ?? fallback;

  if (!["true", "false"].includes(rawValue)) {
    throw new Error(
      `Environment variable ${key} must be either "true" or "false"`,
    );
  }

  return rawValue;
}

function ensureUrl(value: string, key: string): string {
  try {
    // eslint-disable-next-line no-new
    new URL(value);
    return value;
  } catch {
    throw new Error(`Environment variable ${key} must be a valid URL`);
  }
}

function ensureApiPrefix(value: string): string {
  if (value.startsWith("/")) {
    throw new Error('Environment variable API_PREFIX must not start with "/"');
  }

  return value;
}

export function validateEnvironment(env: RawEnv): Record<string, string> {
  const nodeEnv = readStringWithDefault(env, "NODE_ENV");
  const isProduction = nodeEnv === "production";

  const validatedEnv: Record<string, string> = {
    NODE_ENV: nodeEnv,
    PORT: readInteger(env, "PORT", {
      min: 1,
      fallback: DEFAULTS.PORT,
    }),
    API_PREFIX: ensureApiPrefix(readStringWithDefault(env, "API_PREFIX")),
    DATABASE_URL: ensureUrl(
      readStringWithDefault(env, "DATABASE_URL"),
      "DATABASE_URL",
    ),
    REDIS_URL: ensureUrl(readStringWithDefault(env, "REDIS_URL"), "REDIS_URL"),
    JWT_SECRET: readStringWithDefault(env, "JWT_SECRET"),
    JWT_ACCESS_EXPIRES_IN: readStringWithDefault(env, "JWT_ACCESS_EXPIRES_IN"),
    JWT_REFRESH_EXPIRES_IN: readStringWithDefault(
      env,
      "JWT_REFRESH_EXPIRES_IN",
    ),
    OTP_LENGTH: readInteger(env, "OTP_LENGTH", {
      min: 4,
      fallback: DEFAULTS.OTP_LENGTH,
    }),
    OTP_TTL_SECONDS: readInteger(env, "OTP_TTL_SECONDS", {
      min: 60,
      fallback: DEFAULTS.OTP_TTL_SECONDS,
    }),
    OTP_MAX_ATTEMPTS: readInteger(env, "OTP_MAX_ATTEMPTS", {
      min: 1,
      fallback: DEFAULTS.OTP_MAX_ATTEMPTS,
    }),
    OTP_DEV_BYPASS: readBoolean(env, "OTP_DEV_BYPASS", DEFAULTS.OTP_DEV_BYPASS),
    OTP_DEBUG_RESPONSE_ENABLED: readBoolean(
      env,
      "OTP_DEBUG_RESPONSE_ENABLED",
      DEFAULTS.OTP_DEBUG_RESPONSE_ENABLED,
    ),
    APP_REVIEW_OTP_CODE: readStringWithDefault(env, "APP_REVIEW_OTP_CODE"),
    APP_REVIEW_PHONE_NUMBERS: readStringWithDefault(
      env,
      "APP_REVIEW_PHONE_NUMBERS",
    ),
    NOTIFICATIONS_SMS_STUB: readBoolean(
      env,
      "NOTIFICATIONS_SMS_STUB",
      DEFAULTS.NOTIFICATIONS_SMS_STUB,
    ),
    NOTIFICATIONS_SMS_PROVIDER: readStringWithDefault(
      env,
      "NOTIFICATIONS_SMS_PROVIDER",
    ),
    WAPPI_API_BASE_URL: ensureUrl(
      readStringWithDefault(env, "WAPPI_API_BASE_URL"),
      "WAPPI_API_BASE_URL",
    ),
    S3_REGION: readStringWithDefault(env, "S3_REGION"),
    S3_FORCE_PATH_STYLE: readBoolean(
      env,
      "S3_FORCE_PATH_STYLE",
      DEFAULTS.S3_FORCE_PATH_STYLE,
    ),
  };

  const optionalS3Endpoint = readString(env, "S3_ENDPOINT");
  if (optionalS3Endpoint) {
    validatedEnv.S3_ENDPOINT = ensureUrl(optionalS3Endpoint, "S3_ENDPOINT");
  }

  const optionalS3AccessKey = readString(env, "S3_ACCESS_KEY_ID");
  if (optionalS3AccessKey) {
    validatedEnv.S3_ACCESS_KEY_ID = optionalS3AccessKey;
  }

  const optionalS3Secret = readString(env, "S3_SECRET_ACCESS_KEY");
  if (optionalS3Secret) {
    validatedEnv.S3_SECRET_ACCESS_KEY = optionalS3Secret;
  }

  const optionalS3Bucket = readString(env, "S3_BUCKET");
  if (optionalS3Bucket) {
    validatedEnv.S3_BUCKET = optionalS3Bucket;
  }

  const optionalYandexGeocoderApiKey = readString(
    env,
    "YANDEX_GEOCODER_API_KEY",
  );
  if (optionalYandexGeocoderApiKey) {
    validatedEnv.YANDEX_GEOCODER_API_KEY = optionalYandexGeocoderApiKey;
  }

  const optionalYandexGeocoderBaseUrl = readString(
    env,
    "YANDEX_GEOCODER_BASE_URL",
  );
  if (optionalYandexGeocoderBaseUrl) {
    validatedEnv.YANDEX_GEOCODER_BASE_URL = ensureUrl(
      optionalYandexGeocoderBaseUrl,
      "YANDEX_GEOCODER_BASE_URL",
    );
  }

  const optionalWappiToken = readString(env, "WAPPI_TOKEN");
  if (optionalWappiToken) {
    validatedEnv.WAPPI_TOKEN = optionalWappiToken;
  }

  const optionalWappiProfileId = readString(env, "WAPPI_PROFILE_ID");
  if (optionalWappiProfileId) {
    validatedEnv.WAPPI_PROFILE_ID = optionalWappiProfileId;
  }

  const optionalWappiBotId = readString(env, "WAPPI_BOT_ID");
  if (optionalWappiBotId) {
    validatedEnv.WAPPI_BOT_ID = optionalWappiBotId;
  }

  if (validatedEnv.NOTIFICATIONS_SMS_PROVIDER.toLowerCase() === "wappi") {
    validatedEnv.WAPPI_TOKEN = readRequiredString(env, "WAPPI_TOKEN");
    validatedEnv.WAPPI_PROFILE_ID = readRequiredString(env, "WAPPI_PROFILE_ID");
  }

  if (validatedEnv.NOTIFICATIONS_SMS_PROVIDER.toLowerCase() === "smsc") {
    if (validatedEnv.NOTIFICATIONS_SMS_STUB !== "true") {
      validatedEnv.SMSC_LOGIN = readRequiredString(env, "SMSC_LOGIN");
      validatedEnv.SMSC_PASSWORD = readRequiredString(env, "SMSC_PASSWORD");
      if (
        validatedEnv.OTP_DEV_BYPASS === "true" ||
        validatedEnv.OTP_DEBUG_RESPONSE_ENABLED === "true"
      ) {
        throw new Error(
          "Live SMSC requires OTP_DEV_BYPASS=false and OTP_DEBUG_RESPONSE_ENABLED=false",
        );
      }
    }
    const sender = readString(env, "SMSC_SENDER");
    if (sender) validatedEnv.SMSC_SENDER = sender;
  }

  if (isProduction) {
    if (validatedEnv.JWT_SECRET === DEFAULTS.JWT_SECRET) {
      throw new Error(
        "Environment variable JWT_SECRET must be overridden in production",
      );
    }

    validatedEnv.S3_ENDPOINT = ensureUrl(
      readRequiredString(env, "S3_ENDPOINT"),
      "S3_ENDPOINT",
    );
    validatedEnv.S3_ACCESS_KEY_ID = readRequiredString(env, "S3_ACCESS_KEY_ID");
    validatedEnv.S3_SECRET_ACCESS_KEY = readRequiredString(
      env,
      "S3_SECRET_ACCESS_KEY",
    );
    validatedEnv.S3_BUCKET = readRequiredString(env, "S3_BUCKET");
  }

  validatedEnv.OTP_IP_MAX_ATTEMPTS = readInteger(env, "OTP_IP_MAX_ATTEMPTS", { min: 1, fallback: "100" });
  validatedEnv.KASPI_ENABLED = readBoolean(env, "KASPI_ENABLED", "false");
  const kaspiIps = readString(env, "KASPI_ALLOWED_IPS");
  if (kaspiIps) validatedEnv.KASPI_ALLOWED_IPS = kaspiIps;
  if (validatedEnv.KASPI_ENABLED === "true" && !kaspiIps) throw new Error("KASPI_ALLOWED_IPS is required when KASPI_ENABLED=true");
  const trustProxy = readString(env, "TRUST_PROXY");
  if (trustProxy) validatedEnv.TRUST_PROXY = trustProxy;
  return validatedEnv;
}
