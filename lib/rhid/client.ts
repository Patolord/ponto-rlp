"use server";

import { cookies } from "next/headers";
import { RHID_CONFIG } from "./config";

/**
 * RHID API Client
 * Centralized HTTP client for all RHID API interactions
 */

// ============================================================================
// Token Management
// ============================================================================

/** Get the access token from cookies */
export async function getAccessToken(): Promise<string | null> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(RHID_CONFIG.TOKEN_COOKIE_NAME);
  return sessionCookie?.value || null;
}

/** Store the access token in cookies */
export async function setAccessToken(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(RHID_CONFIG.TOKEN_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: RHID_CONFIG.COOKIE_MAX_AGE,
    path: "/",
  });
}

/** Clear the session cookie */
export async function clearSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(RHID_CONFIG.TOKEN_COOKIE_NAME);
}

/** Check if user is authenticated */
export async function isAuthenticated(): Promise<boolean> {
  const token = await getAccessToken();
  return token !== null;
}

// ============================================================================
// Error Detection
// ============================================================================

/** Check if error response indicates an expired token */
export function isExpiredTokenError(
  statusCode: number,
  responseText: string
): boolean {
  // RHID returns 400 with "DoLoginExpirTok" when token is expired
  if (statusCode === 400 && responseText.includes("DoLoginExpirTok")) {
    return true;
  }
  // Also handle standard 401 Unauthorized
  if (statusCode === 401) {
    return true;
  }
  return false;
}

// ============================================================================
// HTTP Client
// ============================================================================

export type RhidFetchOptions = {
  /** HTTP method */
  method?: "GET" | "POST" | "PUT" | "DELETE";
  /** Request body (will be JSON stringified) */
  body?: unknown;
  /** Whether to use the customerdb base URL (default: true) */
  useCustomerDb?: boolean;
  /** Whether to require authentication (default: true) */
  requireAuth?: boolean;
};

export type RhidFetchResult<T> =
  | { success: true; data: T }
  | { success: false; error: string; sessionExpired?: boolean };

/**
 * Centralized fetch function for RHID API
 * Handles authentication, error detection, and session management
 */
export async function rhidFetch<T>(
  endpoint: string,
  options: RhidFetchOptions = {}
): Promise<RhidFetchResult<T>> {
  const {
    method = "GET",
    body,
    useCustomerDb = true,
    requireAuth = true,
  } = options;

  // Build headers
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };

  // Add auth header if required
  if (requireAuth) {
    const accessToken = await getAccessToken();
    if (!accessToken) {
      return { success: false, error: "Não autenticado", sessionExpired: true };
    }
    headers.authorization = `Bearer ${accessToken}`;
  }

  // Build URL
  const baseUrl = useCustomerDb
    ? RHID_CONFIG.CUSTOMERDB_URL
    : RHID_CONFIG.BASE_URL;
  const url = `${baseUrl}${endpoint}`;

  try {
    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      cache: "no-store",
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        `RHID API error [${endpoint}]:`,
        response.status,
        errorText.slice(0, 200)
      );

      // Check for expired token
      if (isExpiredTokenError(response.status, errorText)) {
        await clearSession();
        return { success: false, error: "Sessão expirada", sessionExpired: true };
      }

      return { success: false, error: `Erro na requisição: ${response.status}` };
    }

    const data: T = await response.json();
    return { success: true, data };
  } catch (error) {
    console.error(`RHID API connection error [${endpoint}]:`, error);
    return { success: false, error: "Erro de conexão" };
  }
}

// ============================================================================
// Date Formatting
// ============================================================================

/** Format date as YYYYMMDD for the RHID API */
export function formatDateForRhid(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}${month}${day}`;
}
