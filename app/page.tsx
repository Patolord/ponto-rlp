import { redirect } from "next/navigation";
import {
  isAuthenticated,
  fetchEmployees,
  fetchPontoChecks,
  fetchWorksites,
} from "@/lib/rhid";
import Dashboard from "@/components/dashboard/Dashboard";

export default async function DashboardPage() {
  // Check authentication
  const authenticated = await isAuthenticated();
  if (!authenticated) {
    redirect("/login");
  }

  // Fetch initial data server-side
  const [employeesResult, checksResult, worksitesResult] = await Promise.all([
    fetchEmployees(),
    fetchPontoChecks(),
    fetchWorksites(),
  ]);

  // Handle errors - redirect to login if session expired
  const sessionExpired =
    (!employeesResult.success && employeesResult.error === "Sessão expirada") ||
    (!checksResult.success && checksResult.error === "Sessão expirada") ||
    (!worksitesResult.success && worksitesResult.error === "Sessão expirada");

  if (sessionExpired) {
    redirect("/login");
  }

  return (
    <Dashboard
      initialEmployees={employeesResult.success ? employeesResult.data : []}
      initialChecks={checksResult.success ? checksResult.data : []}
      initialWorksites={worksitesResult.success ? worksitesResult.data : []}
    />
  );
}
