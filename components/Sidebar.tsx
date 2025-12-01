import React from 'react';
import { Home, List, FileText, Settings, LogOut, User, ShieldAlert, UserCog, PenTool } from 'lucide-react';
import { User as UserType, Role, SystemSettings, Permission } from '../types';

interface SidebarProps {
  currentUser: UserType;
  currentView: string;
  onChangeView: (view: string) => void;
  onLogout: () => void;
  settings: SystemSettings;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentUser, currentView, onChangeView, onLogout, settings }) => {
  // We now use specific permissions rather than just role checks
  const hasAdminAccess = currentUser.permissions && currentUser.permissions.length > 0;
  
  const canViewRequests = currentUser.permissions.includes(Permission.MANAGE_REQUESTS);
  const canManageUsers = currentUser.permissions.includes(Permission.MANAGE_USERS);
  const canManageSettings = currentUser.permissions.includes(Permission.MANAGE_SETTINGS);
  
  // Note: Manage Records (Absence/TRE) is accessed via Admin Panel tabs, but we check if they have at least one admin permission to show the header

  const NavItem = ({ view, icon: Icon, label }: { view: string; icon: any; label: string }) => (
    <button
      onClick={() => onChangeView(view)}
      className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors duration-200 ${
        currentView === view
          ? 'bg-teal-700 text-white shadow-md'
          : 'text-teal-100 hover:bg-teal-800 hover:text-white'
      }`}
    >
      <Icon size={20} />
      <span className="font-medium">{label}</span>
    </button>
  );

  return (
    <div className="w-64 bg-teal-900 h-screen flex flex-col shadow-2xl fixed left-0 top-0 z-50 print:hidden">
      <div className="p-6 border-b border-teal-800 flex flex-col items-center">
        <div className="bg-white p-2 rounded-full mb-3 overflow-hidden h-16 w-16 flex items-center justify-center">
            {settings.logoUrl ? (
                <img src={settings.logoUrl} alt="Logo" className="w-full h-full object-contain" />
            ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#0d9488" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 2a2 2 0 0 0-2 2v5H4a2 2 0 0 0-2 2v2c0 1.1.9 2 2 2h5v5c0 1.1.9 2 2 2h2a2 2 0 0 0 2-2v-5h5a2 2 0 0 0 2-2v-2a2 2 0 0 0-2-2h-5V4a2 2 0 0 0-2-2h-2z"/></svg>
            )}
        </div>
        <h1 className="text-white text-lg font-bold text-center leading-tight">{settings.systemName}</h1>
        <p className="text-teal-300 text-xs mt-1 font-medium tracking-wider">GESTÃO DE ENFERMAGEM</p>
      </div>

      <div className="flex-1 px-3 py-6 space-y-2 overflow-y-auto">
        <NavItem view="dashboard" icon={Home} label="Início / Painel" />
        <NavItem view="my_requests" icon={List} label="Minhas Solicitações" />
        <NavItem view="signature" icon={PenTool} label="Assinatura Digital" />
        <NavItem view="rules" icon={FileText} label="Regras & Normas" />
        <NavItem view="profile" icon={UserCog} label="Meu Perfil" />
        
        {hasAdminAccess && (
          <>
            <div className="my-4 border-t border-teal-800"></div>
            <div className="px-4 text-xs font-bold text-teal-400 uppercase mb-2">Administração</div>
            
            {canViewRequests && (
                <NavItem view="admin_requests" icon={ShieldAlert} label="Todas Solicitações" />
            )}
            
            {canManageUsers && (
                <NavItem view="admin_employees" icon={User} label="Cadastrar Funcionários" />
            )}
            
            {canManageSettings && (
                <NavItem view="admin_settings" icon={Settings} label="Configurações & Regras" />
            )}
          </>
        )}
      </div>

      <div className="p-4 border-t border-teal-800">
        <div className="flex items-center space-x-3 mb-4 px-2">
          <div className="w-10 h-10 rounded-full bg-teal-700 flex items-center justify-center text-white font-bold">
            {currentUser.name.charAt(0)}
          </div>
          <div className="overflow-hidden">
            <p className="text-white text-sm font-medium truncate">{currentUser.name}</p>
            <p className="text-teal-400 text-xs truncate">{currentUser.role}</p>
          </div>
        </div>
        <button
          onClick={onLogout}
          className="w-full flex items-center justify-center space-x-2 bg-red-600 hover:bg-red-700 text-white py-2 rounded-lg transition-colors text-sm font-medium"
        >
          <LogOut size={16} />
          <span>Sair do Sistema</span>
        </button>
      </div>
    </div>
  );
};