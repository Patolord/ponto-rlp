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
    <div className="w-full h-full bg-slate-100 flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        {/* Refined loading spinner */}
        <div className="relative w-12 h-12">
          <div className="absolute inset-0 rounded-full border-2 border-blue-200" />
          <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-blue-600 animate-spin" />
          <div className="absolute inset-2 rounded-full border border-blue-100" />
        </div>
        <div className="text-center">
          <p className="text-slate-600 text-sm font-medium tracking-wide">Carregando mapa</p>
          <p className="text-slate-400 text-xs mt-1">Aguarde um momento...</p>
        </div>
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
  const [activeFilter, setActiveFilter] = useState<number | null>(null);
  const [attendanceFilter, setAttendanceFilter] =
    useState<AttendanceFilter>("all");

  // Calculate filter counts based on tipoNumero
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

  // Build complete employee set
  const allEmployeeIds = useMemo(() => {
    const ids = new Set<number>();
    for (const emp of employees) {
      ids.add(emp.id);
    }
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

  const handleAttendanceFilterChange = (filter: AttendanceFilter) => {
    setAttendanceFilter(filter);
  };

  const handleFilterChange = (filter: number | null) => {
    setActiveFilter(filter);
  };

  const handleSelectEmployee = (id: number | null) => {
    setSelectedEmployee(id);
    if (id) setSelectedWorksite(null);
  };

  const handleSelectWorksite = (id: number | null) => {
    setSelectedWorksite(id);
    if (id) setSelectedEmployee(null);
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-slate-50">
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
        <aside className="w-80 flex flex-col border-r border-slate-200 bg-white shadow-sm">
          {/* Sidebar header */}
          <div className="px-5 py-4 border-b border-slate-100">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-700 tracking-wide uppercase">
                Funcionários
              </h2>
              <span className="tabular-nums text-xs font-semibold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full">
                {employees.length}
              </span>
            </div>
          </div>
          <EmployeeList
            employees={employees}
            checks={checks}
            selectedEmployee={selectedEmployee}
            onSelectEmployee={handleSelectEmployee}
            attendanceFilter={attendanceFilter}
          />
        </aside>

        {/* Map - main focal point */}
        <main className="flex-1 relative bg-slate-100">
          {/* Map edge shadows */}
          <div className="absolute inset-0 pointer-events-none z-10">
            <div className="absolute inset-x-0 top-0 h-8 bg-gradient-to-b from-slate-100/80 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-slate-100/80 to-transparent" />
          </div>
          <LeafletMap
            checks={checks}
            worksites={worksites}
            selectedEmployee={selectedEmployee}
            selectedWorksite={selectedWorksite}
            filterType={activeFilter}
          />
        </main>

        {/* Right sidebar - Worksites */}
        <aside className="w-72 flex flex-col border-l border-slate-200 bg-white shadow-sm">
          {/* Sidebar header */}
          <div className="px-5 py-4 border-b border-slate-100">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-700 tracking-wide uppercase">
                Obras
              </h2>
              <span className="tabular-nums text-xs font-semibold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full">
                {worksites.length}
              </span>
            </div>
          </div>
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
