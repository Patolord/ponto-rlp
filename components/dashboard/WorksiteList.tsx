"use client";

import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import type { Worksite, PontoCheck } from "@/lib/rhid";
import { Search, MapPin, Users, Clock, ChevronDown, Building2 } from "lucide-react";

type EmployeeAtWorksite = {
  id: number;
  name: string;
  foto?: string;
  firstCheckIn: string;
  lastCheck: string;
  lastCheckType: string;
};

type WorksiteListProps = {
  worksites: Worksite[];
  checks: PontoCheck[];
  selectedWorksite: number | null;
  onSelectWorksite: (id: number | null) => void;
};

export default function WorksiteList({
  worksites,
  checks,
  selectedWorksite,
  onSelectWorksite,
}: WorksiteListProps) {
  const [search, setSearch] = useState("");
  const [expandedWorksite, setExpandedWorksite] = useState<number | null>(null);

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

  // Build map of employees per worksite
  const employeesByWorksite = useMemo(() => {
    const wsMap = new Map<number, Map<number, EmployeeAtWorksite>>();
    
    for (const check of checks) {
      if (!check.obraId) continue;
      
      if (!wsMap.has(check.obraId)) {
        wsMap.set(check.obraId, new Map());
      }
      
      const empMap = wsMap.get(check.obraId)!;
      const existing = empMap.get(check.funcionarioId);
      const checkTime = parseRhidDate(check.dataHora);
      
      if (!existing) {
        empMap.set(check.funcionarioId, {
          id: check.funcionarioId,
          name: check.funcionarioNome,
          foto: check.funcionarioFoto,
          firstCheckIn: check.dataHora,
          lastCheck: check.dataHora,
          lastCheckType: check.tipo,
        });
      } else {
        const firstTime = parseRhidDate(existing.firstCheckIn);
        const lastTime = parseRhidDate(existing.lastCheck);
        
        if (checkTime < firstTime) existing.firstCheckIn = check.dataHora;
        if (checkTime > lastTime) {
          existing.lastCheck = check.dataHora;
          existing.lastCheckType = check.tipo;
        }
      }
    }
    
    return wsMap;
  }, [checks]);

  // Filter worksites
  const filteredWorksites = useMemo(() => {
    const searchLower = search.toLowerCase();
    return worksites
      .filter((ws) => ws.nome.toLowerCase().includes(searchLower))
      .sort((a, b) => a.nome.localeCompare(b.nome));
  }, [worksites, search]);

  // Total employees
  const totalEmployees = worksites.reduce(
    (sum, ws) => sum + ws.funcionariosCount,
    0
  );

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      return date.toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
      });
    }
    
    const match = dateStr.match(/(\d{2}):(\d{2})/);
    if (match) return `${match[1]}:${match[2]}`;
    
    return "--:--";
  };

  const handleWorksiteClick = (worksiteId: number, isSelected: boolean) => {
    if (isSelected) {
      onSelectWorksite(null);
      setExpandedWorksite(null);
    } else {
      onSelectWorksite(worksiteId);
      setExpandedWorksite(worksiteId);
    }
  };

  const toggleExpand = (e: React.MouseEvent, worksiteId: number) => {
    e.stopPropagation();
    setExpandedWorksite(expandedWorksite === worksiteId ? null : worksiteId);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Search */}
      <div className="px-5 py-4 border-b border-slate-100">
        <div className="relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
          <Input
            type="text"
            placeholder="Buscar obra..."
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
      </div>

      {/* Worksite list */}
      <div className="flex-1 overflow-y-auto">
        {filteredWorksites.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 px-6">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center mb-4">
              <Building2 className="w-5 h-5 text-slate-400" />
            </div>
            <p className="text-sm text-slate-500 text-center">
              Nenhuma obra encontrada
            </p>
          </div>
        ) : (
          <ul className="py-2">
            {filteredWorksites.map((worksite, index) => {
              const isSelected = selectedWorksite === worksite.id;
              const isExpanded = expandedWorksite === worksite.id;
              const employeesAtSite = employeesByWorksite.get(worksite.id);
              const employeeList = employeesAtSite 
                ? Array.from(employeesAtSite.values()).sort((a, b) => a.name.localeCompare(b.name))
                : [];
              const hasEmployees = employeeList.length > 0;

              return (
                <li 
                  key={worksite.id}
                  className="fade-in-up px-3"
                  style={{ animationDelay: `${Math.min(index * 20, 200)}ms` }}
                >
                  <button
                    onClick={() => handleWorksiteClick(worksite.id, isSelected)}
                    className={`
                      w-full px-3 py-3 rounded-xl flex items-center gap-3 
                      transition-all duration-200 text-left group
                      ${isSelected
                        ? "bg-blue-50 border border-blue-200 shadow-sm"
                        : "hover:bg-slate-50 border border-transparent"
                      }
                    `}
                  >
                    {/* Icon */}
                    <div
                      className={`
                        w-9 h-9 rounded-lg flex items-center justify-center shrink-0
                        transition-all duration-200 border
                        ${isSelected
                          ? "bg-gradient-to-br from-blue-500 to-blue-600 border-blue-300 shadow-lg shadow-blue-500/20"
                          : hasEmployees
                            ? "bg-slate-100 border-slate-200 group-hover:border-slate-300"
                            : "bg-slate-50 border-slate-200"
                        }
                      `}
                    >
                      <MapPin
                        className={`
                          w-4 h-4 transition-colors
                          ${isSelected 
                            ? "text-white" 
                            : hasEmployees 
                              ? "text-slate-500" 
                              : "text-slate-400"
                          }
                        `}
                      />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p
                        className={`
                          text-sm font-medium truncate transition-colors
                          ${isSelected 
                            ? "text-blue-900" 
                            : "text-slate-700 group-hover:text-slate-900"
                          }
                        `}
                      >
                        {worksite.nome}
                      </p>
                      {hasEmployees && (
                        <p className="text-xs text-slate-400 mt-0.5">
                          {employeeList.length} {employeeList.length === 1 ? "funcionário" : "funcionários"} ativos
                        </p>
                      )}
                    </div>

                    {/* Count & expand */}
                    <div className="flex items-center gap-2">
                      <div className={`
                        flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-semibold
                        ${hasEmployees 
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200" 
                          : "bg-slate-100 text-slate-500 border border-slate-200"
                        }
                      `}>
                        <Users className="w-3 h-3" />
                        <span className="tabular-nums">{worksite.funcionariosCount}</span>
                      </div>
                      
                      {hasEmployees && (
                        <div
                          role="button"
                          tabIndex={0}
                          onClick={(e) => toggleExpand(e, worksite.id)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              toggleExpand(e as unknown as React.MouseEvent, worksite.id);
                            }
                          }}
                          className={`
                            p-1.5 rounded-lg transition-all duration-200 cursor-pointer
                            ${isExpanded 
                              ? "bg-slate-200 rotate-180" 
                              : "hover:bg-slate-100"
                            }
                          `}
                        >
                          <ChevronDown className="w-4 h-4 text-slate-400 transition-transform duration-200" />
                        </div>
                      )}
                    </div>
                  </button>
                  
                  {/* Expanded employee list */}
                  {isExpanded && hasEmployees && (
                    <div className="mx-3 mt-1 mb-2 rounded-xl bg-slate-50 border border-slate-200 overflow-hidden scale-in">
                      <div className="px-3 py-2 border-b border-slate-200 bg-slate-100">
                        <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                          Funcionários na obra
                        </span>
                      </div>
                      <ul className="divide-y divide-slate-100">
                        {employeeList.map((emp) => (
                          <li key={emp.id} className="px-3 py-2.5 flex items-center gap-2.5 hover:bg-white transition-colors">
                            {/* Avatar */}
                            <div className="shrink-0">
                              {emp.foto ? (
                                <img
                                  src={emp.foto}
                                  alt={emp.name}
                                  className="w-6 h-6 rounded-lg object-cover border border-slate-200"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).style.display = "none";
                                  }}
                                />
                              ) : (
                                <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center text-slate-500 font-medium text-[10px] border border-slate-200">
                                  {emp.name.charAt(0).toUpperCase()}
                                </div>
                              )}
                            </div>
                            
                            {/* Name */}
                            <div className="flex-1 min-w-0">
                              <p className="text-xs text-slate-700 truncate font-medium">
                                {emp.name}
                              </p>
                            </div>
                            
                            {/* Check-in time */}
                            <div className="flex items-center gap-1 text-[10px] text-slate-500">
                              <Clock className="w-3 h-3" />
                              <span className="tabular-nums">{formatTime(emp.firstCheckIn)}</span>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Footer stats */}
      {worksites.length > 0 && (
        <div className="px-5 py-4 border-t border-slate-100 bg-slate-50">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 font-medium">Total de funcionários</span>
            <span className="tabular-nums text-sm text-blue-600 font-semibold">{totalEmployees}</span>
          </div>
        </div>
      )}
    </div>
  );
}
