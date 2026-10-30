"use client";

import type { Dictionary } from "@/messages/en";

export class ClientApiError extends Error {
  status: number;
  code: string;
  fieldErrors: Array<{ path: string; message: string }>;

  constructor(
    message: string,
    status: number,
    code: string,
    fieldErrors: Array<{ path: string; message: string }> = [],
  ) {
    super(message);
    this.status = status;
    this.code = code;
    this.fieldErrors = fieldErrors;
  }
}

type ErrorBody = {
  error?: {
    code?: string;
    message?: string;
    details?: Array<{ path?: string; message?: string }>;
  };
};

export async function apiRequest<T>(
  path: string,
  options: { method?: string; body?: unknown } = {},
): Promise<T> {
  const response = await fetch(path, {
    method: options.method ?? "POST",
    headers: { "Content-Type": "application/json" },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    credentials: "same-origin",
  });

  let data: unknown = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    const body = (data ?? {}) as ErrorBody;
    throw new ClientApiError(
      body.error?.message ?? "Request failed",
      response.status,
      body.error?.code ?? "request_failed",
      (body.error?.details ?? [])
        .filter((item) => item.message)
        .map((item) => ({ path: item.path ?? "", message: item.message ?? "" })),
    );
  }

  return data as T;
}

/** Maps an API error onto user-facing copy in the requested locale. */
export function describeError(error: unknown, dict: Dictionary): string {
  if (!(error instanceof ClientApiError)) return dict.errors.network;
  switch (error.code) {
    case "rate_limited":
    case "too_many_attempts":
      return dict.errors.rateLimited;
    case "unauthorized":
      return dict.errors.unauthorized;
    case "forbidden":
      return dict.errors.forbidden;
    case "cross_origin":
      return dict.errors.crossOrigin;
    case "invalid_code":
      return dict.auth.invalidCode;
    case "duplicate_request":
      return dict.request.duplicate;
    case "validation_error":
      return error.fieldErrors[0]?.message ?? dict.errors.validation;
    default:
      return error.message || dict.errors.unknown;
  }
}
