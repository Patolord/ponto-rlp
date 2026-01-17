/**
 * RHID Utility Functions
 * Non-async helper functions that don't need "use server"
 */

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

/** Format date as YYYYMMDD for the RHID API */
export function formatDateForRhid(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}${month}${day}`;
}
