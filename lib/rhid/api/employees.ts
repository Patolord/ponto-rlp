"use server";

import { rhidFetch } from "../client";
import type { Employee, FetchResult } from "../types";

/**
 * Fetch all active employees from RHID API
 */
export async function fetchEmployees(): Promise<FetchResult<Employee[]>> {
  const result = await rhidFetch<Record<string, unknown>[]>(
    "/person.svc/a_ativo"
  );

  if (!result.success) {
    return {
      success: false,
      error: result.sessionExpired ? "Sessão expirada" : result.error,
    };
  }

  // Map API response to our Employee type
  const employees: Employee[] = Array.isArray(result.data)
    ? result.data.map((emp) => ({
        id: Number(emp.id || emp.Id),
        nome: String(emp.name || emp.Name || emp.nome || ""),
        foto: undefined,
        cargo: undefined,
        ativo: true,
      }))
    : [];

  console.log("Employees response: got", employees.length, "employees");

  return { success: true, data: employees };
}

/**
 * Fetch active employees (alias for fetchEmployees)
 */
export async function fetchActiveEmployees(): Promise<FetchResult<Employee[]>> {
  return fetchEmployees();
}
