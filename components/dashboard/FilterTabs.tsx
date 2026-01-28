"use client";

import { Sunrise, Utensils, RotateCcw, Sunset, LayoutGrid } from "lucide-react";

type FilterTabsProps = {
  activeFilter: number | null;
  onFilterChange: (filter: number | null) => void;
  counts: {
    todos: number;
    entrada: number;
    almoco: number;
    retorno: number;
    saida: number;
  };
};

const FILTERS = [
  { id: null, label: "Todos", key: "todos", icon: LayoutGrid, color: "blue" },
  { id: 0, label: "Entrada", key: "entrada", icon: Sunrise, color: "sky" },
  { id: 1, label: "Almoço", key: "almoco", icon: Utensils, color: "orange" },
  { id: 2, label: "Retorno", key: "retorno", icon: RotateCcw, color: "violet" },
  { id: 3, label: "Saída", key: "saida", icon: Sunset, color: "rose" },
] as const;

const colorStyles = {
  blue: {
    active: "bg-blue-600 text-white shadow-lg shadow-blue-500/25",
    icon: "text-white",
    badge: "bg-blue-500/20 text-white",
  },
  sky: {
    active: "bg-sky-500 text-white shadow-lg shadow-sky-500/25",
    icon: "text-white",
    badge: "bg-sky-400/20 text-white",
  },
  orange: {
    active: "bg-orange-500 text-white shadow-lg shadow-orange-500/25",
    icon: "text-white",
    badge: "bg-orange-400/20 text-white",
  },
  violet: {
    active: "bg-violet-500 text-white shadow-lg shadow-violet-500/25",
    icon: "text-white",
    badge: "bg-violet-400/20 text-white",
  },
  rose: {
    active: "bg-rose-500 text-white shadow-lg shadow-rose-500/25",
    icon: "text-white",
    badge: "bg-rose-400/20 text-white",
  },
};

export default function FilterTabs({
  activeFilter,
  onFilterChange,
  counts,
}: FilterTabsProps) {
  return (
    <div className="flex items-center gap-1.5 p-1.5 rounded-xl bg-slate-100 border border-slate-200">
      {FILTERS.map((filter) => {
        const isActive = activeFilter === filter.id;
        const count = counts[filter.key as keyof typeof counts];
        const Icon = filter.icon;
        const colors = colorStyles[filter.color];

        return (
          <button
            key={filter.key}
            onClick={() => onFilterChange(filter.id)}
            className={`
              relative flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg 
              transition-all duration-300 ease-out btn-interactive
              ${
                isActive
                  ? colors.active
                  : "text-slate-500 hover:text-slate-700 hover:bg-white"
              }
            `}
          >
            <Icon className={`w-4 h-4 ${isActive ? colors.icon : ""}`} />
            <span className="hidden sm:inline">{filter.label}</span>
            {count > 0 && (
              <span
                className={`
                  tabular-nums text-xs px-1.5 py-0.5 rounded font-semibold
                  ${isActive ? colors.badge : "bg-slate-200 text-slate-600"}
                `}
              >
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
