"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { logout } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import FilterTabs from "./FilterTabs";
import {
  LogOut,
  BarChart3,
  Maximize2,
  RefreshCw,
} from "lucide-react";

type DashboardHeaderProps = {
  totalEmployees: number;
  absentCount: number;
  activeFilter: number | null;
  onFilterChange: (filter: number | null) => void;
  filterCounts: {
    todos: number;
    entrada: number;
    almoco: number;
    retorno: number;
    saida: number;
  };
  onRefresh: () => void;
  isRefreshing?: boolean;
};

export default function DashboardHeader({
  totalEmployees,
  absentCount,
  activeFilter,
  onFilterChange,
  filterCounts,
  onRefresh,
  isRefreshing,
}: DashboardHeaderProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleLogout = () => {
    startTransition(async () => {
      await logout();
    });
  };

  return (
    <header className="h-16 bg-slate-900/80 backdrop-blur-xl border-b border-white/10 flex items-center justify-between px-6">
      {/* Left: Title and filter */}
      <div className="flex items-center gap-6">
        <div>
          <h1 className="text-lg font-semibold text-white flex items-center gap-2">
            Mapa de Pontos
            <span className="text-slate-400 font-normal">
              ({totalEmployees} funcionários)
            </span>
            {absentCount > 0 && (
              <span className="px-2 py-0.5 text-xs font-medium bg-red-500/20 text-red-400 rounded-full">
                {absentCount} ausentes
              </span>
            )}
          </h1>
        </div>

        {/* Filter tabs */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-500">Tipo de Registro:</span>
          <FilterTabs
            activeFilter={activeFilter}
            onFilterChange={onFilterChange}
            counts={filterCounts}
          />
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={onRefresh}
          disabled={isRefreshing}
          className="text-slate-400 hover:text-white"
        >
          <RefreshCw
            className={`w-4 h-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`}
          />
          Atualizar
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/estatisticas")}
          className="text-slate-400 hover:text-white"
        >
          <BarChart3 className="w-4 h-4 mr-2" />
          Estatísticas
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={handleLogout}
          disabled={isPending}
          className="text-slate-400 hover:text-red-400"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Sair
        </Button>
      </div>
    </header>
  );
}
