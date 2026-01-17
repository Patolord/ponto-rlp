"use client";

import { useState, useMemo, useTransition } from "react";
import Link from "next/link";
import { useQuery as useConvexQuery } from "convex/react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/convex/_generated/api";
import type { Employee, PontoCheck } from "@/lib/rhid";
import { syncTodayAttendance, setDailyCost } from "@/app/actions/sync";
import { fetchMonthlyStats } from "@/app/actions/stats";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ArrowLeft,
  Users,
  UserCheck,
  UserX,
  Clock,
  TrendingUp,
  MapPin,
  Save,
  RefreshCw,
  Calendar,
  DollarSign,
  Building2,
  Settings,
  ChevronDown,
  ChevronUp,
  Database,
  Wifi,
  Loader2,
} from "lucide-react";

type StatsContentProps = {
  employees: Employee[];
  checks: PontoCheck[];
  initialDailyCost: number;
};

type TabType = "today" | "history" | "settings";
type DataSource = "rhid" | "convex";

// Month names in Portuguese
const MONTH_NAMES = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

export default function StatsContent({
  employees,
  checks,
  initialDailyCost,
}: StatsContentProps) {
  const [activeTab, setActiveTab] = useState<TabType>("today");
  const [dailyCost, setDailyCostState] = useState(initialDailyCost);
  const [costInput, setCostInput] = useState(initialDailyCost.toString());
  const [isSyncing, startSync] = useTransition();
  const [isSavingCost, startSaveCost] = useTransition();
  const [syncResult, setSyncResult] = useState<{
    inserted: number;
    updated: number;
  } | null>(null);
  const [expandedEmployee, setExpandedEmployee] = useState<number | null>(null);
  const [expandedWorksite, setExpandedWorksite] = useState<number | null>(null);

  // Data source toggle: RHID (live) or Convex (archive)
  const [dataSource, setDataSource] = useState<DataSource>("rhid");

  // Month/Year selectors (default: current month)
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(() => new Date().getFullYear());

  // Generate year options (last 3 years)
  const yearOptions = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return [currentYear, currentYear - 1, currentYear - 2];
  }, []);

  // Convert month/year to date range for Convex queries
  const { startDate, endDate } = useMemo(() => {
    const start = `${selectedYear}-${String(selectedMonth).padStart(2, "0")}-01`;
    const lastDay = new Date(selectedYear, selectedMonth, 0).getDate();
    const end = `${selectedYear}-${String(selectedMonth).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
    return { startDate: start, endDate: end };
  }, [selectedYear, selectedMonth]);

  // TanStack Query for RHID data (with caching)
  const {
    data: rhidData,
    isLoading: isRhidLoading,
    error: rhidError,
    refetch: refetchRhid,
  } = useQuery({
    queryKey: ["rhid-monthly-stats", selectedYear, selectedMonth],
    queryFn: async () => {
      const result = await fetchMonthlyStats(selectedYear, selectedMonth);
      if (!result.success) {
        throw new Error(result.error);
      }
      return result.data;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes cache
    enabled: dataSource === "rhid",
  });

  // Convex queries for archive data
  const convexManDaysByEmployee = useConvexQuery(
    api.attendance.getManDaysByEmployee,
    dataSource === "convex" ? { startDate, endDate } : "skip"
  );

  const convexManDaysByWorksite = useConvexQuery(
    api.attendance.getManDaysByWorksite,
    dataSource === "convex" ? { startDate, endDate } : "skip"
  );

  const recordedDates = useConvexQuery(api.attendance.getRecordedDates, {});

  // Unified data based on selected source
  const manDaysByEmployee = dataSource === "rhid" 
    ? rhidData?.manDaysByEmployee 
    : convexManDaysByEmployee;

  const manDaysByWorksite = dataSource === "rhid" 
    ? rhidData?.manDaysByWorksite 
    : convexManDaysByWorksite;

  const isLoading = dataSource === "rhid" 
    ? isRhidLoading 
    : convexManDaysByEmployee === undefined;

  // Calculate today's statistics
  const todayStats = useMemo(() => {
    const presentEmployeeIds = new Set(checks.map((c) => c.funcionarioId));
    const presentCount = presentEmployeeIds.size;
    const absentCount = employees.length - presentCount;
    const attendanceRate =
      employees.length > 0
        ? Math.round((presentCount / employees.length) * 100)
        : 0;

    // Count by check type
    const checkTypeCounts = {
      entrada: 0,
      almoco_saida: 0,
      almoco_retorno: 0,
      saida: 0,
    };

    for (const check of checks) {
      if (check.tipo in checkTypeCounts) {
        checkTypeCounts[check.tipo as keyof typeof checkTypeCounts]++;
      }
    }

    // Count by worksite with unique employees
    const worksiteData = new Map<
      number,
      { name: string; employees: Set<number>; checks: number }
    >();
    for (const check of checks) {
      if (check.obraId) {
        if (!worksiteData.has(check.obraId)) {
          worksiteData.set(check.obraId, {
            name: check.obraNome || "Sem nome",
            employees: new Set(),
            checks: 0,
          });
        }
        const ws = worksiteData.get(check.obraId)!;
        ws.employees.add(check.funcionarioId);
        ws.checks++;
      }
    }

    const topWorksites = Array.from(worksiteData.entries())
      .map(([id, data]) => ({
        id,
        name: data.name,
        employeeCount: data.employees.size,
        checkCount: data.checks,
      }))
      .sort((a, b) => b.employeeCount - a.employeeCount)
      .slice(0, 5);

    // Calculate average check-in time
    const entryChecks = checks.filter((c) => c.tipo === "entrada");
    let avgEntryTime = "N/A";
    if (entryChecks.length > 0) {
      const totalMinutes = entryChecks.reduce((sum, check) => {
        const date = new Date(check.dataHora);
        return sum + date.getHours() * 60 + date.getMinutes();
      }, 0);
      const avgMinutes = Math.round(totalMinutes / entryChecks.length);
      const hours = Math.floor(avgMinutes / 60);
      const minutes = avgMinutes % 60;
      avgEntryTime = `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
    }

    return {
      totalEmployees: employees.length,
      presentCount,
      absentCount,
      attendanceRate,
      checkTypeCounts,
      topWorksites,
      totalChecks: checks.length,
      avgEntryTime,
    };
  }, [employees, checks]);

  // Handle sync
  const handleSync = () => {
    startSync(async () => {
      const result = await syncTodayAttendance();
      if (result.success) {
        setSyncResult(result.data);
      } else {
        alert("Erro ao sincronizar: " + result.error);
      }
    });
  };

  // Handle save cost
  const handleSaveCost = () => {
    const cost = parseFloat(costInput);
    if (isNaN(cost) || cost < 0) {
      alert("Digite um valor válido");
      return;
    }

    startSaveCost(async () => {
      const result = await setDailyCost(cost);
      if (result.success) {
        setDailyCostState(cost);
      } else {
        alert("Erro ao salvar: " + result.error);
      }
    });
  };

  // Calculate historical totals
  const historyStats = useMemo(() => {
    if (dataSource === "rhid" && rhidData) {
      return {
        totalManDays: rhidData.totalManDays,
        totalCost: rhidData.totalManDays * dailyCost,
        uniqueEmployees: rhidData.uniqueEmployees,
        uniqueWorksites: rhidData.uniqueWorksites,
      };
    }

    if (dataSource === "convex" && convexManDaysByEmployee && convexManDaysByWorksite) {
      const totalManDays = convexManDaysByEmployee.reduce(
        (sum, e) => sum + e.totalDays,
        0
      );
      return {
        totalManDays,
        totalCost: totalManDays * dailyCost,
        uniqueEmployees: convexManDaysByEmployee.length,
        uniqueWorksites: convexManDaysByWorksite.length,
      };
    }

    return null;
  }, [dataSource, rhidData, convexManDaysByEmployee, convexManDaysByWorksite, dailyCost]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950">
      {/* Header */}
      <header className="bg-slate-900/80 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button
                variant="ghost"
                size="sm"
                className="text-slate-400 hover:text-white"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar ao Mapa
              </Button>
            </Link>
            <h1 className="text-xl font-semibold text-white">
              Estatísticas e Relatórios
            </h1>
          </div>

          {/* Sync button */}
          <Button
            onClick={handleSync}
            disabled={isSyncing}
            className="bg-indigo-600 hover:bg-indigo-700"
          >
            <RefreshCw
              className={`w-4 h-4 mr-2 ${isSyncing ? "animate-spin" : ""}`}
            />
            {isSyncing ? "Sincronizando..." : "Salvar Dia no Histórico"}
          </Button>
        </div>

        {/* Tabs */}
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex gap-1">
            <button
              onClick={() => setActiveTab("today")}
              className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                activeTab === "today"
                  ? "bg-white/10 text-white"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Clock className="w-4 h-4 inline mr-2" />
              Hoje
            </button>
            <button
              onClick={() => setActiveTab("history")}
              className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                activeTab === "history"
                  ? "bg-white/10 text-white"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Calendar className="w-4 h-4 inline mr-2" />
              Histórico
            </button>
            <button
              onClick={() => setActiveTab("settings")}
              className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                activeTab === "settings"
                  ? "bg-white/10 text-white"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Settings className="w-4 h-4 inline mr-2" />
              Configurações
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Sync result notification */}
        {syncResult && (
          <div className="mb-6 p-4 bg-green-500/20 border border-green-500/30 rounded-xl text-green-400">
            Dados sincronizados: {syncResult.inserted} inseridos,{" "}
            {syncResult.updated} atualizados
            <button
              onClick={() => setSyncResult(null)}
              className="ml-4 text-green-300 hover:text-white"
            >
              ✕
            </button>
          </div>
        )}

        {/* Today Tab */}
        {activeTab === "today" && (
          <>
            {/* Main stats grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-indigo-500/20 flex items-center justify-center">
                    <Users className="w-6 h-6 text-indigo-400" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-400">Total Funcionários</p>
                    <p className="text-3xl font-bold text-white">
                      {todayStats.totalEmployees}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center">
                    <UserCheck className="w-6 h-6 text-green-400" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-400">Presentes</p>
                    <p className="text-3xl font-bold text-white">
                      {todayStats.presentCount}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-red-500/20 flex items-center justify-center">
                    <UserX className="w-6 h-6 text-red-400" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-400">Ausentes</p>
                    <p className="text-3xl font-bold text-white">
                      {todayStats.absentCount}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-blue-400" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-400">Taxa de Presença</p>
                    <p className="text-3xl font-bold text-white">
                      {todayStats.attendanceRate}%
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Check types breakdown */}
              <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
                <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-slate-400" />
                  Registros por Tipo
                </h2>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="w-3 h-3 rounded-full bg-green-500" />
                      <span className="text-slate-300">Entrada</span>
                    </div>
                    <span className="text-xl font-semibold text-white">
                      {todayStats.checkTypeCounts.entrada}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="w-3 h-3 rounded-full bg-amber-500" />
                      <span className="text-slate-300">Saída Almoço</span>
                    </div>
                    <span className="text-xl font-semibold text-white">
                      {todayStats.checkTypeCounts.almoco_saida}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="w-3 h-3 rounded-full bg-blue-500" />
                      <span className="text-slate-300">Retorno Almoço</span>
                    </div>
                    <span className="text-xl font-semibold text-white">
                      {todayStats.checkTypeCounts.almoco_retorno}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="w-3 h-3 rounded-full bg-red-500" />
                      <span className="text-slate-300">Saída</span>
                    </div>
                    <span className="text-xl font-semibold text-white">
                      {todayStats.checkTypeCounts.saida}
                    </span>
                  </div>
                </div>

                <div className="mt-6 pt-6 border-t border-white/10">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Total de Registros</span>
                    <span className="text-xl font-semibold text-white">
                      {todayStats.totalChecks}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-slate-400">Média de Entrada</span>
                    <span className="text-lg font-medium text-indigo-400">
                      {todayStats.avgEntryTime}
                    </span>
                  </div>
                </div>
              </div>

              {/* Top Worksites */}
              <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
                <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-slate-400" />
                  Obras Hoje (por funcionários)
                </h2>
                {todayStats.topWorksites.length > 0 ? (
                  <div className="space-y-3">
                    {todayStats.topWorksites.map((worksite, index) => (
                      <div
                        key={worksite.id}
                        className="flex items-center justify-between p-3 bg-white/5 rounded-xl"
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${
                              index === 0
                                ? "bg-amber-500/20 text-amber-400"
                                : index === 1
                                  ? "bg-slate-400/20 text-slate-300"
                                  : index === 2
                                    ? "bg-orange-700/20 text-orange-500"
                                    : "bg-white/10 text-slate-400"
                            }`}
                          >
                            {index + 1}
                          </span>
                          <span className="text-slate-200 font-medium">
                            {worksite.name}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-lg font-semibold text-white">
                            {worksite.employeeCount}
                          </span>
                          <span className="text-xs text-slate-500 ml-1">
                            func.
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-500 text-center py-8">
                    Nenhum registro de obra encontrado
                  </p>
                )}
              </div>
            </div>
          </>
        )}

        {/* History Tab */}
        {activeTab === "history" && (
          <>
            {/* Period and Source Selection */}
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 mb-6">
              <div className="flex flex-wrap items-start justify-between gap-6">
                {/* Month/Year Selectors */}
                <div>
                  <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-slate-400" />
                    Período
                  </h2>
                  <div className="flex flex-wrap items-center gap-3">
                    <div>
                      <label className="block text-sm text-slate-400 mb-1">
                        Mês
                      </label>
                      <select
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(Number(e.target.value))}
                        className="bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        {MONTH_NAMES.map((name, index) => (
                          <option key={index} value={index + 1} className="bg-slate-800">
                            {name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm text-slate-400 mb-1">
                        Ano
                      </label>
                      <select
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(Number(e.target.value))}
                        className="bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        {yearOptions.map((year) => (
                          <option key={year} value={year} className="bg-slate-800">
                            {year}
                          </option>
                        ))}
                      </select>
                    </div>
                    {dataSource === "rhid" && (
                      <Button
                        onClick={() => refetchRhid()}
                        disabled={isRhidLoading}
                        variant="ghost"
                        size="sm"
                        className="mt-5 text-slate-400 hover:text-white"
                      >
                        <RefreshCw className={`w-4 h-4 ${isRhidLoading ? "animate-spin" : ""}`} />
                      </Button>
                    )}
                  </div>
                </div>

                {/* Data Source Toggle */}
                <div>
                  <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <Database className="w-5 h-5 text-slate-400" />
                    Fonte de Dados
                  </h2>
                  <div className="flex rounded-lg overflow-hidden border border-white/10">
                    <button
                      onClick={() => setDataSource("rhid")}
                      className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors ${
                        dataSource === "rhid"
                          ? "bg-indigo-600 text-white"
                          : "bg-white/5 text-slate-400 hover:text-white"
                      }`}
                    >
                      <Wifi className="w-4 h-4" />
                      Tempo Real
                    </button>
                    <button
                      onClick={() => setDataSource("convex")}
                      className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors ${
                        dataSource === "convex"
                          ? "bg-indigo-600 text-white"
                          : "bg-white/5 text-slate-400 hover:text-white"
                      }`}
                    >
                      <Database className="w-4 h-4" />
                      Arquivo
                    </button>
                  </div>
                  <p className="text-xs text-slate-500 mt-2">
                    {dataSource === "rhid" 
                      ? "Consultando RHID diretamente" 
                      : `${recordedDates?.length ?? 0} dias salvos no arquivo`}
                  </p>
                </div>
              </div>

              {/* Error message */}
              {dataSource === "rhid" && rhidError && (
                <div className="mt-4 p-3 bg-red-500/20 border border-red-500/30 rounded-lg text-red-400 text-sm">
                  Erro ao carregar dados: {rhidError.message}
                </div>
              )}
            </div>

            {/* History Summary */}
            {historyStats && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-indigo-500/20 flex items-center justify-center">
                      <Calendar className="w-6 h-6 text-indigo-400" />
                    </div>
                    <div>
                      <p className="text-sm text-slate-400">
                        Total Homem-Dias
                      </p>
                      <p className="text-3xl font-bold text-white">
                        {historyStats.totalManDays}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center">
                      <DollarSign className="w-6 h-6 text-green-400" />
                    </div>
                    <div>
                      <p className="text-sm text-slate-400">Custo Total</p>
                      <p className="text-2xl font-bold text-white">
                        {formatCurrency(historyStats.totalCost)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
                      <Users className="w-6 h-6 text-blue-400" />
                    </div>
                    <div>
                      <p className="text-sm text-slate-400">Funcionários</p>
                      <p className="text-3xl font-bold text-white">
                        {historyStats.uniqueEmployees}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center">
                      <Building2 className="w-6 h-6 text-amber-400" />
                    </div>
                    <div>
                      <p className="text-sm text-slate-400">Obras</p>
                      <p className="text-3xl font-bold text-white">
                        {historyStats.uniqueWorksites}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Man-days by Employee */}
              <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
                <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Users className="w-5 h-5 text-slate-400" />
                  Homem-Dias por Funcionário
                </h2>
                {manDaysByEmployee && manDaysByEmployee.length > 0 ? (
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {manDaysByEmployee
                      .sort((a, b) => b.totalDays - a.totalDays)
                      .map((emp) => (
                        <div key={emp.rhidEmployeeId}>
                          <button
                            onClick={() =>
                              setExpandedEmployee(
                                expandedEmployee === emp.rhidEmployeeId
                                  ? null
                                  : emp.rhidEmployeeId
                              )
                            }
                            className="w-full flex items-center justify-between p-3 bg-white/5 rounded-xl hover:bg-white/10 transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center text-white font-medium text-xs">
                                {emp.employeeName.charAt(0).toUpperCase()}
                              </div>
                              <span className="text-slate-200 font-medium text-sm truncate max-w-[150px]">
                                {emp.employeeName}
                              </span>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="text-right">
                                <span className="text-lg font-semibold text-white">
                                  {emp.totalDays}
                                </span>
                                <span className="text-xs text-slate-500 ml-1">
                                  dias
                                </span>
                                <p className="text-xs text-green-400">
                                  {formatCurrency(emp.totalDays * dailyCost)}
                                </p>
                              </div>
                              {expandedEmployee === emp.rhidEmployeeId ? (
                                <ChevronUp className="w-4 h-4 text-slate-400" />
                              ) : (
                                <ChevronDown className="w-4 h-4 text-slate-400" />
                              )}
                            </div>
                          </button>
                          {expandedEmployee === emp.rhidEmployeeId && (
                            <div className="ml-11 mt-2 space-y-1">
                              {emp.worksiteBreakdown.map((ws, idx) => (
                                <div
                                  key={idx}
                                  className="flex justify-between text-xs p-2 bg-white/5 rounded"
                                >
                                  <span className="text-slate-400 truncate max-w-[150px]">
                                    {ws.worksiteName || "Sem obra"}
                                  </span>
                                  <span className="text-slate-300">
                                    {ws.days} dias
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    {isLoading ? (
                      <div className="flex flex-col items-center gap-2">
                        <Loader2 className="w-6 h-6 text-indigo-400 animate-spin" />
                        <p className="text-slate-500">Carregando...</p>
                      </div>
                    ) : (
                      <p className="text-slate-500">
                        {dataSource === "rhid"
                          ? "Nenhum registro encontrado para este período."
                          : "Nenhum dado no arquivo. Clique em 'Salvar Dia no Histórico' para arquivar."}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Man-days by Worksite */}
              <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
                <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-slate-400" />
                  Homem-Dias por Obra
                </h2>
                {manDaysByWorksite && manDaysByWorksite.length > 0 ? (
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {manDaysByWorksite
                      .sort((a, b) => b.totalManDays - a.totalManDays)
                      .map((ws) => (
                        <div key={ws.worksiteId}>
                          <button
                            onClick={() =>
                              setExpandedWorksite(
                                expandedWorksite === ws.worksiteId
                                  ? null
                                  : ws.worksiteId ?? null
                              )
                            }
                            className="w-full flex items-center justify-between p-3 bg-white/5 rounded-xl hover:bg-white/10 transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
                                <MapPin className="w-4 h-4 text-amber-400" />
                              </div>
                              <div>
                                <span className="text-slate-200 font-medium text-sm block truncate max-w-[150px]">
                                  {ws.worksiteName || "Sem nome"}
                                </span>
                                <span className="text-xs text-slate-500">
                                  {ws.uniqueEmployees} funcionários
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="text-right">
                                <span className="text-lg font-semibold text-white">
                                  {ws.totalManDays}
                                </span>
                                <span className="text-xs text-slate-500 ml-1">
                                  H/D
                                </span>
                                <p className="text-xs text-green-400">
                                  {formatCurrency(ws.totalManDays * dailyCost)}
                                </p>
                              </div>
                              {expandedWorksite === ws.worksiteId ? (
                                <ChevronUp className="w-4 h-4 text-slate-400" />
                              ) : (
                                <ChevronDown className="w-4 h-4 text-slate-400" />
                              )}
                            </div>
                          </button>
                          {expandedWorksite === ws.worksiteId && (
                            <div className="ml-11 mt-2 space-y-1">
                              {ws.employeeBreakdown
                                .sort((a, b) => b.days - a.days)
                                .map((emp) => (
                                  <div
                                    key={emp.rhidEmployeeId}
                                    className="flex justify-between text-xs p-2 bg-white/5 rounded"
                                  >
                                    <span className="text-slate-400 truncate max-w-[150px]">
                                      {emp.employeeName}
                                    </span>
                                    <span className="text-slate-300">
                                      {emp.days} dias
                                    </span>
                                  </div>
                                ))}
                            </div>
                          )}
                        </div>
                      ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    {isLoading ? (
                      <div className="flex flex-col items-center gap-2">
                        <Loader2 className="w-6 h-6 text-indigo-400 animate-spin" />
                        <p className="text-slate-500">Carregando...</p>
                      </div>
                    ) : (
                      <p className="text-slate-500">
                        {dataSource === "rhid"
                          ? "Nenhum registro encontrado para este período."
                          : "Nenhum dado no arquivo. Clique em 'Salvar Dia no Histórico' para arquivar."}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* Settings Tab */}
        {activeTab === "settings" && (
          <div className="max-w-xl">
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
              <h2 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-slate-400" />
                Custo Diário por Funcionário
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-2">
                    Valor em R$ por dia trabalhado
                  </label>
                  <div className="flex gap-3">
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={costInput}
                      onChange={(e) => setCostInput(e.target.value)}
                      className="bg-white/5 border-white/10 text-white max-w-[200px]"
                      placeholder="150.00"
                    />
                    <Button
                      onClick={handleSaveCost}
                      disabled={isSavingCost}
                      className="bg-indigo-600 hover:bg-indigo-700"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      {isSavingCost ? "Salvando..." : "Salvar"}
                    </Button>
                  </div>
                </div>

                <div className="pt-4 border-t border-white/10">
                  <p className="text-sm text-slate-400">
                    Valor atual:{" "}
                    <span className="text-white font-semibold">
                      {formatCurrency(dailyCost)}
                    </span>{" "}
                    por dia
                  </p>
                  <p className="text-xs text-slate-500 mt-2">
                    Este valor é usado para calcular o custo total de
                    homem-dias nos relatórios históricos.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
