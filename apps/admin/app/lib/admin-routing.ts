import { AdminLocale } from './admin-i18n';

export type RouteSearchParams = Record<
  string,
  string | string[] | undefined
>;

export type AsyncRouteSearchParams =
  | Promise<RouteSearchParams>
  | RouteSearchParams
  | undefined;

export async function resolveRouteSearchParams(
  searchParams?: AsyncRouteSearchParams,
): Promise<RouteSearchParams> {
  return searchParams ? await searchParams : {};
}

export function getSearchParam(
  params: RouteSearchParams,
  key: string,
): string | undefined {
  const value = params[key];
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

export function buildReturnPath(
  path: string,
  params: RouteSearchParams,
  locale: AdminLocale,
): string {
  const urlParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (key === 'notice' || key === 'error') {
      continue;
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        urlParams.append(key, item);
      }
      continue;
    }

    if (value) {
      urlParams.set(key, value);
    }
  }

  if (!urlParams.has('lang')) {
    urlParams.set('lang', locale);
  }

  const query = urlParams.toString();
  return query ? `${path}?${query}` : path;
}

export function buildPathWithOverrides(
  path: string,
  params: RouteSearchParams,
  locale: AdminLocale,
  overrides: Record<string, string | undefined>,
): string {
  const urlParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (key === 'notice' || key === 'error') {
      continue;
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        urlParams.append(key, item);
      }
      continue;
    }

    if (value) {
      urlParams.set(key, value);
    }
  }

  for (const [key, value] of Object.entries(overrides)) {
    if (value === undefined || value === '') {
      urlParams.delete(key);
      continue;
    }
    urlParams.set(key, value);
  }

  if (!urlParams.has('lang')) {
    urlParams.set('lang', locale);
  }

  const query = urlParams.toString();
  return query ? `${path}?${query}` : path;
}
