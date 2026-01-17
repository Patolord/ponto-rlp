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

export { mapCheckTypeNumber } from "./types";

// Client utilities
export {
  getAccessToken,
  clearSession,
  isAuthenticated,
  rhidFetch,
  formatDateForRhid,
} from "./client";

// Auth API
export { login, logout } from "./api/auth";

// Employee API
export { fetchEmployees, fetchActiveEmployees } from "./api/employees";

// Attendance API
export { fetchPontoChecks, fetchWorksites } from "./api/attendance";
