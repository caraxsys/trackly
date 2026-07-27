export interface ApiSuccessResponse<TData, TMeta = unknown> {
  success: true;
  data: TData;
  meta?: TMeta;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}
