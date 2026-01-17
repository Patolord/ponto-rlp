"use server";

import { rhidFetch } from "../client";
import type { Employee, FetchResult } from "../types";
import { TRACKED_DEPARTMENTS } from "../types";

/** Raw employee data from RHID API */
interface RhidEmployee {
  id: number;
  name?: string;
  Name?: string;
  nome?: string;
  departmentName?: string;
  department?: string;
  excluded?: boolean;
  status?: number;
}

/** API response wrapper */
interface EmployeesResponse {
  data: RhidEmployee[];
}

/**
 * Fetch all active employees from RHID API
 * Filters by tracked departments: Obra, Escritorio, Manutencao
 */
export async function fetchEmployees(): Promise<FetchResult<Employee[]>> {
  const result = await rhidFetch<EmployeesResponse>(
    "/person.svc/a_status/ativo"
  );

  if (!result.success) {
    return {
      success: false,
      error: result.sessionExpired ? "Sessão expirada" : result.error,
    };
  }

  // Extract data array from response
  const rawData = result.data?.data;
  if (!Array.isArray(rawData)) {
    console.error("Employees API: unexpected response format", result.data);
    return { success: true, data: [] };
  }

  console.log(`Employees API: received ${rawData.length} total employees`);

  // Map and filter by tracked departments
  const employees: Employee[] = rawData
    .filter((emp) => {
      const dept = emp.departmentName || emp.department || "";
      // Check if department matches any tracked department (case-insensitive)
      return TRACKED_DEPARTMENTS.some(
        (tracked) => dept.toLowerCase() === tracked.toLowerCase()
      );
    })
    .map((emp) => ({
      id: Number(emp.id),
      nome: String(emp.name || emp.Name || emp.nome || ""),
      foto: undefined,
      cargo: undefined,
      departamento: emp.departmentName || emp.department,
      ativo: true,
    }));

  console.log(
    `Employees: filtered to ${employees.length} employees in tracked departments (${TRACKED_DEPARTMENTS.join(", ")})`
  );

  return { success: true, data: employees };
}

/**
 * Fetch active employees (alias for fetchEmployees)
 */
export async function fetchActiveEmployees(): Promise<FetchResult<Employee[]>> {
  return fetchEmployees();
}
