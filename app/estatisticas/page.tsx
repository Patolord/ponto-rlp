import { redirect } from "next/navigation";
import { isAuthenticated } from "@/app/actions/auth";
import {
  fetchEmployees,
  fetchPontoChecks,
} from "@/app/actions/rhid";
import StatsContent from "./StatsContent";

export default async function EstatisticasPage() {
  // Check authentication
  const authenticated = await isAuthenticated();
  if (!authenticated) {
    redirect("/login");
  }

  // Fetch data
  const [employeesResult, checksResult] = await Promise.all([
    fetchEmployees(),
    fetchPontoChecks(),
  ]);

  if (!employeesResult.success && employeesResult.error === "Sessão expirada") {
    redirect("/login");
  }

  return (
    <StatsContent
      employees={employeesResult.success ? employeesResult.data : []}
      checks={checksResult.success ? checksResult.data : []}
    />
  );
}
