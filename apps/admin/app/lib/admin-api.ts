import 'server-only';

import {
  assertAdminApiRuntimeConfig,
} from './admin-env';
import { readAdminApiResponse } from './admin-http';

function buildHeaders(init?: RequestInit): Headers {
  const headers = new Headers(init?.headers ?? {});
  headers.set('Content-Type', 'application/json');

  const { apiToken } = assertAdminApiRuntimeConfig();

  headers.set('Authorization', `Bearer ${apiToken}`);
  return headers;
}

export async function adminApiRequest<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const { apiBaseUrl } = assertAdminApiRuntimeConfig();
  const response = await fetch(`${apiBaseUrl}/${path}`, {
    ...init,
    headers: buildHeaders(init),
  });

  return readAdminApiResponse<T>(response, path);
}
