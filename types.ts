export enum Role {
  ADMIN = 'Administrador', // Can access Admin Panel
  MANAGER = 'Gerente de Enfermagem', // Can access Admin Panel
  NURSE = 'Enfermeiro(a)',
  TECH = 'Técnico(a) de Enfermagem',
  ADMIN_ASSISTANT = 'Administrativo'
}

export enum ContractType {
  STATUTORY = 'Estatutário',
  TEMPORARY = 'Temporário'
}

export enum Shift {
  DIURNO_A = 'Plantão Diurno A',
  NOTURNO_A = 'Plantão Noturno A',
  DIURNO_B = 'Plantão Diurno B',
  NOTURNO_B = 'Plantão Noturno B',
  DIARISTA = 'Diarista'
}

export enum RequestType {
  REGULAR_SWAP = 'Permuta Regular',
  EXTRA_SWAP = 'Permuta Extra',
  TRE_LEAVE = 'Folga TRE',
  SCALE_LEAVE = 'Folga da Escala',
  BIRTHDAY = 'Folga Aniversário',
  VACATION = 'Férias',
  OTHER = 'Outro'
}

export enum RequestStatus {
  WAITING_SUBSTITUTE = 'Aguardando Substituto', // New Status
  PENDING = 'Pendente (Gerência)',
  APPROVED = 'Aprovado',
  REJECTED = 'Reprovado'
}

export enum Permission {
  MANAGE_REQUESTS = 'Gerenciar Solicitações',
  MANAGE_USERS = 'Gerenciar Funcionários',
  MANAGE_RECORDS = 'Gerenciar Faltas/Atestados/TRE',
  MANAGE_SETTINGS = 'Gerenciar Configurações'
}

export interface User {
  id: string;
  name: string;
  username: string; // Used for login (Coren or Matricula)
  password?: string;
  role: Role;
  contractType: ContractType;
  availableTREDays: number;
  availableBirthday: boolean;
  coren?: string;
  matricula?: string;
  shift?: Shift;
  birthday?: string;
  email?: string;
  contact?: string;
  permissions: string[]; // Array of Permission values
  signatureUrl?: string; // Base64 signature
}

export interface SignatureData {
  name: string;
  role: string;
  corenOrMatricula: string;
  date: string;
  signatureUrl: string;
}

export interface LeaveRequest {
  id: string;
  userId: string;
  userName: string;
  userRole: Role;
  type: RequestType;
  dateStart: string;
  dateEnd?: string; // Optional for single day
  description: string;
  status: RequestStatus;
  createdAt: string;
  adminNote?: string;
  coveringEmployee?: string; // Name of person covering the shift if swap
  
  // Signatures
  signatures?: {
    requester?: SignatureData;
    substitute?: SignatureData;
    manager?: SignatureData;
  };
}

export interface Absence {
  id: string;
  userId: string;
  userName: string;
  date: string;
}

export interface MedicalCertificate {
  id: string;
  userId: string;
  userName: string;
  dateStart: string;
  days: number;
  dateEnd: string;
}

export interface SystemRules {
  content: string;
  lastUpdated: string;
}

export interface VacationConfig {
  openWindow: {
    year: number;
    month: number; // 1-12
    startDay: number;
    endDay: number;
  };
  quotas: {
    nurses: {
      diurnoA: number;
      noturnoA: number;
      diurnoB: number;
      noturnoB: number;
    };
    techs: {
      diurnoA: number;
      noturnoA: number;
      diurnoB: number;
      noturnoB: number;
    };
  };
}

export interface ContractLimits {
  maxScaleLeaves: number;
  maxRegularSwaps: number;
  maxExtraSwaps: number;
}

export interface SystemSettings {
  requestWindowStart: number; // Day of month (e.g., 1)
  requestWindowEnd: number; // Day of month (e.g., 10)
  globalSwapBlockUntil: string | null; // ISO Date. If future, swaps blocked.
  
  // Specific Limits per Contract Type
  limits: {
    statutory: ContractLimits;
    temporary: ContractLimits;
  };

  // Penalties by Certificate (Requester)
  blockExtraSwapOnCertificate: boolean;
  blockLeavesOnCertificate: boolean;
  penaltyCertificateDays: number; // Duration of block
  
  // Penalties by Certificate (Substitute)
  blockSubstituteOnCertificate: boolean;
  penaltySubstituteCertificateDays: number;

  // Penalties by Absence (Requester)
  blockRegularSwapOnAbsence: boolean;
  blockLeavesOnAbsence: boolean;
  penaltyAbsenceDays: number; // Duration of block

  // Penalties by Absence (Substitute)
  blockSubstituteOnAbsence: boolean;
  penaltySubstituteAbsenceDays: number;

  blockRetroactiveSwaps: boolean;
  blockRetroactiveLeaves: boolean;

  vacationConfig: VacationConfig;

  // Branding & Support
  systemName: string;
  logoUrl: string | null; // Base64 or URL
  supportContact: string; // WhatsApp number
  developerName: string;
}

export interface AppState {
  currentUser: User | null;
  users: User[];
  requests: LeaveRequest[];
  absences: Absence[];
  medicalCertificates: MedicalCertificate[];
  rules: SystemRules;
  settings: SystemSettings;
}