"use client";

import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import type { Employee, PontoCheck } from "@/lib/rhid";
import { Search, Clock, MapPin, AlertCircle, TrendingUp } from "lucide-react";
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

  // Parse date from RHID format
  const parseRhidDate = (dateStr: string): number => {
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      return date.getTime();
    }
    
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
    
    return 0;
  };

  // Build employee attendance data
  const employeesWithAttendance = useMemo(() => {
    const checkData = new Map<number, { first: PontoCheck; last: PontoCheck }>();
    
    for (const check of checks) {
      const existing = checkData.get(check.funcionarioId);
      if (!existing) {
        checkData.set(check.funcionarioId, { first: check, last: check });
      } else {
        const checkTime = parseRhidDate(check.dataHora);
        const firstTime = parseRhidDate(existing.first.dataHora);
        const lastTime = parseRhidDate(existing.last.dataHora);
        
        if (checkTime < firstTime) existing.first = check;
        if (checkTime > lastTime) existing.last = check;
      }
    }
    
    return checkData;
  }, [checks]);

  // Build employee list
  const employeeList = useMemo(() => {
    const uniqueEmployees = new Map<number, Employee>();
    
    for (const emp of employees) {
      uniqueEmployees.set(emp.id, emp);
    }
    
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

  // Enhanced employee list
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

  // Filter employees
  const filteredEmployees = useMemo(() => {
    const searchLower = search.toLowerCase();
    return enhancedEmployees
      .filter((emp) => {
        if (!emp.nome.toLowerCase().includes(searchLower)) return false;
        if (attendanceFilter === "present" && !emp.isPresent) return false;
        if (attendanceFilter === "missing" && emp.isPresent) return false;
        return true;
      })
      .sort((a, b) => {
        if (attendanceFilter === "missing") {
          return a.nome.localeCompare(b.nome);
        }
        if (a.isPresent !== b.isPresent) {
          return a.isPresent ? -1 : 1;
        }
        return a.nome.localeCompare(b.nome);
      });
  }, [enhancedEmployees, search, attendanceFilter]);

  const getCheckStatus = (employee: EmployeeWithAttendance) => {
    if (!employee.lastCheck) return null;

    const statusConfig: Record<number, { color: string; ring: string }> = {
      0: { color: "bg-emerald-500", ring: "ring-emerald-500/30" },
      1: { color: "bg-amber-500", ring: "ring-amber-500/30" },
      2: { color: "bg-violet-500", ring: "ring-violet-500/30" },
      3: { color: "bg-rose-500", ring: "ring-rose-500/30" },
    };

    return statusConfig[employee.lastCheck.tipoNumero] || { color: "bg-slate-400", ring: "" };
  };

  const formatTime = (dateStr: string, fallbackStr?: string) => {
    const date = new Date(dateStr);
    
    if (isNaN(date.getTime())) {
      const match = dateStr.match(/(\d{2}):(\d{2})/);
      if (match) return `${match[1]}:${match[2]}`;
      
      if (fallbackStr) {
        const fallbackMatch = fallbackStr.match(/(\d{2}):(\d{2})/);
        if (fallbackMatch) return `${fallbackMatch[1]}:${fallbackMatch[2]}`;
      }
      
      return "--:--";
    }
    
    return date.toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getCheckTypeLabel = (tipo: string) => {
    const labels: Record<string, string> = {
      entrada: "Entrada",
      almoco_saida: "Almoço",
      almoco_retorno: "Retorno",
      saida: "Saída",
    };
    return labels[tipo] || tipo;
  };

  return (
    <div className="flex flex-col h-full">
      {/* Search */}
      <div className="px-5 py-4 border-b border-slate-100">
        <div className="relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
          <Input
            type="text"
            placeholder="Buscar funcionário..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="
              pl-10 h-10 bg-slate-50 border-slate-200 text-slate-800 text-sm
              placeholder:text-slate-400 rounded-xl
              focus:border-blue-300 focus:ring-2 focus:ring-blue-500/20
              focus:bg-white transition-all duration-200
            "
          />
        </div>
        
        {/* Filter indicator */}
        {attendanceFilter !== "all" && (
          <div className="mt-3 flex items-center gap-2">
            <span className={`
              inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium
              ${attendanceFilter === "present" 
                ? "bg-emerald-50 text-emerald-700 border border-emerald-200" 
                : "bg-red-50 text-red-700 border border-red-200"
              }
            `}>
              <TrendingUp className="w-3 h-3" />
              {attendanceFilter === "present" ? "Presentes" : "Ausentes"}: {filteredEmployees.length}
            </span>
          </div>
        )}
      </div>

      {/* Employee list */}
      <div className="flex-1 overflow-y-auto">
        {filteredEmployees.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 px-6">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center mb-4">
              <Search className="w-5 h-5 text-slate-400" />
            </div>
            <p className="text-sm text-slate-500 text-center">
              {attendanceFilter === "missing"
                ? "Todos registraram ponto hoje!"
                : attendanceFilter === "present"
                  ? "Nenhum funcionário presente"
                  : "Nenhum funcionário encontrado"}
            </p>
          </div>
        ) : (
          <ul className="py-2">
            {filteredEmployees.map((employee, index) => {
              const isSelected = selectedEmployee === employee.id;
              const checkStatus = getCheckStatus(employee);

              return (
                <li 
                  key={employee.id}
                  className="fade-in-up px-3"
                  style={{ animationDelay: `${Math.min(index * 20, 200)}ms` }}
                >
                  <button
                    onClick={() => onSelectEmployee(isSelected ? null : employee.id)}
                    className={`
                      w-full px-3 py-3 rounded-xl flex items-center gap-3 
                      transition-all duration-200 text-left group
                      ${isSelected
                        ? "bg-blue-50 border border-blue-200 shadow-sm"
                        : employee.isPresent
                          ? "hover:bg-slate-50 border border-transparent"
                          : "hover:bg-red-50/50 border border-transparent bg-red-50/30"
                      }
                    `}
                  >
                    {/* Avatar */}
                    <div className="relative shrink-0">
                      {employee.foto ? (
                        <img
                          src={employee.foto}
                          alt={employee.nome}
                          className={`
                            w-10 h-10 rounded-xl object-cover border-2
                            ${!employee.isPresent ? "opacity-50 grayscale border-slate-200" : "border-slate-200"}
                            ${isSelected ? "border-blue-300" : ""}
                          `}
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = "none";
                          }}
                        />
                      ) : (
                        <div
                          className={`
                            w-10 h-10 rounded-xl flex items-center justify-center 
                            text-sm font-semibold border-2
                            ${employee.isPresent
                              ? isSelected
                                ? "bg-gradient-to-br from-blue-500 to-blue-600 text-white border-blue-300"
                                : "bg-gradient-to-br from-slate-100 to-slate-200 text-slate-600 border-slate-200"
                              : "bg-slate-100 text-slate-400 border-slate-200"
                            }
                          `}
                        >
                          {employee.nome.charAt(0).toUpperCase()}
                        </div>
                      )}
                      
                      {/* Status indicator */}
                      {checkStatus ? (
                        <span
                          className={`
                            absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full 
                            border-2 border-white ring-2 ${checkStatus.ring}
                            ${checkStatus.color}
                          `}
                        />
                      ) : (
                        <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white bg-slate-300 flex items-center justify-center">
                          <AlertCircle className="w-2 h-2 text-slate-500" />
                        </span>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p
                        className={`
                          text-sm font-medium truncate transition-colors
                          ${isSelected
                            ? "text-blue-900"
                            : employee.isPresent
                              ? "text-slate-700 group-hover:text-slate-900"
                              : "text-red-700"
                          }
                        `}
                      >
                        {employee.nome}
                      </p>
                      
                      {employee.isPresent && employee.firstCheck && (
                        <div className="flex items-center gap-2 mt-1">
                          {employee.worksiteName && (
                            <span className="flex items-center gap-1 text-xs text-slate-400">
                              <MapPin className="w-3 h-3" />
                              <span className="truncate max-w-[80px]">
                                {employee.worksiteName}
                              </span>
                            </span>
                          )}
                          <span className="flex items-center gap-1 text-xs text-emerald-600">
                            <Clock className="w-3 h-3" />
                            <span className="tabular-nums">
                              {formatTime(employee.firstCheck.dataHora, employee.firstCheck.dataHoraStr)}
                            </span>
                          </span>
                        </div>
                      )}
                      
                      {!employee.isPresent && (
                        <p className="text-xs text-red-500 mt-0.5 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          Sem registro hoje
                        </p>
                      )}
                    </div>

                    {/* Time badge */}
                    {employee.isPresent && employee.lastCheck && (
                      <div className="text-right shrink-0">
                        <span className="tabular-nums text-xs text-slate-600 block font-medium">
                          {formatTime(employee.lastCheck.dataHora, employee.lastCheck.dataHoraStr)}
                        </span>
                        <span className="text-[10px] text-slate-400 uppercase tracking-wider">
                          {getCheckTypeLabel(employee.lastCheck.tipo)}
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
