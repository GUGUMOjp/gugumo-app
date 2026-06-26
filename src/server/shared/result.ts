export type ServerResult<TData = void, TError = unknown> = {
  ok: true;
  data: TData;
  error: null;
} | {
  ok: false;
  data: null;
  error: TError;
};

export function ok<TData = void>(data: TData): ServerResult<TData, never> {
  return {
    ok: true,
    data,
    error: null,
  };
}

export function err<TError>(error: TError): ServerResult<never, TError> {
  return {
    ok: false,
    data: null,
    error,
  };
}
