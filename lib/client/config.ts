/**
 * Get the API base URL based on environment
 * @returns The base URL for API requests
 */
export function getApiBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_API_BASE_URL) {
    return process.env.NEXT_PUBLIC_API_BASE_URL;
  }

  if (typeof window !== 'undefined') {
    return window.location.origin;
  }

  // Server-side default
  return 'http://localhost:3000';
}

/**
 * Build full API URL from path
 * @param path - API path (e.g., '/api/strava/auth')
 * @returns Complete URL
 */
export function getApiUrl(path: string): string {
  const baseUrl = getApiBaseUrl();
  const normalizedBaseUrl = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  return new URL(cleanPath, normalizedBaseUrl).toString();
}
