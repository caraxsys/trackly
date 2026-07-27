export function safeInternalRedirect(
  value: string | null | undefined,
  fallback = '/today',
) {
  if (!value || !value.startsWith('/') || value.startsWith('//')) {
    return fallback;
  }

  return value;
}
