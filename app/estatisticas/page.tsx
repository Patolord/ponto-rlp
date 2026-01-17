import { redirect } from "next/navigation";
import {
  isAuthenticated,
  fetchEmployees,
  fetchPontoChecks,
} from "@/lib/rhid";
import { getDailyCost } from "@/app/actions/sync";
import StatsContent from "./StatsContent";

export default async function EstatisticasPage() {
  // Check authentication
  const authenticated = await isAuthenticated();
  if (!authenticated) {
    redirect("/login");
  }

  // Fetch data
  const [employeesResult, checksResult, dailyCost] = await Promise.all([
    fetchEmployees(),
    fetchPontoChecks(),
    getDailyCost(),
  ]);

  if (!employeesResult.success && employeesResult.error === "Sessão expirada") {
    redirect("/login");
  }

  return (
    <StatsContent
      employees={employeesResult.success ? employeesResult.data : []}
      checks={checksResult.success ? checksResult.data : []}
      initialDailyCost={dailyCost}
    />
  );
}
