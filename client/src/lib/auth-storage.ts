/**
 * Simple auth token storage using sessionStorage
 * sessionStorage is cleared when the browser tab is closed
 */

const AUTH_TOKEN_KEY = 'auth_token';

export const authStorage = {
  /**
   * Get the stored auth token
   */
  getToken: (): string | null => {
    if (typeof window === 'undefined') return null;
    return sessionStorage.getItem(AUTH_TOKEN_KEY);
  },

  /**
   * Store the auth token
   */
  setToken: (token: string): void => {
    if (typeof window === 'undefined') return;
    sessionStorage.setItem(AUTH_TOKEN_KEY, token);
  },

  /**
   * Clear the auth token
   */
  clearToken: (): void => {
    if (typeof window === 'undefined') return;
    sessionStorage.removeItem(AUTH_TOKEN_KEY);
  },

  /**
   * Check if token exists
   */
  hasToken: (): boolean => {
    if (typeof window === 'undefined') return false;
    return sessionStorage.getItem(AUTH_TOKEN_KEY) !== null;
  },
};
