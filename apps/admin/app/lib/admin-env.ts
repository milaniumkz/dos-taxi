import 'server-only';

export const DEFAULT_ADMIN_API_BASE_URL = 'http://localhost:3000/api/v1';

export class AdminEnvError extends Error {
  constructor(
    readonly code: 'ADMIN_API_TOKEN_MISSING' | 'ADMIN_API_URL_INVALID',
    message?: string,
  ) {
    super(message ?? code);
    this.name = 'AdminEnvError';
  }
}

export type AdminRuntimeConfig = {
  apiBaseUrl: string;
  apiToken: string;
  warnings: Array<'ADMIN_API_TOKEN_MISSING' | 'ADMIN_API_URL_INVALID'>;
};

function normalizeOptionalString(value: string | undefined): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function normalizeApiBaseUrl(value: string): string {
  try {
    const url = new URL(value);
    return url.toString().replace(/\/$/, '');
  } catch {
    throw new AdminEnvError(
      'ADMIN_API_URL_INVALID',
      'ADMIN_API_URL must be a valid absolute URL',
    );
  }
}

export function resolveAdminRuntimeConfig(): AdminRuntimeConfig {
  const warnings: Array<'ADMIN_API_TOKEN_MISSING' | 'ADMIN_API_URL_INVALID'> = [];
  const rawApiBaseUrl = normalizeOptionalString(process.env.ADMIN_API_URL);
  const rawToken = normalizeOptionalString(process.env.ADMIN_API_TOKEN) ?? '';

  let apiBaseUrl = DEFAULT_ADMIN_API_BASE_URL;

  if (rawApiBaseUrl) {
    try {
      apiBaseUrl = normalizeApiBaseUrl(rawApiBaseUrl);
    } catch (error) {
      if (error instanceof AdminEnvError) {
        warnings.push(error.code);
      } else {
        warnings.push('ADMIN_API_URL_INVALID');
      }
    }
  }

  if (!rawToken) {
    warnings.push('ADMIN_API_TOKEN_MISSING');
  }

  return {
    apiBaseUrl,
    apiToken: rawToken,
    warnings,
  };
}

export function getAdminApiBaseUrl(): string {
  const config = resolveAdminRuntimeConfig();

  if (config.warnings.includes('ADMIN_API_URL_INVALID')) {
    throw new AdminEnvError(
      'ADMIN_API_URL_INVALID',
      'ADMIN_API_URL must be a valid absolute URL',
    );
  }

  return config.apiBaseUrl;
}

export function getAdminApiToken(): string {
  return resolveAdminRuntimeConfig().apiToken;
}

export function assertAdminApiRuntimeConfig(): {
  apiBaseUrl: string;
  apiToken: string;
} {
  const config = resolveAdminRuntimeConfig();

  if (config.warnings.includes('ADMIN_API_URL_INVALID')) {
    throw new AdminEnvError(
      'ADMIN_API_URL_INVALID',
      'ADMIN_API_URL must be a valid absolute URL',
    );
  }

  if (!config.apiToken) {
    throw new AdminEnvError(
      'ADMIN_API_TOKEN_MISSING',
      'ADMIN_API_TOKEN is required for live admin API requests',
    );
  }

  return {
    apiBaseUrl: config.apiBaseUrl,
    apiToken: config.apiToken,
  };
}
