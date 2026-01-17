"use client";

import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import type { Employee, PontoCheck } from "@/lib/rhid";
import { Search, Users, Clock, MapPin, AlertCircle } from "lucide-react";
import type { AttendanceFilter } from "./DashboardHeader";

export type EmployeeWithAttendance = Employee & {
  isPresent: boolean;
  firstCheck?: PontoCheck;
  lastCheck?: PontoCheck;
  worksiteName?: string;
  worksiteId?: number;
};

type EmployeeListProps = {
  employees: Employee[];
  checks: PontoCheck[];
  selectedEmployee: number | null;
  onSelectEmployee: (id: number | null) => void;
  attendanceFilter: AttendanceFilter;
};

export default function EmployeeList({
  employees,
  checks,
  selectedEmployee,
  onSelectEmployee,
  attendanceFilter,
}: EmployeeListProps) {
  const [search, setSearch] = useState("");

  // Parse date from RHID format (handles both ISO and "DD/MM/YYYY HH:mm:ss")
  const parseRhidDate = (dateStr: string): number => {
    // Try ISO format first
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      return date.getTime();
    }
    
    // Try DD/MM/YYYY HH:mm:ss format
    const match = dateStr.match(/(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2}):(\d{2})/);
    if (match) {
      const [, day, month, year, hour, min, sec] = match;
      return new Date(
        parseInt(year),
        parseInt(month) - 1,
        parseInt(day),
        parseInt(hour),
        parseInt(min),
        parseInt(sec)
      ).getTime();
    }
    
    // Fallback to 0 if unparseable
    return 0;
  };

  // Build employee attendance data with first and last checks
  const employeesWithAttendance = useMemo(() => {
    // Map to store first and last checks per employee
    const checkData = new Map<number, { first: PontoCheck; last: PontoCheck }>();
    
    for (const check of checks) {
      const existing = checkData.get(check.funcionarioId);
      if (!existing) {
        checkData.set(check.funcionarioId, { first: check, last: check });
      } else {
        const checkTime = parseRhidDate(check.dataHora);
        const firstTime = parseRhidDate(existing.first.dataHora);
        const lastTime = parseRhidDate(existing.last.dataHora);
        
        if (checkTime < firstTime) {
          existing.first = check;
        }
        if (checkTime > lastTime) {
          existing.last = check;
        }
      }
    }
    
    return checkData;
  }, [checks]);

  // Build employee list by merging employees array with employees found in checks
  // This ensures we have all employees even if the employees API returns incomplete data
  const employeeList = useMemo(() => {
    const uniqueEmployees = new Map<number, Employee>();
    
    // First, add all employees from the employees array
    for (const emp of employees) {
      uniqueEmployees.set(emp.id, emp);
    }
    
    // Then, add any employees found in checks that aren't in the employees array
    // This ensures we capture everyone who checked in, even if the employees API is incomplete
    for (const check of checks) {
      if (!uniqueEmployees.has(check.funcionarioId)) {
        uniqueEmployees.set(check.funcionarioId, {
          id: check.funcionarioId,
          nome: check.funcionarioNome,
          foto: check.funcionarioFoto,
          ativo: true,
        });
      }
    }
    
    return Array.from(uniqueEmployees.values());
  }, [employees, checks]);

  // Build enhanced employee list with attendance data
  const enhancedEmployees: EmployeeWithAttendance[] = useMemo(() => {
    return employeeList.map((emp) => {
      const checkInfo = employeesWithAttendance.get(emp.id);
      return {
        ...emp,
        isPresent: !!checkInfo,
        firstCheck: checkInfo?.first,
        lastCheck: checkInfo?.last,
        worksiteName: checkInfo?.first.obraNome,
        worksiteId: checkInfo?.first.obraId,
      };
    });
  }, [employeeList, employeesWithAttendance]);

  // Filter employees by search and attendance filter
  const filteredEmployees = useMemo(() => {
    const searchLower = search.toLowerCase();
    return enhancedEmployees
      .filter((emp) => {
        // Search filter
        if (!emp.nome.toLowerCase().includes(searchLower)) return false;
        
        // Attendance filter
        if (attendanceFilter === "present" && !emp.isPresent) return false;
        if (attendanceFilter === "missing" && emp.isPresent) return false;
        
        return true;
      })
      .sort((a, b) => {
        // When showing missing, keep them at top
        if (attendanceFilter === "missing") {
          return a.nome.localeCompare(b.nome);
        }
        // Otherwise, sort present first, then by name
        if (a.isPresent !== b.isPresent) {
          return a.isPresent ? -1 : 1;
        }
        return a.nome.localeCompare(b.nome);
      });
  }, [enhancedEmployees, search, attendanceFilter]);

  const getCheckStatus = (employee: EmployeeWithAttendance) => {
    if (!employee.lastCheck) return null;

    // 0=entrada (green), 1=almoco (amber), 2=retorno (blue), 3=saida (red)
    const statusColors: Record<number, string> = {
      0: "bg-green-500",
      1: "bg-amber-500",
      2: "bg-blue-500",
      3: "bg-red-500",
    };

    return statusColors[employee.lastCheck.tipoNumero] || "bg-gray-500";
  };

  const formatTime = (dateStr: string, fallbackStr?: string) => {
    // Try parsing as ISO date first
    const date = new Date(dateStr);
    
    // If invalid, try parsing DD/MM/YYYY HH:mm:ss format
    if (isNaN(date.getTime())) {
      // Try to extract time from dateTimeStr format like "17/01/2026 08:30:00"
      const match = dateStr.match(/(\d{2}):(\d{2})/);
      if (match) {
        return `${match[1]}:${match[2]}`;
      }
      
      // Try fallback string
      if (fallbackStr) {
        const fallbackMatch = fallbackStr.match(/(\d{2}):(\d{2})/);
        if (fallbackMatch) {
          return `${fallbackMatch[1]}:${fallbackMatch[2]}`;
        }
      }
      
      return "--:--";
    }
    
    return date.toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getFilterLabel = () => {
    switch (attendanceFilter) {
      case "present":
        return "Presentes";
      case "missing":
        return "Ausentes";
      default:
        return "Funcionários";
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-white/10">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-slate-400" />
            <span className="text-sm font-medium text-slate-300">
              {getFilterLabel()} ({filteredEmployees.length})
            </span>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <Input
            type="text"
            placeholder="Buscar funcionário..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-white/5 border-white/10 text-white placeholder:text-slate-500 h-9 text-sm"
          />
        </div>
      </div>

      {/* Employee list */}
      <div className="flex-1 overflow-y-auto">
        {filteredEmployees.length === 0 ? (
          <div className="p-4 text-center text-slate-500 text-sm">
            {attendanceFilter === "missing"
              ? "Todos os funcionários registraram ponto hoje!"
              : attendanceFilter === "present"
                ? "Nenhum funcionário presente"
                : "Nenhum funcionário encontrado"}
          </div>
        ) : (
          <ul className="divide-y divide-white/5">
            {filteredEmployees.map((employee) => {
              const isSelected = selectedEmployee === employee.id;
              const checkStatus = getCheckStatus(employee);

              return (
                <li key={employee.id}>
                  <button
                    onClick={() =>
                      onSelectEmployee(isSelected ? null : employee.id)
                    }
                    className={`w-full px-4 py-3 flex items-center gap-3 transition-colors text-left ${
                      isSelected
                        ? "bg-indigo-500/20"
                        : employee.isPresent
                          ? "hover:bg-white/5"
                          : "hover:bg-red-500/10 bg-red-500/5"
                    }`}
                  >
                    {/* Avatar */}
                    <div className="relative flex-shrink-0">
                      {employee.foto ? (
                        <img
                          src={employee.foto}
                          alt={employee.nome}
                          className={`w-10 h-10 rounded-full object-cover ${
                            !employee.isPresent ? "opacity-50 grayscale" : ""
                          }`}
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = "none";
                          }}
                        />
                      ) : (
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-medium text-sm ${
                            employee.isPresent
                              ? "bg-gradient-to-br from-indigo-500 to-blue-600"
                              : "bg-gradient-to-br from-slate-600 to-slate-700"
                          }`}
                        >
                          {employee.nome.charAt(0).toUpperCase()}
                        </div>
                      )}
                      {/* Status indicator */}
                      {checkStatus ? (
                        <span
                          className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-slate-900 ${checkStatus}`}
                        />
                      ) : (
                        <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-slate-900 bg-slate-600 flex items-center justify-center">
                          <AlertCircle className="w-2 h-2 text-slate-400" />
                        </span>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-sm font-medium truncate ${
                          isSelected
                            ? "text-white"
                            : employee.isPresent
                              ? "text-slate-200"
                              : "text-red-300"
                        }`}
                      >
                        {employee.nome}
                      </p>
                      
                      {/* Present: Show worksite and first check-in time */}
                      {employee.isPresent && employee.firstCheck && (
                        <div className="flex items-center gap-2 mt-0.5">
                          {employee.worksiteName && (
                            <span className="flex items-center gap-1 text-xs text-slate-500">
                              <MapPin className="w-3 h-3" />
                              <span className="truncate max-w-[100px]">
                                {employee.worksiteName}
                              </span>
                            </span>
                          )}
                          <span className="flex items-center gap-1 text-xs text-green-500">
                            <Clock className="w-3 h-3" />
                            {formatTime(employee.firstCheck.dataHora, employee.firstCheck.dataHoraStr)}
                          </span>
                        </div>
                      )}
                      
                      {/* Missing: Show warning */}
                      {!employee.isPresent && (
                        <p className="text-xs text-red-400 mt-0.5">
                          Sem registro hoje
                        </p>
                      )}
                    </div>

                    {/* Current status time badge (last check) */}
                    {employee.isPresent && employee.lastCheck && (
                      <div className="text-right flex-shrink-0">
                        <span className="text-xs text-slate-400 block">
                          {formatTime(employee.lastCheck.dataHora, employee.lastCheck.dataHoraStr)}
                        </span>
                        <span className="text-[10px] text-slate-500">
                          {employee.lastCheck.tipo === "entrada" && "Entrada"}
                          {employee.lastCheck.tipo === "almoco_saida" && "Almoço"}
                          {employee.lastCheck.tipo === "almoco_retorno" && "Retorno"}
                          {employee.lastCheck.tipo === "saida" && "Saída"}
                        </span>
                      </div>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
