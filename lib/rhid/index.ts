/**
 * RHID API Library
 *
 * Centralized library for interacting with the RHID third-party API.
 * Provides authentication, employee management, and attendance tracking.
 *
 * @example
 * import { login, fetchEmployees, fetchPontoChecks } from "@/lib/rhid";
 */

// Configuration
export { RHID_CONFIG, DEFAULT_COMPANY_ID } from "./config";

// Types
export type {
  // API Response Types
  LoginResponse,
  Geofence,
  AfdMobileRecord,
  Person,
  EmployeeCheckIn,
  // App Types
  Employee,
  PontoCheck,
  Worksite,
  // Result Types
  FetchResult,
  LoginResult,
} from "./types";

export { mapCheckTypeNumber, TRACKED_DEPARTMENTS } from "./types";

// Client utilities
export {
  getAccessToken,
  clearSession,
  isAuthenticated,
  rhidFetch,
} from "./client";

// Utility functions
export { formatDateForRhid, isExpiredTokenError } from "./utils";

// Auth API
export { login, logout } from "./api/auth";

// Employee API
export { fetchEmployees, fetchActiveEmployees } from "./api/employees";

// Attendance API
export { fetchPontoChecks, fetchWorksites } from "./api/attendance";

// React Query Hooks (client-side only)
// Import directly from "@/lib/rhid/hooks" in client components
export {
  useEmployees,
  usePontoChecks,
  useWorksites,
  useRefreshRhidData,
} from "./hooks";
