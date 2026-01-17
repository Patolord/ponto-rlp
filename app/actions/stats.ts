"use server";

import { fetchPontoChecks } from "@/lib/rhid";

// Types matching the Convex query return shapes
export type ManDaysByEmployee = {
  rhidEmployeeId: number;
  employeeName: string;
  totalDays: number;
  worksiteBreakdown: {
    worksiteId?: number;
    worksiteName?: string;
    days: number;
  }[];
};

export type ManDaysByWorksite = {
  worksiteId?: number;
  worksiteName?: string;
  totalManDays: number;
  uniqueEmployees: number;
  employeeBreakdown: {
    rhidEmployeeId: number;
    employeeName: string;
    days: number;
  }[];
};

export type MonthlyStatsResult =
  | {
      success: true;
      data: {
        manDaysByEmployee: ManDaysByEmployee[];
        manDaysByWorksite: ManDaysByWorksite[];
        totalManDays: number;
        uniqueEmployees: number;
        uniqueWorksites: number;
      };
    }
  | { success: false; error: string };

/**
 * Fetch monthly statistics directly from RHID API
 * Aggregates man-days by employee and by worksite
 */
export async function fetchMonthlyStats(
  year: number,
  month: number
): Promise<MonthlyStatsResult> {
  try {
    // Build date range for the month (month is 1-indexed)
    // RHID API expects dates in YYYYMMDD format (no dashes)
    const startDate = `${year}${String(month).padStart(2, "0")}01`;
    const lastDay = new Date(year, month, 0).getDate(); // Get last day of month
    const endDate = `${year}${String(month).padStart(2, "0")}${String(lastDay).padStart(2, "0")}`;

    console.log(`Fetching RHID stats for ${startDate} to ${endDate}`);

    const result = await fetchPontoChecks(startDate, endDate);

    if (!result.success) {
      return { success: false, error: result.error };
    }

    const checks = result.data;

    // Helper to extract YYYY-MM-DD from any date format
    function extractDate(dateStr: string): string {
      // Try parsing as Date object for robust handling
      const d = new Date(dateStr);
      if (!isNaN(d.getTime())) {
        return d.toISOString().split("T")[0];
      }
      // Fallback: try to extract date portion manually
      // Handle formats like "2026-01-15T08:00:00" or "2026-01-15 08:00:00"
      const match = dateStr.match(/(\d{4}-\d{2}-\d{2})/);
      if (match) {
        return match[1];
      }
      // Last resort: return first 10 chars if they look like a date
      return dateStr.slice(0, 10);
    }

    // First pass: collect all employee-date combinations with their primary worksite
    // An employee should count as 1 day even if they checked in at multiple worksites
    const employeeDateMap = new Map<
      string, // "employeeId-date"
      {
        employeeId: number;
        employeeName: string;
        date: string;
        worksites: Set<number | undefined>; // All worksites visited that day
        primaryWorksiteId?: number;
        primaryWorksiteName?: string;
      }
    >();

    for (const check of checks) {
      const date = extractDate(check.dataHora);
      const key = `${check.funcionarioId}-${date}`;

      if (!employeeDateMap.has(key)) {
        employeeDateMap.set(key, {
          employeeId: check.funcionarioId,
          employeeName: check.funcionarioNome,
          date,
          worksites: new Set(),
          primaryWorksiteId: check.obraId,
          primaryWorksiteName: check.obraNome,
        });
      }

      // Track all worksites visited that day
      employeeDateMap.get(key)!.worksites.add(check.obraId);
    }

    // Aggregate by employee - each date counts as 1 day
    const employeeMap = new Map<
      number,
      {
        employeeName: string;
        totalDays: number;
        worksites: Map<number | undefined, { name?: string; days: number }>;
      }
    >();

    for (const record of employeeDateMap.values()) {
      if (!employeeMap.has(record.employeeId)) {
        employeeMap.set(record.employeeId, {
          employeeName: record.employeeName,
          totalDays: 0,
          worksites: new Map(),
        });
      }

      const emp = employeeMap.get(record.employeeId)!;

      // Count this date as 1 day
      emp.totalDays++;

      // Track worksite breakdown (use primary worksite for the day)
      const wsKey = record.primaryWorksiteId;
      if (!emp.worksites.has(wsKey)) {
        emp.worksites.set(wsKey, { name: record.primaryWorksiteName, days: 0 });
      }
      emp.worksites.get(wsKey)!.days++;
    }

    const manDaysByEmployee: ManDaysByEmployee[] = Array.from(
      employeeMap.entries()
    ).map(([id, data]) => ({
      rhidEmployeeId: id,
      employeeName: data.employeeName,
      totalDays: data.totalDays,
      worksiteBreakdown: Array.from(data.worksites.entries()).map(
        ([wsId, wsData]) => ({
          worksiteId: wsId,
          worksiteName: wsData.name,
          days: wsData.days,
        })
      ),
    }));

    // Aggregate by worksite (using primary worksite per employee-date)
    const worksiteMap = new Map<
      number | undefined,
      {
        worksiteName?: string;
        employees: Map<number, { name: string; days: number }>;
      }
    >();

    for (const record of employeeDateMap.values()) {
      const wsKey = record.primaryWorksiteId;

      if (!worksiteMap.has(wsKey)) {
        worksiteMap.set(wsKey, {
          worksiteName: record.primaryWorksiteName,
          employees: new Map(),
        });
      }

      const ws = worksiteMap.get(wsKey)!;
      if (!ws.employees.has(record.employeeId)) {
        ws.employees.set(record.employeeId, {
          name: record.employeeName,
          days: 0,
        });
      }
      ws.employees.get(record.employeeId)!.days++;
    }

    const manDaysByWorksite: ManDaysByWorksite[] = Array.from(
      worksiteMap.entries()
    )
      .filter(([id]) => id !== undefined) // Filter out records without worksite
      .map(([id, data]) => {
        const employeeBreakdown = Array.from(data.employees.entries()).map(
          ([empId, empData]) => ({
            rhidEmployeeId: empId,
            employeeName: empData.name,
            days: empData.days,
          })
        );

        return {
          worksiteId: id,
          worksiteName: data.worksiteName,
          totalManDays: employeeBreakdown.reduce((sum, e) => sum + e.days, 0),
          uniqueEmployees: employeeBreakdown.length,
          employeeBreakdown,
        };
      });

    // Calculate totals
    const totalManDays = manDaysByEmployee.reduce(
      (sum, e) => sum + e.totalDays,
      0
    );
    const uniqueEmployees = manDaysByEmployee.length;
    const uniqueWorksites = manDaysByWorksite.length;

    console.log(
      `RHID stats: ${totalManDays} man-days, ${uniqueEmployees} employees, ${uniqueWorksites} worksites`
    );

    return {
      success: true,
      data: {
        manDaysByEmployee,
        manDaysByWorksite,
        totalManDays,
        uniqueEmployees,
        uniqueWorksites,
      },
    };
  } catch (error) {
    console.error("Fetch monthly stats error:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Erro ao buscar estatísticas do RHID",
    };
  }
}
