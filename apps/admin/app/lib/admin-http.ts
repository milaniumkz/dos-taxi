const TRACE_ID_HEADER = 'x-trace-id';

type AdminApiErrorPayload = {
  code?: string;
  message?: string;
  details?: Record<string, unknown>;
  traceId?: string;
};

export class AdminApiRequestError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly path: string,
    readonly code?: string,
    readonly traceId?: string,
    readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'AdminApiRequestError';
  }
}

function buildAdminApiErrorMessage(input: {
  path: string;
  status: number;
  code?: string;
  message?: string;
  traceId?: string;
}): string {
  const fallbackMessage = `${input.path} -> ${input.status}`;
  const message = input.message?.trim() || fallbackMessage;
  const base = input.code ? `${input.code}: ${message}` : message;
  return input.traceId ? `${base} (trace ${input.traceId})` : base;
}

async function parseAdminApiError(
  response: Response,
  path: string,
): Promise<AdminApiRequestError> {
  const headerTraceId = response.headers.get(TRACE_ID_HEADER) ?? undefined;
  let payload: AdminApiErrorPayload | null = null;
  let textBody: string | null = null;

  try {
    payload = (await response.json()) as AdminApiErrorPayload;
  } catch {
    try {
      textBody = await response.text();
    } catch {
      textBody = null;
    }
  }

  const traceId = payload?.traceId ?? headerTraceId;
  const message = buildAdminApiErrorMessage({
    path,
    status: response.status,
    code: payload?.code,
    message: payload?.message ?? textBody ?? undefined,
    traceId,
  });

  return new AdminApiRequestError(
    message,
    response.status,
    path,
    payload?.code,
    traceId,
    payload?.details,
  );
}

export function formatAdminApiError(error: unknown): string {
  if (error instanceof AdminApiRequestError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

export async function readAdminApiResponse<T>(
  response: Response,
  path: string,
): Promise<T> {
  if (!response.ok) {
    throw await parseAdminApiError(response, path);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}
