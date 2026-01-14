"use client";

import { useState, useCallback, useTransition, useMemo } from "react";
import dynamic from "next/dynamic";
import type { Employee, PontoCheck, Worksite } from "@/app/actions/rhid";
import { fetchEmployees, fetchPontoChecks, fetchWorksites } from "@/app/actions/rhid";
import DashboardHeader from "./DashboardHeader";
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

type DashboardProps = {
  initialEmployees: Employee[];
  initialChecks: PontoCheck[];
  initialWorksites: Worksite[];
};

export default function Dashboard({
  initialEmployees,
  initialChecks,
  initialWorksites,
}: DashboardProps) {
  const [employees, setEmployees] = useState(initialEmployees);
  const [checks, setChecks] = useState(initialChecks);
  const [worksites, setWorksites] = useState(initialWorksites);
  const [selectedEmployee, setSelectedEmployee] = useState<number | null>(null);
  const [selectedWorksite, setSelectedWorksite] = useState<number | null>(null);
  const [activeFilter, setActiveFilter] = useState<number | null>(null); // null = todos
  const [isRefreshing, startRefresh] = useTransition();

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

  // Calculate absent count
  const presentEmployeeIds = useMemo(
    () => new Set(checks.map((c) => c.funcionarioId)),
    [checks]
  );
  const absentCount = employees.length - presentEmployeeIds.size;

  // Refresh data
  const handleRefresh = useCallback(() => {
    startRefresh(async () => {
      const [employeesResult, checksResult, worksitesResult] = await Promise.all([
        fetchEmployees(),
        fetchPontoChecks(),
        fetchWorksites(),
      ]);

      if (employeesResult.success) setEmployees(employeesResult.data);
      if (checksResult.success) setChecks(checksResult.data);
      if (worksitesResult.success) setWorksites(worksitesResult.data);
    });
  }, []);

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
        totalEmployees={employees.length}
        absentCount={absentCount}
        activeFilter={activeFilter}
        onFilterChange={handleFilterChange}
        filterCounts={filterCounts}
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing}
      />

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left sidebar - Employees */}
        <aside className="w-72 bg-slate-900 border-r border-white/10 flex flex-col">
          <EmployeeList
            employees={employees}
            checks={checks}
            selectedEmployee={selectedEmployee}
            onSelectEmployee={handleSelectEmployee}
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
        <aside className="w-64 bg-slate-900 border-l border-white/10 flex flex-col">
          <WorksiteList
            worksites={worksites}
            selectedWorksite={selectedWorksite}
            onSelectWorksite={handleSelectWorksite}
          />
        </aside>
      </div>
    </div>
  );
}
