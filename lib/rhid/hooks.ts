"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchEmployees, fetchPontoChecks, fetchWorksites } from "./index";

/**
 * Hook to fetch employees from RHID API
 * Data is considered stale after 5 minutes
 */
export function useEmployees() {
  return useQuery({
    queryKey: ["rhid", "employees"],
    queryFn: fetchEmployees,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Hook to fetch ponto (attendance) checks from RHID API
 * Data is considered stale after 1 minute
 * Auto-refreshes every 5 minutes
 */
export function usePontoChecks(startDate?: string, endDate?: string) {
  return useQuery({
    queryKey: ["rhid", "pontoChecks", startDate, endDate],
    queryFn: () => fetchPontoChecks(startDate, endDate),
    staleTime: 1000 * 60, // 1 minute
    refetchInterval: 1000 * 60 * 5, // Auto-refresh every 5 min
  });
}

/**
 * Hook to fetch worksites from RHID API
 * Data is considered stale after 5 minutes
 */
export function useWorksites() {
  return useQuery({
    queryKey: ["rhid", "worksites"],
    queryFn: fetchWorksites,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Hook to invalidate all RHID queries (useful for refresh button)
 */
export function useRefreshRhidData() {
  const queryClient = useQueryClient();

  return () => {
    queryClient.invalidateQueries({ queryKey: ["rhid"] });
  };
}
