const friendlyMessages: Record<string, string> = {
  INVALID_EMAIL_OR_PASSWORD: 'The email or password is incorrect.',
  USER_ALREADY_EXISTS: 'An account with this email already exists.',
  TOO_MANY_REQUESTS: 'Too many attempts. Please wait and try again.',
};

export function getAuthErrorMessage(
  error: { code?: string; message?: string } | null | undefined,
) {
  if (!error) {
    return 'Unable to connect. Check your connection and try again.';
  }

  if (error.code && friendlyMessages[error.code]) {
    return friendlyMessages[error.code];
  }

  return error.message || 'Authentication failed. Please try again.';
}
