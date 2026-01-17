"use server";

import { DEFAULT_COMPANY_ID } from "../config";
import { rhidFetch, formatDateForRhid } from "../client";
import type {
  EmployeeCheckIn,
  PontoCheck,
  Worksite,
  FetchResult,
} from "../types";
import { mapCheckTypeNumber } from "../types";

/**
 * Fetch ponto (attendance) checks from RHID API
 */
export async function fetchPontoChecks(
  startDate?: string,
  endDate?: string
): Promise<FetchResult<PontoCheck[]>> {
  // Use today's date if not provided
  const today = new Date();
  const ini = startDate || formatDateForRhid(today);
  const fim = endDate || formatDateForRhid(today);

  console.log(`Fetching ponto checks from ${ini} to ${fim}`);

  // API body format matches the actual RHID API
  const requestBody = {
    listPeople: [],
    listCompanies: [DEFAULT_COMPANY_ID],
    listDepartments: [],
    ini,
    fim,
    status: 0,
    fotos: true,
  };

  console.log("Request body:", JSON.stringify(requestBody));

  const result = await rhidFetch<EmployeeCheckIn[]>("/afd.svc/afd_mobile", {
    method: "POST",
    body: requestBody,
  });

  if (!result.success) {
    return {
      success: false,
      error: result.sessionExpired
        ? "Sessão expirada"
        : "Erro ao buscar registros de ponto",
    };
  }

  const data = result.data;
  console.log(`Ponto checks response: ${data.length} employees`);

  const checks: PontoCheck[] = [];

  // Process each employee's check-ins
  for (const employee of data) {
    const person = employee.person;

    if (!person || !employee.listAfdMobilePerson) {
      continue;
    }

    for (const record of employee.listAfdMobilePerson) {
      // Skip invalid coordinates
      if (!record.latitude || !record.longitude) continue;

      checks.push({
        id: `${person.id}-${record.id}`,
        funcionarioId: person.id,
        funcionarioNome: person.name,
        funcionarioFoto: record.photoURL || undefined,
        tipo: mapCheckTypeNumber(record.Tipo),
        tipoNumero: record.Tipo,
        dataHora: record.dateTime,
        dataHoraStr: record.dateTimeStr,
        latitude: record.latitude,
        longitude: record.longitude,
        obraId: record.geofence?.id,
        obraNome: record.geofence?.name,
        geofence: record.geofence
          ? {
              id: record.geofence.id,
              name: record.geofence.name,
              latitude: record.geofence.latitude,
              longitude: record.geofence.longitude,
              radius: record.geofence.radius,
            }
          : undefined,
      });
    }
  }

  console.log(
    `Parsed ${checks.length} ponto checks from ${data.length} employees`
  );

  return { success: true, data: checks };
}

/**
 * Fetch worksites from RHID API
 * Worksites are extracted from ponto checks geofence data
 */
export async function fetchWorksites(): Promise<FetchResult<Worksite[]>> {
  // Worksites are extracted from ponto checks
  const checksResult = await fetchPontoChecks();
  if (!checksResult.success) {
    return checksResult;
  }

  // Group by worksite and count unique employees
  const worksiteMap = new Map<
    number,
    {
      worksite: Worksite;
      employees: Set<number>;
    }
  >();

  for (const check of checksResult.data) {
    if (check.geofence) {
      const geoId = check.geofence.id;
      if (!worksiteMap.has(geoId)) {
        worksiteMap.set(geoId, {
          worksite: {
            id: geoId,
            nome: check.geofence.name,
            latitude: check.geofence.latitude,
            longitude: check.geofence.longitude,
            raio: check.geofence.radius,
            funcionariosCount: 0,
          },
          employees: new Set(),
        });
      }
      worksiteMap.get(geoId)!.employees.add(check.funcionarioId);
    }
  }

  const worksites: Worksite[] = Array.from(worksiteMap.values()).map(
    ({ worksite, employees }) => ({
      ...worksite,
      funcionariosCount: employees.size,
    })
  );

  return { success: true, data: worksites };
}
