"use server";

import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { fetchEmployees, fetchPontoChecks } from "@/lib/rhid";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

// Format date as YYYY-MM-DD for Convex storage
function formatDateForStorage(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export type SyncResult =
  | { success: true; data: { inserted: number; updated: number } }
  | { success: false; error: string };

// Sync today's attendance data from RHID to Convex
export async function syncTodayAttendance(): Promise<SyncResult> {
  try {
    // Fetch current data from RHID
    const [employeesResult, checksResult] = await Promise.all([
      fetchEmployees(),
      fetchPontoChecks(),
    ]);

    if (!employeesResult.success) {
      return { success: false, error: employeesResult.error };
    }

    if (!checksResult.success) {
      return { success: false, error: checksResult.error };
    }

    const employees = employeesResult.data;
    const checks = checksResult.data;
    const today = formatDateForStorage(new Date());

    // Build attendance records
    // First, build map of check data per employee
    const checkData = new Map<
      number,
      {
        firstCheckIn?: string;
        lastCheckOut?: string;
        worksiteId?: number;
        worksiteName?: string;
      }
    >();

    for (const check of checks) {
      const existing = checkData.get(check.funcionarioId);
      const checkTime = new Date(check.dataHora).getTime();

      if (!existing) {
        checkData.set(check.funcionarioId, {
          firstCheckIn: check.dataHora,
          lastCheckOut: check.dataHora,
          worksiteId: check.obraId,
          worksiteName: check.obraNome,
        });
      } else {
        const firstTime = existing.firstCheckIn
          ? new Date(existing.firstCheckIn).getTime()
          : Infinity;
        const lastTime = existing.lastCheckOut
          ? new Date(existing.lastCheckOut).getTime()
          : 0;

        if (checkTime < firstTime) {
          existing.firstCheckIn = check.dataHora;
          // Update worksite based on first check-in
          existing.worksiteId = check.obraId;
          existing.worksiteName = check.obraNome;
        }
        if (checkTime > lastTime) {
          existing.lastCheckOut = check.dataHora;
        }
      }
    }

    // Build records for all employees
    const records = employees.map((emp) => {
      const checkInfo = checkData.get(emp.id);
      const isPresent = !!checkInfo;

      return {
        date: today,
        rhidEmployeeId: emp.id,
        employeeName: emp.nome,
        worksiteId: checkInfo?.worksiteId,
        worksiteName: checkInfo?.worksiteName,
        firstCheckIn: checkInfo?.firstCheckIn,
        lastCheckOut: checkInfo?.lastCheckOut,
        status: isPresent ? "present" : "absent",
      };
    });

    // Also add employees from checks that might not be in the employees list
    const employeeIds = new Set(employees.map((e) => e.id));
    for (const check of checks) {
      if (!employeeIds.has(check.funcionarioId)) {
        const checkInfo = checkData.get(check.funcionarioId);
        records.push({
          date: today,
          rhidEmployeeId: check.funcionarioId,
          employeeName: check.funcionarioNome,
          worksiteId: checkInfo?.worksiteId,
          worksiteName: checkInfo?.worksiteName,
          firstCheckIn: checkInfo?.firstCheckIn,
          lastCheckOut: checkInfo?.lastCheckOut,
          status: "present",
        });
      }
    }

    // Sync to Convex
    const result = await convex.mutation(api.attendance.syncDailyAttendance, {
      records,
    });

    return { success: true, data: result };
  } catch (error) {
    console.error("Sync attendance error:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Erro ao sincronizar dados",
    };
  }
}

// Get the daily cost setting from Convex
export async function getDailyCost(): Promise<number> {
  try {
    const cost = await convex.query(api.settings.getDailyCost, {});
    return cost;
  } catch (error) {
    console.error("Get daily cost error:", error);
    return 150; // Default fallback
  }
}

// Set the daily cost in Convex
export async function setDailyCost(
  cost: number
): Promise<{ success: boolean; error?: string }> {
  try {
    await convex.mutation(api.settings.set, {
      key: "dailyCost",
      value: cost.toString(),
    });
    return { success: true };
  } catch (error) {
    console.error("Set daily cost error:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Erro ao salvar configuração",
    };
  }
}
