"use client";

import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import type { Worksite } from "@/app/actions/rhid";
import { Search, MapPin, Users } from "lucide-react";

type WorksiteListProps = {
  worksites: Worksite[];
  selectedWorksite: number | null;
  onSelectWorksite: (id: number | null) => void;
};

export default function WorksiteList({
  worksites,
  selectedWorksite,
  onSelectWorksite,
}: WorksiteListProps) {
  const [search, setSearch] = useState("");

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

              return (
                <li key={worksite.id}>
                  <button
                    onClick={() =>
                      onSelectWorksite(isSelected ? null : worksite.id)
                    }
                    className={`w-full px-4 py-3 flex items-center gap-3 transition-colors text-left ${
                      isSelected
                        ? "bg-indigo-500/20"
                        : "hover:bg-white/5"
                    }`}
                  >
                    {/* Icon */}
                    <div
                      className={`w-9 h-9 rounded-lg flex items-center justify-center ${
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
                    <div className="flex items-center gap-1 text-slate-400">
                      <Users className="w-3.5 h-3.5" />
                      <span className="text-xs">{worksite.funcionariosCount}</span>
                    </div>
                  </button>
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
