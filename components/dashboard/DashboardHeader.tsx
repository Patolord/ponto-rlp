"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { logout } from "@/lib/rhid";
import FilterTabs from "./FilterTabs";
import {
  LogOut,
  BarChart3,
  RefreshCw,
  UserCheck,
  UserX,
  Users,
  MapPin,
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
    <header className="relative z-20">
      {/* Gradient line accent */}
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-500 via-blue-600 to-indigo-600" />
      
      {/* Main header content */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 shadow-sm">
        <div className="flex items-center justify-between">
          {/* Left: Logo & Title */}
          <div className="flex items-center gap-6">
            {/* Brand */}
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/25">
                  <MapPin className="w-5 h-5 text-white" strokeWidth={2.5} />
                </div>
                {/* Live indicator */}
                <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white status-pulse" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-slate-800 tracking-tight">
                  Ponto <span className="text-blue-600">RLP</span>
                </h1>
                <p className="text-[10px] text-slate-400 font-medium uppercase tracking-widest">
                  Controle de Ponto
                </p>
              </div>
            </div>

            {/* Divider */}
            <div className="h-8 w-px bg-slate-200" />

            {/* Attendance Filter Pills */}
            <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100 border border-slate-200">
              <AttendanceButton
                active={attendanceFilter === "all"}
                onClick={() => onAttendanceFilterChange("all")}
                icon={<Users className="w-4 h-4" />}
                label="Todos"
                count={totalEmployees}
                variant="default"
              />
              <AttendanceButton
                active={attendanceFilter === "present"}
                onClick={() => onAttendanceFilterChange("present")}
                icon={<UserCheck className="w-4 h-4" />}
                label="Presentes"
                count={presentCount}
                variant="success"
              />
              <AttendanceButton
                active={attendanceFilter === "missing"}
                onClick={() => onAttendanceFilterChange("missing")}
                icon={<UserX className="w-4 h-4" />}
                label="Ausentes"
                count={absentCount}
                variant="danger"
              />
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2">
            <ActionButton
              onClick={onRefresh}
              disabled={isRefreshing}
              icon={
                <RefreshCw
                  className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`}
                />
              }
              label="Atualizar"
            />

            <ActionButton
              onClick={() => router.push("/estatisticas")}
              icon={<BarChart3 className="w-4 h-4" />}
              label="Estatísticas"
              highlight
            />

            <div className="h-6 w-px bg-slate-200 mx-1" />

            <ActionButton
              onClick={handleLogout}
              disabled={isPending}
              icon={<LogOut className="w-4 h-4" />}
              label="Sair"
              variant="danger"
            />
          </div>
        </div>

        {/* Second row: Check type filter */}
        <div className="flex items-center gap-3 mt-4 pt-4 border-t border-slate-100">
          <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">
            Tipo de Registro
          </span>
          <FilterTabs
            activeFilter={activeFilter}
            onFilterChange={onFilterChange}
            counts={filterCounts}
          />
        </div>
      </div>
    </header>
  );
}

// Attendance filter button component
function AttendanceButton({
  active,
  onClick,
  icon,
  label,
  count,
  variant = "default",
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  count: number;
  variant?: "default" | "success" | "danger";
}) {
  const variants = {
    default: {
      active: "bg-white text-slate-800 shadow-sm",
      inactive: "text-slate-500 hover:text-slate-700 hover:bg-slate-50",
      badge: "bg-slate-100",
      badgeActive: "bg-blue-100 text-blue-700",
    },
    success: {
      active: "bg-emerald-50 text-emerald-700 shadow-sm border border-emerald-200",
      inactive: "text-slate-500 hover:text-emerald-600 hover:bg-emerald-50/50",
      badge: "bg-slate-100",
      badgeActive: "bg-emerald-100 text-emerald-700",
    },
    danger: {
      active: "bg-red-50 text-red-700 shadow-sm border border-red-200",
      inactive: "text-slate-500 hover:text-red-600 hover:bg-red-50/50",
      badge: "bg-slate-100",
      badgeActive: "bg-red-100 text-red-700",
    },
  };

  const style = variants[variant];

  return (
    <button
      onClick={onClick}
      className={`
        flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium 
        transition-all duration-200 ease-out
        ${active ? style.active : style.inactive}
      `}
    >
      {icon}
      <span className="hidden lg:inline">{label}</span>
      <span
        className={`
          tabular-nums text-xs px-1.5 py-0.5 rounded-md font-semibold
          ${active ? style.badgeActive : style.badge}
        `}
      >
        {count}
      </span>
    </button>
  );
}

// Action button component
function ActionButton({
  onClick,
  disabled,
  icon,
  label,
  variant = "default",
  highlight = false,
}: {
  onClick: () => void;
  disabled?: boolean;
  icon: React.ReactNode;
  label: string;
  variant?: "default" | "danger";
  highlight?: boolean;
}) {
  const baseStyles = `
    flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium
    transition-all duration-200 ease-out disabled:opacity-50 disabled:cursor-not-allowed
    btn-interactive
  `;

  const variantStyles = {
    default: highlight
      ? "bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200"
      : "text-slate-500 hover:text-slate-700 hover:bg-slate-100",
    danger: "text-slate-500 hover:text-red-600 hover:bg-red-50",
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${baseStyles} ${variantStyles[variant]}`}
    >
      {icon}
      <span className="hidden lg:inline">{label}</span>
    </button>
  );
}
