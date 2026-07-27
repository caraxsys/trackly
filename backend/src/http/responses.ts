export interface SuccessResponse<TData, TMeta = unknown> {
  success: true;
  data: TData;
  meta?: TMeta;
}

export interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export function successResponse<TData>(data: TData): SuccessResponse<TData>;
export function successResponse<TData, TMeta>(
  data: TData,
  meta: TMeta,
): SuccessResponse<TData, TMeta>;
export function successResponse<TData, TMeta>(data: TData, meta?: TMeta) {
  return meta === undefined
    ? { success: true as const, data }
    : { success: true as const, data, meta };
}

export function errorResponse(
  code: string,
  message: string,
  details?: unknown,
): ErrorResponse {
  return details === undefined
    ? { success: false, error: { code, message } }
    : { success: false, error: { code, message, details } };
}
