import { ContractType, RequestStatus, RequestType, Role, User, SystemRules, LeaveRequest, Absence, MedicalCertificate, SystemSettings, Shift, Permission } from "./types";

export const INITIAL_ADMIN_USER: User = {
  id: 'admin-001',
  name: 'Administrador Padrão',
  username: 'admin',
  role: Role.ADMIN,
  contractType: ContractType.STATUTORY,
  availableTREDays: 99,
  availableBirthday: true,
  shift: Shift.DIARISTA,
  email: 'admin@upa.com',
  contact: '(99) 99999-9999',
  permissions: [
    Permission.MANAGE_REQUESTS,
    Permission.MANAGE_USERS,
    Permission.MANAGE_RECORDS,
    Permission.MANAGE_SETTINGS
  ]
};

export const DEFAULT_RULES: SystemRules = {
  content: `## Regras Gerais de Folgas e Permutas - UPA José Rodrigues

1. **Permutas Regulares:** Devem ser solicitadas com no mínimo 48h de antecedência. É obrigatório informar o nome do funcionário que fará a cobertura.
2. **Folgas TRE:** Apenas mediante apresentação de comprovante da justiça eleitoral. Máximo de 2 dias consecutivos.
3. **Aniversário:** O funcionário tem direito a folga no dia do aniversário ou no plantão subsequente, caso caia em dia de folga.
4. **Prazos:** O gerente tem até 24h antes da data solicitada para aprovar ou negar.
5. **Emergências:** Casos de saúde devem ser tratados diretamente com a coordenação via telefone imediato.`,
  lastUpdated: new Date().toISOString()
};

export const DEFAULT_SETTINGS: SystemSettings = {
  requestWindowStart: 1,
  requestWindowEnd: 10,
  globalSwapBlockUntil: null,
  
  limits: {
    statutory: {
      maxScaleLeaves: 2,
      maxRegularSwaps: 3,
      maxExtraSwaps: 10
    },
    temporary: {
      maxScaleLeaves: 2,
      maxRegularSwaps: 3,
      maxExtraSwaps: 13
    }
  },

  // New Granular Settings
  blockExtraSwapOnCertificate: false,
  blockLeavesOnCertificate: false,
  penaltyCertificateDays: 30,
  blockSubstituteOnCertificate: false,
  penaltySubstituteCertificateDays: 30,

  blockRegularSwapOnAbsence: false,
  blockLeavesOnAbsence: false,
  penaltyAbsenceDays: 30,
  blockSubstituteOnAbsence: false,
  penaltySubstituteAbsenceDays: 30,

  blockRetroactiveSwaps: true,
  blockRetroactiveLeaves: true,

  vacationConfig: {
    openWindow: {
      year: new Date().getFullYear(),
      month: new Date().getMonth() + 1,
      startDay: 1,
      endDay: 10
    },
    quotas: {
      nurses: {
        diurnoA: 4,
        noturnoA: 4,
        diurnoB: 4,
        noturnoB: 4
      },
      techs: {
        diurnoA: 4,
        noturnoA: 4,
        diurnoB: 4,
        noturnoB: 4
      }
    }
  },

  // Branding defaults
  systemName: 'UPA José Rodrigues',
  logoUrl: null,
  supportContact: '5592992881709',
  developerName: 'J. Acacio'
};

// Seed Data
export const MOCK_USERS: User[] = [
  INITIAL_ADMIN_USER,
  {
    id: 'u-002',
    name: 'Maria Silva',
    username: '123456',
    coren: '123456',
    role: Role.NURSE,
    contractType: ContractType.STATUTORY,
    availableTREDays: 2,
    availableBirthday: true,
    shift: Shift.DIURNO_A,
    birthday: '1985-05-20',
    email: 'maria.silva@upa.com',
    contact: '(11) 98888-7777',
    permissions: []
  },
  {
    id: 'u-003',
    name: 'João Santos',
    username: '654321',
    matricula: '654321',
    role: Role.ADMIN_ASSISTANT,
    contractType: ContractType.TEMPORARY,
    availableTREDays: 0,
    availableBirthday: false,
    shift: Shift.DIARISTA,
    birthday: '1990-10-15',
    email: 'joao.santos@upa.com',
    permissions: []
  }
];

export const MOCK_REQUESTS: LeaveRequest[] = [
  {
    id: 'r-001',
    userId: 'u-002',
    userName: 'Maria Silva',
    userRole: Role.NURSE,
    type: RequestType.REGULAR_SWAP,
    dateStart: '2023-11-20',
    description: 'Troca de plantão por consulta médica',
    coveringEmployee: 'João Santos',
    status: RequestStatus.PENDING,
    createdAt: '2023-11-10T10:00:00Z'
  },
  {
    id: 'r-002',
    userId: 'u-003',
    userName: 'João Santos',
    userRole: Role.TECH,
    type: RequestType.TRE_LEAVE,
    dateStart: '2023-11-25',
    description: 'Folga referente às eleições passadas',
    status: RequestStatus.APPROVED,
    createdAt: '2023-11-05T14:30:00Z',
    adminNote: 'Aprovado, saldo descontado.'
  }
];

export const MOCK_ABSENCES: Absence[] = [];
export const MOCK_CERTIFICATES: MedicalCertificate[] = [];