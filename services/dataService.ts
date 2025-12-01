import { supabase } from './supabaseClient';
import { AppState, User, LeaveRequest, Absence, MedicalCertificate, SystemSettings, SystemRules } from '../types';
import { DEFAULT_SETTINGS, DEFAULT_RULES, MOCK_USERS, MOCK_REQUESTS, MOCK_ABSENCES, MOCK_CERTIFICATES } from '../constants';

// --- Fetch All Data (Sync) ---
export const fetchAppState = async (): Promise<Partial<AppState>> => {
  // 1. Fallback to Mocks if Supabase is not configured
  if (!supabase) {
    console.warn("Supabase credentials missing. Using Mock Data.");
    return {
      users: MOCK_USERS,
      requests: MOCK_REQUESTS,
      absences: MOCK_ABSENCES,
      medicalCertificates: MOCK_CERTIFICATES,
      settings: DEFAULT_SETTINGS,
      rules: DEFAULT_RULES
    };
  }

  // 2. Try fetching from Supabase
  try {
    const { data: users, error: uErr } = await supabase.from('app_users').select('*');
    if (uErr) throw uErr;

    const { data: requests, error: rErr } = await supabase.from('requests').select('*');
    if (rErr) throw rErr;

    const { data: absences, error: aErr } = await supabase.from('absences').select('*');
    if (aErr) throw aErr;

    const { data: certificates, error: cErr } = await supabase.from('medical_certificates').select('*');
    if (cErr) throw cErr;

    const { data: settingsRow, error: sErr } = await supabase.from('system_settings').select('*').single();
    // It's okay if settings row is missing initially, we use defaults
    
    // Parse Settings
    let settings = DEFAULT_SETTINGS;
    let rules = DEFAULT_RULES;

    if (settingsRow) {
      if (settingsRow.config && Object.keys(settingsRow.config).length > 0) {
        settings = { ...DEFAULT_SETTINGS, ...settingsRow.config };
      }
      if (settingsRow.rules_content) {
        rules = { content: settingsRow.rules_content, lastUpdated: settingsRow.lastUpdated };
      }
    }

    return {
      users: users || [],
      requests: requests || [],
      absences: absences || [],
      medicalCertificates: certificates || [],
      settings,
      rules
    };
  } catch (error) {
    console.error("Error fetching data from Supabase:", error);
    // Fallback to mocks on connection error to keep app alive
    return {
        users: MOCK_USERS,
        requests: MOCK_REQUESTS,
        absences: MOCK_ABSENCES,
        medicalCertificates: MOCK_CERTIFICATES,
        settings: DEFAULT_SETTINGS,
        rules: DEFAULT_RULES
    };
  }
};

// --- Users ---
export const dbAddUser = async (user: User) => {
  if (!supabase) return;
  const { error } = await supabase.from('app_users').insert(user);
  if (error) console.error("Error adding user:", error);
};

export const dbUpdateUser = async (user: User) => {
  if (!supabase) return;
  const { error } = await supabase.from('app_users').update(user).eq('id', user.id);
  if (error) console.error("Error updating user:", error);
};

export const dbDeleteUser = async (id: string) => {
  if (!supabase) return;
  const { error } = await supabase.from('app_users').delete().eq('id', id);
  if (error) console.error("Error deleting user:", error);
};

// --- Requests ---
export const dbAddRequest = async (request: LeaveRequest) => {
  if (!supabase) return;
  const { error } = await supabase.from('requests').insert(request);
  if (error) console.error("Error adding request:", error);
};

export const dbUpdateRequest = async (request: LeaveRequest) => {
  if (!supabase) return;
  const { error } = await supabase.from('requests').update(request).eq('id', request.id);
  if (error) console.error("Error updating request:", error);
};

export const dbDeleteRequest = async (id: string) => {
  if (!supabase) return;
  const { error } = await supabase.from('requests').delete().eq('id', id);
  if (error) console.error("Error deleting request:", error);
};

// --- Absences ---
export const dbAddAbsence = async (absence: Absence) => {
  if (!supabase) return;
  const { error } = await supabase.from('absences').insert(absence);
  if (error) console.error("Error adding absence:", error);
};

export const dbDeleteAbsence = async (id: string) => {
  if (!supabase) return;
  const { error } = await supabase.from('absences').delete().eq('id', id);
  if (error) console.error("Error deleting absence:", error);
};

// --- Certificates ---
export const dbAddCertificate = async (cert: MedicalCertificate) => {
  if (!supabase) return;
  const { error } = await supabase.from('medical_certificates').insert(cert);
  if (error) console.error("Error adding cert:", error);
};

export const dbDeleteCertificate = async (id: string) => {
  if (!supabase) return;
  const { error } = await supabase.from('medical_certificates').delete().eq('id', id);
  if (error) console.error("Error deleting cert:", error);
};

// --- Settings & Rules ---
export const dbUpdateSettings = async (settings: SystemSettings) => {
  if (!supabase) return;
  // We store the whole JSON object
  const { error } = await supabase.from('system_settings').update({ config: settings }).eq('id', 1);
  if (error) {
     // If row doesn't exist, insert it
     await supabase.from('system_settings').insert({ id: 1, config: settings });
  }
};

export const dbUpdateRules = async (content: string) => {
  if (!supabase) return;
  const { error } = await supabase.from('system_settings').update({ 
      rules_content: content, 
      lastUpdated: new Date().toISOString() 
  }).eq('id', 1);
  if (error) console.error("Error updating rules", error);
};