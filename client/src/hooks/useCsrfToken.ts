/**
 * CSRF Token Hook
 * 
 * Fetches a CSRF token from the server on mount and refreshes it periodically.
 * The token is stored in memory and used by the tRPC client for all mutations.
 */

let csrfToken: string | null = null;
let fetchPromise: Promise<string> | null = null;

export async function fetchCsrfToken(): Promise<string> {
  // If already fetching, return the existing promise (dedup)
  if (fetchPromise) {
    return fetchPromise;
  }

  fetchPromise = (async () => {
    try {
      const response = await fetch('/api/csrf-token', {
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error(`CSRF token fetch failed: ${response.status}`);
      }
      
      const data = await response.json();
      csrfToken = data.token;
      return data.token as string;
    } catch (error) {
      console.error('[CSRF] Failed to fetch token:', error);
      throw error;
    } finally {
      fetchPromise = null;
    }
  })();

  return fetchPromise;
}

export function getCsrfToken(): string | null {
  return csrfToken;
}

/**
 * Initialize CSRF protection:
 * - Fetch initial token
 * - Set up periodic refresh (every 50 minutes, token expires in 60)
 */
export function initCsrfProtection(): void {
  // Fetch initial token
  fetchCsrfToken().catch(() => {
    // Retry after 5 seconds if initial fetch fails
    setTimeout(() => fetchCsrfToken().catch(() => {}), 5000);
  });

  // Refresh token every 50 minutes (token TTL is 60 minutes)
  setInterval(() => {
    fetchCsrfToken().catch(() => {});
  }, 50 * 60 * 1000);
}
