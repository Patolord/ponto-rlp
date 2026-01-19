/**
 * RHID API Types
 * All types related to the RHID third-party API
 */

// ============================================================================
// API Response Types (raw from RHID API)
// ============================================================================

/** Login API response */
export interface LoginResponse {
  accessToken: string;
  expiredPassword: boolean;
  isPerson: boolean;
  listCustomer: unknown;
  revendaInadimplente: boolean;
}

/** Geofence data from RHID API */
export interface Geofence {
  excluded: boolean;
  id: number;
  latitude: number;
  longitude: number;
  name: string;
  radius: number;
}

/** AFD Mobile record from RHID API (attendance record) */
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

/** Person data from RHID API */
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

/** Employee check-in data from RHID API */
export interface EmployeeCheckIn {
  listAfdMobilePerson: AfdMobileRecord[];
  person: Person;
}

// ============================================================================
// App Types (transformed for use in the application)
// ============================================================================

/** Simplified employee type for the dashboard */
export type Employee = {
  id: number;
  nome: string;
  foto?: string;
  cargo?: string;
  departamento?: string;
  ativo: boolean;
};

/** Departments we track for attendance */
export const TRACKED_DEPARTMENTS = ["Obra", "Escritorio", "Manutencao"] as const;
export type TrackedDepartment = (typeof TRACKED_DEPARTMENTS)[number];

/** Ponto check record for the dashboard */
export type PontoCheck = {
  id: string;
  funcionarioId: number;
  funcionarioNome: string;
  funcionarioFoto?: string;
  tipo: string;
  tipoNumero: number;
  dataHora: string;
  dataHoraStr: string;
  latitude?: number; // Optional - may not be available if GPS was disabled/unavailable
  longitude?: number; // Optional - may not be available if GPS was disabled/unavailable
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

/** Worksite data for the dashboard */
export type Worksite = {
  id: number;
  nome: string;
  latitude: number;
  longitude: number;
  raio: number;
  funcionariosCount: number;
};

// ============================================================================
// Result Types
// ============================================================================

/** Generic result type for API operations */
export type FetchResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

/** Login result type */
export type LoginResult =
  | { success: true; data: LoginResponse }
  | { success: false; error: string };

// ============================================================================
// Check Type Mapping
// ============================================================================

/** Map check type number to string label */
export function mapCheckTypeNumber(tipo: number): string {
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
