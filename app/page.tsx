import { redirect } from "next/navigation";
import { isAuthenticated } from "@/lib/rhid";
import Dashboard from "@/components/dashboard/Dashboard";

export default async function DashboardPage() {
  // Check authentication
  const authenticated = await isAuthenticated();
  if (!authenticated) {
    redirect("/login");
  }

  return <Dashboard />;
}
