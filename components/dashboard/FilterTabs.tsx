"use client";

type FilterTabsProps = {
  activeFilter: number | null; // null = todos, 0 = entrada, 1 = almoco, 2 = retorno, 3 = saida
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
  { id: null, label: "Todos", key: "todos" },
  { id: 0, label: "Entrada", key: "entrada" },
  { id: 1, label: "Almoço", key: "almoco" },
  { id: 2, label: "Retorno", key: "retorno" },
  { id: 3, label: "Saída", key: "saida" },
] as const;

export default function FilterTabs({
  activeFilter,
  onFilterChange,
  counts,
}: FilterTabsProps) {
  return (
    <div className="flex items-center gap-1 bg-slate-800/50 p-1 rounded-xl">
      {FILTERS.map((filter) => {
        const isActive = activeFilter === filter.id;
        const count = counts[filter.key as keyof typeof counts];

        return (
          <button
            key={filter.key}
            onClick={() => onFilterChange(filter.id)}
            className={`
              relative px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200
              ${
                isActive
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              }
            `}
          >
            <span>{filter.label}</span>
            {count > 0 && (
              <span
                className={`ml-1.5 text-xs ${
                  isActive ? "text-slate-500" : "text-slate-500"
                }`}
              >
                ({count})
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
