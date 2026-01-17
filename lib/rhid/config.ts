/**
 * RHID API Configuration
 * Centralized configuration for all RHID API interactions
 */

export const RHID_CONFIG = {
  /** Base URL for authentication endpoints */
  BASE_URL: "https://rhid.com.br/v2",
  /** Base URL for customer database endpoints (employees, attendance, etc.) */
  CUSTOMERDB_URL: "https://rhid.com.br/v2/customerdb",
  /** Cookie name for storing the session token */
  TOKEN_COOKIE_NAME: "rhid_session",
  /** Cookie max age in seconds (24 hours) */
  COOKIE_MAX_AGE: 60 * 60 * 24,
} as const;

/** Default company ID for API requests */
export const DEFAULT_COMPANY_ID = 1;
