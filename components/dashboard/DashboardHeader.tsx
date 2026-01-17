"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { logout } from "@/lib/rhid";
import { Button } from "@/components/ui/button";
import FilterTabs from "./FilterTabs";
import {
  LogOut,
  BarChart3,
  RefreshCw,
  UserCheck,
  UserX,
  Users,
} from "lucide-react";

export type AttendanceFilter = "all" | "present" | "missing";

type DashboardHeaderProps = {
  totalEmployees: number;
  presentCount: number;
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
  attendanceFilter: AttendanceFilter;
  onAttendanceFilterChange: (filter: AttendanceFilter) => void;
  onRefresh: () => void;
  isRefreshing?: boolean;
};

export default function DashboardHeader({
  totalEmployees,
  presentCount,
  absentCount,
  activeFilter,
  onFilterChange,
  filterCounts,
  attendanceFilter,
  onAttendanceFilterChange,
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
    <header className="bg-slate-900/80 backdrop-blur-xl border-b border-white/10 px-6 py-3">
      <div className="flex items-center justify-between">
        {/* Left: Title */}
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-semibold text-white">Mapa de Pontos</h1>
          
          {/* Attendance Filter Buttons */}
          <div className="flex items-center gap-1 bg-white/5 rounded-lg p-1">
            <button
              onClick={() => onAttendanceFilterChange("all")}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                attendanceFilter === "all"
                  ? "bg-white/10 text-white"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Todos</span>
              <span className="px-1.5 py-0.5 text-xs rounded bg-white/10">
                {totalEmployees}
              </span>
            </button>
            
            <button
              onClick={() => onAttendanceFilterChange("present")}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                attendanceFilter === "present"
                  ? "bg-green-500/20 text-green-400"
                  : "text-slate-400 hover:text-green-400 hover:bg-green-500/10"
              }`}
            >
              <UserCheck className="w-4 h-4" />
              <span>Presentes</span>
              <span className={`px-1.5 py-0.5 text-xs rounded ${
                attendanceFilter === "present" ? "bg-green-500/30" : "bg-white/10"
              }`}>
                {presentCount}
              </span>
            </button>
            
            <button
              onClick={() => onAttendanceFilterChange("missing")}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                attendanceFilter === "missing"
                  ? "bg-red-500/20 text-red-400"
                  : "text-slate-400 hover:text-red-400 hover:bg-red-500/10"
              }`}
            >
              <UserX className="w-4 h-4" />
              <span>Ausentes</span>
              <span className={`px-1.5 py-0.5 text-xs rounded ${
                attendanceFilter === "missing" ? "bg-red-500/30" : "bg-white/10"
              }`}>
                {absentCount}
              </span>
            </button>
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
      </div>

      {/* Second row: Check type filter */}
      <div className="flex items-center gap-2 mt-3">
        <span className="text-sm text-slate-500">Tipo de Registro:</span>
        <FilterTabs
          activeFilter={activeFilter}
          onFilterChange={onFilterChange}
          counts={filterCounts}
        />
      </div>
    </header>
  );
}
