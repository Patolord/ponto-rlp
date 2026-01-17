"use client";

import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import type { Worksite, PontoCheck } from "@/lib/rhid";
import { Search, MapPin, Users, Clock, ChevronDown, ChevronUp } from "lucide-react";

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

  // Parse date from RHID format (handles both ISO and "DD/MM/YYYY HH:mm:ss")
  const parseRhidDate = (dateStr: string): number => {
    // Try ISO format first
    let date = new Date(dateStr);
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

  // Build map of employees per worksite from checks
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
        
        if (checkTime < firstTime) {
          existing.firstCheckIn = check.dataHora;
        }
        if (checkTime > lastTime) {
          existing.lastCheck = check.dataHora;
          existing.lastCheckType = check.tipo;
        }
      }
    }
    
    return wsMap;
  }, [checks]);

  // Filter worksites by search
  const filteredWorksites = useMemo(() => {
    const searchLower = search.toLowerCase();
    return worksites
      .filter((ws) => ws.nome.toLowerCase().includes(searchLower))
      .sort((a, b) => a.nome.localeCompare(b.nome));
  }, [worksites, search]);

  // Total employees across all worksites
  const totalEmployees = worksites.reduce(
    (sum, ws) => sum + ws.funcionariosCount,
    0
  );

  const formatTime = (dateStr: string) => {
    // Try parsing as ISO date first
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      return date.toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
      });
    }
    
    // Try to extract time from DD/MM/YYYY HH:mm:ss format
    const match = dateStr.match(/(\d{2}):(\d{2})/);
    if (match) {
      return `${match[1]}:${match[2]}`;
    }
    
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
      {/* Header */}
      <div className="p-4 border-b border-white/10">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-slate-400" />
            <span className="text-sm font-medium text-slate-300">
              Obras ({worksites.length})
            </span>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <Input
            type="text"
            placeholder="Buscar obra..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-white/5 border-white/10 text-white placeholder:text-slate-500 h-9 text-sm"
          />
        </div>
      </div>

      {/* Worksite list */}
      <div className="flex-1 overflow-y-auto">
        {filteredWorksites.length === 0 ? (
          <div className="p-4 text-center text-slate-500 text-sm">
            Nenhuma obra encontrada
          </div>
        ) : (
          <ul className="divide-y divide-white/5">
            {filteredWorksites.map((worksite) => {
              const isSelected = selectedWorksite === worksite.id;
              const isExpanded = expandedWorksite === worksite.id;
              const employeesAtSite = employeesByWorksite.get(worksite.id);
              const employeeList = employeesAtSite 
                ? Array.from(employeesAtSite.values()).sort((a, b) => a.name.localeCompare(b.name))
                : [];

              return (
                <li key={worksite.id}>
                  <button
                    onClick={() => handleWorksiteClick(worksite.id, isSelected)}
                    className={`w-full px-4 py-3 flex items-center gap-3 transition-colors text-left ${
                      isSelected
                        ? "bg-indigo-500/20"
                        : "hover:bg-white/5"
                    }`}
                  >
                    {/* Icon */}
                    <div
                      className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        isSelected
                          ? "bg-indigo-500"
                          : "bg-white/10"
                      }`}
                    >
                      <MapPin
                        className={`w-4 h-4 ${
                          isSelected ? "text-white" : "text-slate-400"
                        }`}
                      />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-sm font-medium truncate ${
                          isSelected ? "text-white" : "text-slate-200"
                        }`}
                      >
                        {worksite.nome}
                      </p>
                    </div>

                    {/* Employee count */}
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1 text-slate-400">
                        <Users className="w-3.5 h-3.5" />
                        <span className="text-xs">{worksite.funcionariosCount}</span>
                      </div>
                      
                      {/* Expand indicator */}
                      {employeeList.length > 0 && (
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
                          className="p-1 hover:bg-white/10 rounded cursor-pointer"
                        >
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4 text-slate-400" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-slate-400" />
                          )}
                        </div>
                      )}
                    </div>
                  </button>
                  
                  {/* Expanded employee list */}
                  {isExpanded && employeeList.length > 0 && (
                    <div className="bg-white/5 border-t border-white/5">
                      <div className="px-4 py-2 border-b border-white/5">
                        <span className="text-xs font-medium text-slate-400 uppercase tracking-wide">
                          Funcionários na obra
                        </span>
                      </div>
                      <ul className="divide-y divide-white/5">
                        {employeeList.map((emp) => (
                          <li key={emp.id} className="px-4 py-2 flex items-center gap-3">
                            {/* Avatar */}
                            <div className="flex-shrink-0">
                              {emp.foto ? (
                                <img
                                  src={emp.foto}
                                  alt={emp.name}
                                  className="w-7 h-7 rounded-full object-cover"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).style.display = "none";
                                  }}
                                />
                              ) : (
                                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center text-white font-medium text-xs">
                                  {emp.name.charAt(0).toUpperCase()}
                                </div>
                              )}
                            </div>
                            
                            {/* Name */}
                            <div className="flex-1 min-w-0">
                              <p className="text-xs text-slate-300 truncate">
                                {emp.name}
                              </p>
                            </div>
                            
                            {/* Check-in time */}
                            <div className="flex items-center gap-1 text-xs text-slate-500">
                              <Clock className="w-3 h-3" />
                              {formatTime(emp.firstCheckIn)}
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
        <div className="p-4 border-t border-white/10">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-500">Total funcionários</span>
            <span className="text-slate-300 font-medium">{totalEmployees}</span>
          </div>
        </div>
      )}
    </div>
  );
}
