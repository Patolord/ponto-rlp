"use client";

import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import type { Employee, PontoCheck } from "@/app/actions/rhid";
import { Search, Users } from "lucide-react";

type EmployeeListProps = {
  employees: Employee[];
  checks: PontoCheck[];
  selectedEmployee: number | null;
  onSelectEmployee: (id: number | null) => void;
};

export default function EmployeeList({
  employees,
  checks,
  selectedEmployee,
  onSelectEmployee,
}: EmployeeListProps) {
  const [search, setSearch] = useState("");

  // Get employees who have checked in today with their latest check
  const employeesWithChecks = useMemo(() => {
    const checkMap = new Map<number, PontoCheck>();
    for (const check of checks) {
      // Keep the latest check for each employee
      const existing = checkMap.get(check.funcionarioId);
      if (!existing || new Date(check.dataHora) > new Date(existing.dataHora)) {
        checkMap.set(check.funcionarioId, check);
      }
    }
    return checkMap;
  }, [checks]);

  // Build employee list from checks (if employees array is empty, build from checks)
  const employeeList = useMemo(() => {
    if (employees.length > 0) {
      return employees;
    }
    // Build from checks if no employees loaded
    const uniqueEmployees = new Map<number, Employee>();
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

  // Filter employees by search
  const filteredEmployees = useMemo(() => {
    const searchLower = search.toLowerCase();
    return employeeList
      .filter((emp) => emp.nome.toLowerCase().includes(searchLower))
      .sort((a, b) => a.nome.localeCompare(b.nome));
  }, [employeeList, search]);

  // Count present employees
  const presentCount = employeesWithChecks.size;
  const absentCount = employeeList.length - presentCount;

  const getCheckStatus = (employeeId: number) => {
    const check = employeesWithChecks.get(employeeId);
    if (!check) return null;

    // 0=entrada (green), 1=almoco (amber), 2=retorno (blue), 3=saida (red)
    const statusColors: Record<number, string> = {
      0: "bg-green-500",
      1: "bg-amber-500",
      2: "bg-blue-500",
      3: "bg-red-500",
    };

    return statusColors[check.tipoNumero] || "bg-gray-500";
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-white/10">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-slate-400" />
            <span className="text-sm font-medium text-slate-300">
              Funcionários ({filteredEmployees.length})
            </span>
          </div>
          {absentCount > 0 && (
            <span className="px-2 py-0.5 text-xs font-medium bg-red-500/20 text-red-400 rounded-full">
              {absentCount} ausentes
            </span>
          )}
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
            Nenhum funcionário encontrado
          </div>
        ) : (
          <ul className="divide-y divide-white/5">
            {filteredEmployees.map((employee) => {
              const isSelected = selectedEmployee === employee.id;
              const checkStatus = getCheckStatus(employee.id);
              const check = employeesWithChecks.get(employee.id);

              return (
                <li key={employee.id}>
                  <button
                    onClick={() =>
                      onSelectEmployee(isSelected ? null : employee.id)
                    }
                    className={`w-full px-4 py-3 flex items-center gap-3 transition-colors text-left ${
                      isSelected
                        ? "bg-indigo-500/20"
                        : "hover:bg-white/5"
                    }`}
                  >
                    {/* Avatar */}
                    <div className="relative">
                      {employee.foto ? (
                        <img
                          src={employee.foto}
                          alt={employee.nome}
                          className="w-9 h-9 rounded-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = "none";
                          }}
                        />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center text-white font-medium text-sm">
                          {employee.nome.charAt(0).toUpperCase()}
                        </div>
                      )}
                      {/* Status indicator */}
                      {checkStatus && (
                        <span
                          className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-slate-900 ${checkStatus}`}
                        />
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-sm font-medium truncate ${
                          isSelected ? "text-white" : "text-slate-200"
                        }`}
                      >
                        {employee.nome}
                      </p>
                      {check?.obraNome && (
                        <p className="text-xs text-slate-500 truncate">
                          {check.obraNome}
                        </p>
                      )}
                    </div>

                    {/* Time badge */}
                    {check && (
                      <span className="text-xs text-slate-400">
                        {check.dataHoraStr || new Date(check.dataHora).toLocaleTimeString("pt-BR", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
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
