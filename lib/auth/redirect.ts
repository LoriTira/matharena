/**
 * Validates that a redirect path is safe (relative, no open-redirect tricks).
 */
export function isValidRedirectPath(path: string): boolean {
  return (
    path.startsWith('/') &&
    !path.startsWith('//') &&
    !path.includes('\\') &&
    !path.includes('\n') &&
    !path.includes('\r')
  );
}

/**
 * Returns the redirect path if valid, otherwise the fallback.
 */
export function getValidRedirect(
  param: string | null | undefined,
  fallback = '/dashboard'
): string {
  if (param && isValidRedirectPath(param)) return param;
  return fallback;
}
