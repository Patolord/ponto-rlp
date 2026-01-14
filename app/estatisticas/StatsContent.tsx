"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { Employee, PontoCheck } from "@/app/actions/rhid";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Users,
  UserCheck,
  UserX,
  Clock,
  TrendingUp,
  MapPin,
} from "lucide-react";

type StatsContentProps = {
  employees: Employee[];
  checks: PontoCheck[];
};

export default function StatsContent({ employees, checks }: StatsContentProps) {
  const router = useRouter();

  // Calculate statistics
  const stats = useMemo(() => {
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

    // Count by worksite
    const worksiteCounts = new Map<string, { name: string; count: number }>();
    for (const check of checks) {
      if (check.obraNome) {
        const existing = worksiteCounts.get(check.obraId || "");
        if (existing) {
          existing.count++;
        } else {
          worksiteCounts.set(check.obraId || "", {
            name: check.obraNome,
            count: 1,
          });
        }
      }
    }

    // Get top worksites
    const topWorksites = Array.from(worksiteCounts.values())
      .sort((a, b) => b.count - a.count)
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950">
      {/* Header */}
      <header className="bg-slate-900/80 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar ao Mapa
              </Button>
            </Link>
            <h1 className="text-xl font-semibold text-white">Estatísticas</h1>
          </div>
          <p className="text-sm text-slate-500">
            Dados de {new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Main stats grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total Employees */}
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-indigo-500/20 flex items-center justify-center">
                <Users className="w-6 h-6 text-indigo-400" />
              </div>
              <div>
                <p className="text-sm text-slate-400">Total Funcionários</p>
                <p className="text-3xl font-bold text-white">{stats.totalEmployees}</p>
              </div>
            </div>
          </div>

          {/* Present */}
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center">
                <UserCheck className="w-6 h-6 text-green-400" />
              </div>
              <div>
                <p className="text-sm text-slate-400">Presentes</p>
                <p className="text-3xl font-bold text-white">{stats.presentCount}</p>
              </div>
            </div>
          </div>

          {/* Absent */}
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-red-500/20 flex items-center justify-center">
                <UserX className="w-6 h-6 text-red-400" />
              </div>
              <div>
                <p className="text-sm text-slate-400">Ausentes</p>
                <p className="text-3xl font-bold text-white">{stats.absentCount}</p>
              </div>
            </div>
          </div>

          {/* Attendance Rate */}
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-slate-400">Taxa de Presença</p>
                <p className="text-3xl font-bold text-white">{stats.attendanceRate}%</p>
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
                  {stats.checkTypeCounts.entrada}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="w-3 h-3 rounded-full bg-amber-500" />
                  <span className="text-slate-300">Saída Almoço</span>
                </div>
                <span className="text-xl font-semibold text-white">
                  {stats.checkTypeCounts.almoco_saida}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="w-3 h-3 rounded-full bg-blue-500" />
                  <span className="text-slate-300">Retorno Almoço</span>
                </div>
                <span className="text-xl font-semibold text-white">
                  {stats.checkTypeCounts.almoco_retorno}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="w-3 h-3 rounded-full bg-red-500" />
                  <span className="text-slate-300">Saída</span>
                </div>
                <span className="text-xl font-semibold text-white">
                  {stats.checkTypeCounts.saida}
                </span>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-white/10">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Total de Registros</span>
                <span className="text-xl font-semibold text-white">
                  {stats.totalChecks}
                </span>
              </div>
              <div className="flex items-center justify-between mt-2">
                <span className="text-slate-400">Média de Entrada</span>
                <span className="text-lg font-medium text-indigo-400">
                  {stats.avgEntryTime}
                </span>
              </div>
            </div>
          </div>

          {/* Top Worksites */}
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-slate-400" />
              Top Obras (por registros)
            </h2>
            {stats.topWorksites.length > 0 ? (
              <div className="space-y-3">
                {stats.topWorksites.map((worksite, index) => (
                  <div
                    key={index}
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
                    <span className="text-lg font-semibold text-white">
                      {worksite.count}
                    </span>
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
      </main>
    </div>
  );
}
