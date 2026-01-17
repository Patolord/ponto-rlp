"use client";

import { useState, useMemo } from "react";
import dynamic from "next/dynamic";
import {
  useEmployees,
  usePontoChecks,
  useWorksites,
  useRefreshRhidData,
} from "@/lib/rhid/hooks";
import DashboardHeader, { type AttendanceFilter } from "./DashboardHeader";
import EmployeeList from "./EmployeeList";
import WorksiteList from "./WorksiteList";

// Dynamic import for map (requires client-side only)
const LeafletMap = dynamic(() => import("./LeafletMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-slate-800 flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-400 text-sm">Carregando mapa...</p>
      </div>
    </div>
  ),
});

export default function Dashboard() {
  // Fetch data using TanStack Query
  const { data: employeesResult, isFetching: isFetchingEmployees } =
    useEmployees();
  const { data: checksResult, isFetching: isFetchingChecks } = usePontoChecks();
  const { data: worksitesResult, isFetching: isFetchingWorksites } =
    useWorksites();
  const refreshData = useRefreshRhidData();

  // Extract data from results (with fallback to empty arrays)
  const employees = employeesResult?.success ? employeesResult.data : [];
  const checks = checksResult?.success ? checksResult.data : [];
  const worksites = worksitesResult?.success ? worksitesResult.data : [];

  // Loading state
  const isRefreshing =
    isFetchingEmployees || isFetchingChecks || isFetchingWorksites;

  // UI state
  const [selectedEmployee, setSelectedEmployee] = useState<number | null>(null);
  const [selectedWorksite, setSelectedWorksite] = useState<number | null>(null);
  const [activeFilter, setActiveFilter] = useState<number | null>(null); // null = todos
  const [attendanceFilter, setAttendanceFilter] =
    useState<AttendanceFilter>("all");

  // Calculate filter counts based on tipoNumero
  // 0 = entrada, 1 = almoço saída, 2 = retorno, 3 = saída
  const filterCounts = useMemo(() => {
    const counts = {
      todos: checks.length,
      entrada: 0,
      almoco: 0,
      retorno: 0,
      saida: 0,
    };

    for (const check of checks) {
      const tipo = check.tipoNumero;
      if (tipo === 0) counts.entrada++;
      else if (tipo === 1) counts.almoco++;
      else if (tipo === 2) counts.retorno++;
      else if (tipo === 3) counts.saida++;
    }

    return counts;
  }, [checks]);

  // Build complete employee set from both employees array and checks
  // This ensures we have all employees even if the employees API returns incomplete data
  const allEmployeeIds = useMemo(() => {
    const ids = new Set<number>();

    // Add all employees from the employees array
    for (const emp of employees) {
      ids.add(emp.id);
    }

    // Add any employees found in checks that might not be in the employees array
    for (const check of checks) {
      ids.add(check.funcionarioId);
    }

    return ids;
  }, [employees, checks]);

  // Calculate present and absent counts
  const presentEmployeeIds = useMemo(
    () => new Set(checks.map((c) => c.funcionarioId)),
    [checks]
  );
  const presentCount = presentEmployeeIds.size;
  const totalEmployees = allEmployeeIds.size;
  const absentCount = totalEmployees - presentCount;

  // Handle attendance filter change
  const handleAttendanceFilterChange = (filter: AttendanceFilter) => {
    setAttendanceFilter(filter);
  };

  // Handle filter change
  const handleFilterChange = (filter: number | null) => {
    setActiveFilter(filter);
  };

  // Handle employee selection
  const handleSelectEmployee = (id: number | null) => {
    setSelectedEmployee(id);
    // Clear worksite selection when selecting an employee
    if (id) setSelectedWorksite(null);
  };

  // Handle worksite selection
  const handleSelectWorksite = (id: number | null) => {
    setSelectedWorksite(id);
    // Clear employee selection when selecting a worksite
    if (id) setSelectedEmployee(null);
  };

  return (
    <div className="h-screen flex flex-col bg-slate-900">
      {/* Header */}
      <DashboardHeader
        totalEmployees={totalEmployees}
        presentCount={presentCount}
        absentCount={absentCount}
        activeFilter={activeFilter}
        onFilterChange={handleFilterChange}
        filterCounts={filterCounts}
        attendanceFilter={attendanceFilter}
        onAttendanceFilterChange={handleAttendanceFilterChange}
        onRefresh={refreshData}
        isRefreshing={isRefreshing}
      />

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left sidebar - Employees */}
        <aside className="w-80 bg-slate-900 border-r border-white/10 flex flex-col">
          <EmployeeList
            employees={employees}
            checks={checks}
            selectedEmployee={selectedEmployee}
            onSelectEmployee={handleSelectEmployee}
            attendanceFilter={attendanceFilter}
          />
        </aside>

        {/* Map */}
        <main className="flex-1 relative">
          <LeafletMap
            checks={checks}
            worksites={worksites}
            selectedEmployee={selectedEmployee}
            selectedWorksite={selectedWorksite}
            filterType={activeFilter}
          />
        </main>

        {/* Right sidebar - Worksites */}
        <aside className="w-72 bg-slate-900 border-l border-white/10 flex flex-col">
          <WorksiteList
            worksites={worksites}
            checks={checks}
            selectedWorksite={selectedWorksite}
            onSelectWorksite={handleSelectWorksite}
          />
        </aside>
      </div>
    </div>
  );
}
