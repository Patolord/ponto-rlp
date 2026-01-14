"use server";

import { getAccessToken } from "./auth";

const RHID_API_BASE = "https://rhid.com.br/v2/customerdb";

// Types based on actual API response structure
export interface Geofence {
  excluded: boolean;
  id: number;
  latitude: number;
  longitude: number;
  name: string;
  radius: number;
}

export interface AfdMobileRecord {
  excluded: boolean;
  id: number;
  Tipo: number;
  approvalStatus: number;
  classificacaoFacial: number;
  classificacaoGeofence: number;
  companyId: number;
  cpf: number;
  dateInserted: string;
  dateTime: string;
  dateTimeStr: string;
  faceMatch: number;
  faceScore: number;
  geofence: Geofence;
  idGeofence: number;
  idPerson: number;
  latitude: number;
  longitude: number;
  mobile: boolean;
  nsr: number;
  offline: boolean;
  photoURL: string;
  suspect: number;
  suspectStr: string;
  timeZone: number;
}

export interface Person {
  id: number;
  name: string;
  cpf: string;
  email: string;
  pis: number;
  companyId: number;
  status: number;
  admissionDate: string;
  hasPicture: boolean;
  idDepartment: number;
  idCompany: number;
}

export interface EmployeeCheckIn {
  listAfdMobilePerson: AfdMobileRecord[];
  person: Person;
}

// Simplified types for the dashboard
export type Employee = {
  id: number;
  nome: string;
  foto?: string;
  cargo?: string;
  ativo: boolean;
};

export type PontoCheck = {
  id: string;
  funcionarioId: number;
  funcionarioNome: string;
  funcionarioFoto?: string;
  tipo: string;
  tipoNumero: number;
  dataHora: string;
  dataHoraStr: string;
  latitude: number;
  longitude: number;
  obraId?: number;
  obraNome?: string;
  geofence?: {
    id: number;
    name: string;
    latitude: number;
    longitude: number;
    radius: number;
  };
};

export type Worksite = {
  id: number;
  nome: string;
  latitude: number;
  longitude: number;
  raio: number;
  funcionariosCount: number;
};

export type FetchResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

async function getAuthHeaders(): Promise<HeadersInit | null> {
  const accessToken = await getAccessToken();
  if (!accessToken) return null;
  
  console.log("Using accessToken (first 50 chars):", accessToken.slice(0, 50));
  
  return {
    "Content-Type": "application/json",
    "Accept": "application/json",
    "authorization": `Bearer ${accessToken}`,
  };
}

export async function fetchEmployees(): Promise<FetchResult<Employee[]>> {
  const headers = await getAuthHeaders();
  if (!headers) {
    return { success: false, error: "Não autenticado" };
  }

  try {
    const response = await fetch(`${RHID_API_BASE}/person.svc/a_ativo`, {
      method: "GET",
      headers,
      cache: "no-store",
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Fetch employees failed:", response.status, errorText.slice(0, 200));
      if (response.status === 401) {
        return { success: false, error: "Sessão expirada" };
      }
      return { success: false, error: "Erro ao buscar funcionários" };
    }

    const data = await response.json();
    console.log("Employees response: got", Array.isArray(data) ? data.length : 0, "employees");

    // Map API response to our Employee type
    const employees: Employee[] = Array.isArray(data)
      ? data.map((emp: Record<string, unknown>) => ({
          id: Number(emp.id || emp.Id),
          nome: String(emp.name || emp.Name || emp.nome || ""),
          foto: undefined,
          cargo: undefined,
          ativo: true,
        }))
      : [];

    return { success: true, data: employees };
  } catch (error) {
    console.error("Fetch employees error:", error);
    return { success: false, error: "Erro de conexão" };
  }
}

// Format date as YYYYMMDD for the RHID API
function formatDateForRhid(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}${month}${day}`;
}

export async function fetchPontoChecks(
  startDate?: string,
  endDate?: string
): Promise<FetchResult<PontoCheck[]>> {
  const headers = await getAuthHeaders();
  if (!headers) {
    return { success: false, error: "Não autenticado" };
  }

  try {
    // Use today's date if not provided
    const today = new Date();
    const ini = startDate || formatDateForRhid(today);
    const fim = endDate || formatDateForRhid(today);

    console.log(`Fetching ponto checks from ${ini} to ${fim}`);

    // API body format matches the actual RHID API
    const requestBody = {
      listPeople: [],
      listCompanies: [1],
      listDepartments: [],
      ini,
      fim,
      status: 0,
      fotos: true,
    };

    console.log("Request body:", JSON.stringify(requestBody));

    const response = await fetch(`${RHID_API_BASE}/afd.svc/afd_mobile`, {
      method: "POST",
      headers,
      body: JSON.stringify(requestBody),
      cache: "no-store",
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Fetch ponto checks failed:", response.status, errorText.slice(0, 200));
      if (response.status === 401) {
        return { success: false, error: "Sessão expirada" };
      }
      return { success: false, error: "Erro ao buscar registros de ponto" };
    }

    const data: EmployeeCheckIn[] = await response.json();
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
          geofence: record.geofence ? {
            id: record.geofence.id,
            name: record.geofence.name,
            latitude: record.geofence.latitude,
            longitude: record.geofence.longitude,
            radius: record.geofence.radius,
          } : undefined,
        });
      }
    }

    console.log(`Parsed ${checks.length} ponto checks from ${data.length} employees`);

    return { success: true, data: checks };
  } catch (error) {
    console.error("Fetch ponto checks error:", error);
    return { success: false, error: "Erro de conexão" };
  }
}

function mapCheckTypeNumber(tipo: number): string {
  // Based on the filter: 0=Entrada, 1=Almoço, 2=Retorno, 3=Saída
  switch (tipo) {
    case 0:
      return "entrada";
    case 1:
      return "almoco_saida";
    case 2:
      return "almoco_retorno";
    case 3:
      return "saida";
    default:
      return "outro";
  }
}

export async function fetchWorksites(): Promise<FetchResult<Worksite[]>> {
  // Worksites are extracted from ponto checks
  const checksResult = await fetchPontoChecks();
  if (!checksResult.success) {
    return checksResult;
  }

  // Group by worksite and count unique employees
  const worksiteMap = new Map<number, { 
    worksite: Worksite; 
    employees: Set<number> 
  }>();

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

  const worksites: Worksite[] = Array.from(worksiteMap.values()).map(({ worksite, employees }) => ({
    ...worksite,
    funcionariosCount: employees.size,
  }));

  return { success: true, data: worksites };
}

// Fetch active employees for absent count
export async function fetchActiveEmployees(): Promise<FetchResult<Employee[]>> {
  return fetchEmployees();
}
