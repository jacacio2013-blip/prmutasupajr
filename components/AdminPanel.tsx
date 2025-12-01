import React, { useState, useEffect, useMemo, useRef } from 'react';
import { AppState, RequestStatus, Role, ContractType, LeaveRequest, Absence, MedicalCertificate, User, SystemSettings, Shift, Permission, RequestType } from '../types';
import { analyzeRequestConflict, refineRulesText } from '../services/geminiService';
import { Check, X, Shield, BrainCircuit, Save, Trash2, UserX, FilePlus, Vote, CalendarDays, Edit, Lock, CalendarClock, AlertTriangle, History, Search, Plane, Mail, Phone, Palette, Image as ImageIcon, Gauge, Key, FileText, PenTool, BarChart3, Printer, Download, FileSpreadsheet, Eye, Filter, Info, ArrowLeft } from 'lucide-react';
import { RequestDocument } from './RequestDocument';
import { ConfirmModal } from './ConfirmModal';

interface AdminPanelProps {
  appState: AppState;
  onUpdateStatus: (id: string, status: RequestStatus, note?: string) => void;
  onAddUser: (user: any) => void;
  onUpdateUser: (user: any) => void;
  onDeleteUser: (id: string) => void;
  onUpdateRules: (newContent: string) => void;
  onSaveAbsence: (absence: Absence) => void;
  onDeleteAbsence: (id: string) => void;
  onSaveCertificate: (cert: MedicalCertificate) => void;
  onDeleteCertificate: (id: string) => void;
  onUpdateUserTRE: (userId: string, newAmount: number) => void;
  onUpdateSettings: (settings: SystemSettings) => void;
  onDeleteRequest: (id: string) => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ 
  appState, onUpdateStatus, onAddUser, onUpdateUser, onDeleteUser, onUpdateRules,
  onSaveAbsence, onDeleteAbsence, onSaveCertificate, onDeleteCertificate, onUpdateUserTRE, onUpdateSettings, onDeleteRequest
}) => {
  const [activeTab, setActiveTab] = useState<'requests' | 'employees' | 'settings' | 'absences' | 'certificates' | 'tre' | 'reports'>('requests');
  const userPerms = appState.currentUser?.permissions || [];

  // Determine which tabs are visible based on permissions
  const canManageRequests = userPerms.includes(Permission.MANAGE_REQUESTS);
  const canManageUsers = userPerms.includes(Permission.MANAGE_USERS);
  const canManageRecords = userPerms.includes(Permission.MANAGE_RECORDS);
  const canManageSettings = userPerms.includes(Permission.MANAGE_SETTINGS);
  // Assume reports are available to anyone with Request or Record permissions
  const canViewReports = canManageRequests || canManageRecords;

  // Auto-select first available tab if current is forbidden
  useEffect(() => {
    if (activeTab === 'requests' && !canManageRequests) {
        if (canManageUsers) setActiveTab('employees');
        else if (canManageRecords) setActiveTab('absences');
        else if (canViewReports) setActiveTab('reports');
        else if (canManageSettings) setActiveTab('settings');
    }
  }, [activeTab, canManageRequests, canManageUsers, canManageRecords, canManageSettings, canViewReports]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center print:hidden">
        <h2 className="text-2xl font-bold text-slate-800">Administração</h2>
      </div>
      
      <div className="flex flex-wrap gap-2 bg-white p-2 rounded-lg shadow-sm border border-slate-200 print:hidden">
          {canManageRequests && <TabButton id="requests" label="Solicitações" active={activeTab} onClick={setActiveTab} />}
          {canManageUsers && <TabButton id="employees" label="Funcionários" active={activeTab} onClick={setActiveTab} />}
          {canManageRecords && (
            <>
                <TabButton id="absences" label="Faltas" active={activeTab} onClick={setActiveTab} />
                <TabButton id="certificates" label="Atestados" active={activeTab} onClick={setActiveTab} />
                <TabButton id="tre" label="Folga TRE" active={activeTab} onClick={setActiveTab} />
            </>
          )}
          {canViewReports && <TabButton id="reports" label="Relatórios Gerenciais" active={activeTab} onClick={setActiveTab} />}
          {canManageSettings && <TabButton id="settings" label="Configurações & Regras" active={activeTab} onClick={setActiveTab} />}
      </div>

      {activeTab === 'requests' && canManageRequests && (
        <RequestsManager 
            requests={appState.requests} 
            onUpdateStatus={onUpdateStatus} 
            history={appState.requests}
            rules={appState.rules}
            onDelete={onDeleteRequest}
            settings={appState.settings}
            currentUser={appState.currentUser}
        />
      )}
      {activeTab === 'employees' && canManageUsers && (
        <EmployeesManager 
            users={appState.users} 
            onAddUser={onAddUser} 
            onUpdateUser={onUpdateUser}
            onDeleteUser={onDeleteUser} 
        />
      )}
      {activeTab === 'absences' && canManageRecords && (
          <AbsenceManager 
            users={appState.users} 
            absences={appState.absences} 
            onSave={onSaveAbsence} 
            onDelete={onDeleteAbsence} 
          />
      )}
      {activeTab === 'certificates' && canManageRecords && (
          <CertificateManager 
            users={appState.users} 
            certificates={appState.medicalCertificates} 
            onSave={onSaveCertificate} 
            onDelete={onDeleteCertificate} 
          />
      )}
      {activeTab === 'tre' && canManageRecords && (
          <TREManager users={appState.users} onUpdate={onUpdateUserTRE} />
      )}
      {activeTab === 'reports' && canViewReports && (
          <ReportsManager appState={appState} />
      )}
      {activeTab === 'settings' && canManageSettings && (
        <SettingsManager 
            rules={appState.rules} 
            onUpdateRules={onUpdateRules} 
            settings={appState.settings}
            onUpdateSettings={onUpdateSettings}
        />
      )}
    </div>
  );
};

const TabButton = ({ id, label, active, onClick }: any) => (
  <button
    onClick={() => onClick(id)}
    className={`px-3 py-2 text-sm font-medium rounded-md transition-all ${
      active === id ? 'bg-teal-600 text-white shadow' : 'text-slate-600 hover:bg-slate-100'
    }`}
  >
    {label}
  </button>
);

// --- Sub-components ---

const ReportsManager = ({ appState }: { appState: AppState }) => {
    const [subTab, setSubTab] = useState<'general' | 'documents'>('general');
    const [dateStart, setDateStart] = useState('');
    const [dateEnd, setDateEnd] = useState('');
    const [filterType, setFilterType] = useState('ALL');
    const [searchEmployee, setSearchEmployee] = useState('');
    const [viewDocument, setViewDocument] = useState<LeaveRequest | null>(null);
    const [isBulkPrintMode, setIsBulkPrintMode] = useState(false);

    // Consolidated Record Type for Reporting
    type ReportRecord = {
        id: string;
        date: string;
        userName: string;
        category: 'Solicitação' | 'Falta' | 'Atestado';
        type: string;
        description: string;
        status: string;
        originalRef?: LeaveRequest; // For opening documents
    };

    const aggregatedData: ReportRecord[] = useMemo(() => {
        const records: ReportRecord[] = [];

        // 1. Requests
        appState.requests.forEach(r => {
            records.push({
                id: r.id,
                date: r.dateStart,
                userName: r.userName,
                category: 'Solicitação',
                type: r.type,
                description: r.description,
                status: r.status,
                originalRef: r
            });
        });

        // 2. Absences
        appState.absences.forEach(a => {
            records.push({
                id: a.id,
                date: a.date,
                userName: a.userName,
                category: 'Falta',
                type: 'Falta Injustificada',
                description: 'Registro de Falta',
                status: 'Registrado'
            });
        });

        // 3. Certificates
        appState.medicalCertificates.forEach(c => {
            records.push({
                id: c.id,
                date: c.dateStart,
                userName: c.userName,
                category: 'Atestado',
                type: 'Atestado Médico',
                description: `${c.days} dias de afastamento`,
                status: 'Registrado'
            });
        });

        return records.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [appState]);

    const filteredData = useMemo(() => {
        return aggregatedData.filter(item => {
            // Date Filter
            if (dateStart && new Date(item.date) < new Date(dateStart)) return false;
            if (dateEnd && new Date(item.date) > new Date(dateEnd)) return false;

            // Name Filter
            if (searchEmployee && !item.userName.toLowerCase().includes(searchEmployee.toLowerCase())) return false;

            // Type Filter
            if (filterType !== 'ALL') {
                if (filterType === 'ABSENCE' && item.category !== 'Falta') return false;
                if (filterType === 'CERTIFICATE' && item.category !== 'Atestado') return false;
                if (filterType === 'SWAP' && !item.type.includes('Permuta')) return false;
                if (filterType === 'LEAVE' && !item.type.includes('Folga')) return false;
            }

            // For Documents Tab, only show things that have documents (Requests)
            if (subTab === 'documents' && item.category !== 'Solicitação') return false;

            return true;
        });
    }, [aggregatedData, dateStart, dateEnd, searchEmployee, filterType, subTab]);

    const handleGeneratePDF = (elementId: string, filename: string, landscape = false) => {
        const element = document.getElementById(elementId);
        if (!element) return;
        
        const opt = {
          margin: 10,
          filename: filename,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2 },
          jsPDF: { unit: 'mm', format: 'a4', orientation: landscape ? 'landscape' : 'portrait' }
        };
        
        // @ts-ignore
        if (window.html2pdf) {
            // @ts-ignore
            window.html2pdf().set(opt).from(element).save();
        } else {
            alert("Biblioteca PDF não carregada. Tente Ctrl+P.");
            window.print();
        }
    };

    const handleExportCSV = () => {
        // Headers
        let csvContent = "Data;Funcionario;Categoria;Tipo;Detalhes;Status\n";
        
        filteredData.forEach(row => {
            const date = new Date(row.date).toLocaleDateString('pt-BR');
            const sanitizedDesc = row.description.replace(/;/g, ',').replace(/\n/g, ' ');
            csvContent += `${date};${row.userName};${row.category};${row.type};${sanitizedDesc};${row.status}\n`;
        });

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `relatorio_upa_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // Bulk Print Mode View
    if (isBulkPrintMode) {
        // Filter only those with originalRef (Requests)
        const printableDocs = filteredData.filter(d => d.originalRef).map(d => d.originalRef!);
        
        return (
            <div className="fixed inset-0 bg-white z-[100] overflow-y-auto">
                <div className="fixed top-0 left-0 right-0 bg-slate-800 text-white p-4 flex justify-between items-center shadow-lg print:hidden">
                     <div className="flex items-center gap-4">
                         <button onClick={() => setIsBulkPrintMode(false)} className="hover:bg-slate-700 p-2 rounded-full">
                             <ArrowLeft size={24}/>
                         </button>
                         <div>
                             <h2 className="font-bold text-lg">Impressão em Lote</h2>
                             <p className="text-xs text-slate-300">{printableDocs.length} documentos selecionados</p>
                         </div>
                     </div>
                     <button 
                        onClick={() => handleGeneratePDF('bulk-print-container', 'comprovantes_lote.pdf')} 
                        className="bg-teal-600 hover:bg-teal-700 text-white px-6 py-2 rounded font-bold flex items-center shadow"
                     >
                         <Download size={20} className="mr-2"/> Baixar PDF (Lote)
                     </button>
                </div>
                
                <div id="bulk-print-container" className="pt-24 pb-12 print:pt-0 print:pb-0">
                    {printableDocs.length === 0 ? (
                        <div className="text-center text-slate-500 mt-20">Nenhum comprovante encontrado para os filtros atuais.</div>
                    ) : (
                        printableDocs.map((req, index) => (
                            <div key={req.id} style={{ pageBreakAfter: 'always' }} className="print:break-after-page mb-8 print:mb-0">
                                <RequestDocument 
                                    request={req} 
                                    settings={appState.settings} 
                                    className="shadow-none border-none max-w-4xl mx-auto"
                                />
                                {/* Visual separator for screen view only */}
                                <div className="border-b-4 border-slate-100 border-dashed my-8 print:hidden"></div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Report Header & Controls */}
            <div className="bg-white p-6 rounded-xl shadow-lg border border-slate-100 print:shadow-none print:border-none">
                <div className="flex justify-between items-center mb-6 print:hidden">
                    <h3 className="text-lg font-bold text-slate-800 flex items-center">
                        <BarChart3 size={20} className="mr-2 text-teal-600"/> Relatórios Gerenciais
                    </h3>
                    <div className="flex gap-2">
                         <button 
                            onClick={() => setSubTab('general')}
                            className={`px-4 py-2 text-sm font-bold rounded-lg ${subTab === 'general' ? 'bg-teal-100 text-teal-700' : 'bg-slate-100 text-slate-600'}`}
                         >
                            Geral / Estatísticas
                         </button>
                         <button 
                            onClick={() => setSubTab('documents')}
                            className={`px-4 py-2 text-sm font-bold rounded-lg ${subTab === 'documents' ? 'bg-teal-100 text-teal-700' : 'bg-slate-100 text-slate-600'}`}
                         >
                            Comprovantes
                         </button>
                    </div>
                </div>

                {/* Filters */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 print:hidden bg-slate-50 p-4 rounded-lg border border-slate-200">
                     <div>
                         <label className="text-xs font-bold text-slate-500">Data Início</label>
                         <input type="date" className="w-full border border-slate-300 bg-white p-2 rounded text-sm" 
                            value={dateStart} onChange={e => setDateStart(e.target.value)}
                         />
                     </div>
                     <div>
                         <label className="text-xs font-bold text-slate-500">Data Fim</label>
                         <input type="date" className="w-full border border-slate-300 bg-white p-2 rounded text-sm" 
                            value={dateEnd} onChange={e => setDateEnd(e.target.value)}
                         />
                     </div>
                     <div>
                         <label className="text-xs font-bold text-slate-500">Tipo de Registro</label>
                         <select className="w-full border border-slate-300 bg-white p-2 rounded text-sm"
                            value={filterType} onChange={e => setFilterType(e.target.value)}
                         >
                             <option value="ALL">Todos</option>
                             <option value="SWAP">Permutas (Reg/Extra)</option>
                             <option value="LEAVE">Folgas (TRE/Aniv/Escala)</option>
                             <option value="ABSENCE">Faltas</option>
                             <option value="CERTIFICATE">Atestados</option>
                         </select>
                     </div>
                     <div>
                         <label className="text-xs font-bold text-slate-500">Funcionário</label>
                         <div className="relative">
                            <input type="text" placeholder="Buscar nome..." className="w-full pl-8 border border-slate-300 bg-white p-2 rounded text-sm"
                                value={searchEmployee} onChange={e => setSearchEmployee(e.target.value)}
                            />
                            <Search size={16} className="absolute left-2.5 top-2.5 text-slate-400"/>
                         </div>
                     </div>
                </div>

                {/* Print/Export Actions */}
                <div className="flex justify-end gap-3 mb-4 print:hidden items-center">
                    {subTab === 'documents' && (
                        <button 
                            onClick={() => setIsBulkPrintMode(true)} 
                            className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded font-bold hover:bg-indigo-700 shadow text-sm"
                        >
                            <FileText size={16}/> Gerar PDF em Lote
                        </button>
                    )}
                    <button onClick={handleExportCSV} className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded font-bold hover:bg-green-700 shadow text-sm">
                        <FileSpreadsheet size={16}/> Exportar Planilha
                    </button>
                    <div className="relative group">
                        <button 
                            onClick={() => handleGeneratePDF('report-table-area', 'relatorio_geral.pdf', true)} 
                            className="flex items-center gap-2 bg-slate-800 text-white px-4 py-2 rounded font-bold hover:bg-slate-900 shadow text-sm"
                        >
                            <Download size={16}/> Baixar Relatório (PDF)
                        </button>
                    </div>
                </div>

                {/* Data Table */}
                <div id="report-table-area" className="overflow-x-auto print:overflow-visible bg-white p-4">
                    {/* Print Header */}
                    <div className="hidden print:block mb-4 text-center">
                        <h1 className="text-xl font-bold uppercase">{appState.settings.systemName}</h1>
                        <p className="text-sm">Relatório Gerencial de Ocorrências e Solicitações</p>
                        <p className="text-xs mt-1">Gerado em: {new Date().toLocaleString('pt-BR')}</p>
                    </div>

                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-700 border-b-2 border-slate-200">
                            <tr>
                                <th className="px-4 py-3">Data</th>
                                <th className="px-4 py-3">Funcionário</th>
                                <th className="px-4 py-3">Categoria</th>
                                <th className="px-4 py-3">Detalhes</th>
                                <th className="px-4 py-3">Status</th>
                                <th className="px-4 py-3 print:hidden">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredData.map((row) => (
                                <tr key={row.id} className="hover:bg-slate-50">
                                    <td className="px-4 py-2 whitespace-nowrap">{new Date(row.date).toLocaleDateString('pt-BR')}</td>
                                    <td className="px-4 py-2 font-bold text-slate-700">{row.userName}</td>
                                    <td className="px-4 py-2">
                                        <span className={`px-2 py-0.5 rounded text-xs font-bold
                                            ${row.category === 'Falta' ? 'bg-red-100 text-red-700' : 
                                              row.category === 'Atestado' ? 'bg-blue-100 text-blue-700' :
                                              'bg-teal-100 text-teal-700'}`}>
                                            {row.category}
                                        </span>
                                    </td>
                                    <td className="px-4 py-2 max-w-xs">
                                        <div className="font-medium">{row.type}</div>
                                        <div className="text-xs text-slate-500 truncate">{row.description}</div>
                                    </td>
                                    <td className="px-4 py-2 text-xs font-bold uppercase text-slate-600">{row.status}</td>
                                    <td className="px-4 py-2 print:hidden">
                                        {row.originalRef && (
                                            <button 
                                                onClick={() => setViewDocument(row.originalRef!)}
                                                className="text-blue-600 hover:text-blue-800 bg-blue-50 p-1.5 rounded flex items-center gap-1 text-xs font-bold"
                                            >
                                                <Eye size={14}/> {subTab === 'documents' ? 'Comprovante' : 'Ver'}
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                            {filteredData.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="text-center py-8 text-slate-400">Nenhum registro encontrado para os filtros selecionados.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Document Modal */}
             {viewDocument && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in print:block print:bg-white print:p-0">
                    <div className="bg-white w-full max-w-4xl rounded-xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col print:shadow-none print:max-w-none print:max-h-none print:h-auto print:rounded-none">
                        <div className="bg-slate-800 p-4 flex justify-between items-center text-white print:hidden">
                             <h3 className="font-bold flex items-center"><FileText className="mr-2"/> Comprovante</h3>
                             <button onClick={() => setViewDocument(null)}><X size={24}/></button>
                        </div>
                        <div className="p-6 overflow-y-auto bg-slate-100 flex-1 print:p-0 print:bg-white print:overflow-visible">
                             <div id="admin-document-preview-modal">
                                <RequestDocument request={viewDocument} settings={appState.settings} />
                             </div>
                        </div>
                        <div className="p-4 bg-white border-t flex justify-end print:hidden">
                            <button 
                                onClick={() => handleGeneratePDF('admin-document-preview-modal', `comprovante_${viewDocument.id}.pdf`)} 
                                className="bg-slate-800 text-white px-4 py-2 rounded font-bold flex items-center"
                            >
                                <Download size={16} className="mr-2"/> Baixar PDF
                            </button>
                        </div>
                    </div>
                </div>
             )}
        </div>
    );
};

const RequestsManager = ({ requests, onUpdateStatus, history, rules, onDelete, settings, currentUser }: any) => {
  const [filter, setFilter] = useState('ALL');
  const [aiAnalysis, setAiAnalysis] = useState<Record<string, string>>({});
  const [loadingAi, setLoadingAi] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewDocument, setViewDocument] = useState<LeaveRequest | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const filteredRequests = useMemo(() => {
    let filtered = requests.sort((a: LeaveRequest, b: LeaveRequest) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    if (filter !== 'ALL') {
        filtered = filtered.filter((r: LeaveRequest) => r.status === filter);
    }

    if (searchTerm) {
        const term = searchTerm.toLowerCase();
        filtered = filtered.filter((r: LeaveRequest) => 
            r.userName.toLowerCase().includes(term) || 
            r.description.toLowerCase().includes(term) ||
            r.type.toLowerCase().includes(term)
        );
    }

    return filtered;
  }, [requests, filter, searchTerm]);

  const handleAiCheck = async (req: LeaveRequest) => {
    setLoadingAi(req.id);
    const result = await analyzeRequestConflict(req, history, rules);
    setAiAnalysis(prev => ({ ...prev, [req.id]: result }));
    setLoadingAi(null);
  };

  const handleApprove = () => {
    if (!viewDocument) return;
    if (!currentUser.signatureUrl) {
        alert("Você precisa cadastrar sua assinatura digital antes de aprovar documentos.");
        return;
    }
    onUpdateStatus(viewDocument.id, RequestStatus.APPROVED);
    setViewDocument(null);
  };

  const handleReject = () => {
      if (!viewDocument) return;
      const reason = prompt("Motivo da Reprovação:");
      if (reason) {
          onUpdateStatus(viewDocument.id, RequestStatus.REJECTED, reason);
          setViewDocument(null);
      }
  }

  const handleGeneratePDF = () => {
      const element = document.getElementById('admin-document-preview');
      if (!element) return;
      
      const opt = {
          margin: 10,
          filename: `documento_${viewDocument?.id}.pdf`,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2 },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };
      
      // @ts-ignore
      if (window.html2pdf) {
          // @ts-ignore
          window.html2pdf().set(opt).from(element).save();
      } else {
          alert("Biblioteca PDF não carregada. Tente imprimir com Ctrl+P.");
          window.print();
      }
  }

  return (
    <>
    <div className="bg-white rounded-xl shadow-lg border border-slate-100 overflow-hidden print:hidden">
      
      <ConfirmModal 
        isOpen={!!confirmDeleteId}
        onClose={() => setConfirmDeleteId(null)}
        onConfirm={() => { if(confirmDeleteId) onDelete(confirmDeleteId); }}
        title="Excluir Solicitação"
        message="Tem certeza que deseja excluir esta solicitação permanentemente? Esta ação não pode ser desfeita."
      />

      <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row gap-4 justify-between items-center">
         <div className="flex gap-2 overflow-x-auto w-full md:w-auto">
            <button onClick={() => setFilter('ALL')} className={`px-3 py-1 rounded-full text-xs font-bold ${filter === 'ALL' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600'}`}>Todos</button>
            <button onClick={() => setFilter(RequestStatus.PENDING)} className={`px-3 py-1 rounded-full text-xs font-bold ${filter === RequestStatus.PENDING ? 'bg-yellow-500 text-white' : 'bg-yellow-100 text-yellow-700'}`}>Pendentes (Gerência)</button>
            <button onClick={() => setFilter(RequestStatus.WAITING_SUBSTITUTE)} className={`px-3 py-1 rounded-full text-xs font-bold ${filter === RequestStatus.WAITING_SUBSTITUTE ? 'bg-orange-500 text-white' : 'bg-orange-100 text-orange-700'}`}>Aguard. Substituto</button>
            <button onClick={() => setFilter(RequestStatus.APPROVED)} className={`px-3 py-1 rounded-full text-xs font-bold ${filter === RequestStatus.APPROVED ? 'bg-green-500 text-white' : 'bg-green-100 text-green-700'}`}>Aprovados</button>
            <button onClick={() => setFilter(RequestStatus.REJECTED)} className={`px-3 py-1 rounded-full text-xs font-bold ${filter === RequestStatus.REJECTED ? 'bg-red-500 text-white' : 'bg-red-100 text-red-700'}`}>Reprovados</button>
         </div>
         <div className="relative w-full md:w-64">
            <input
                type="text"
                placeholder="Pesquisar..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-white text-slate-900 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-teal-500 outline-none"
            />
            <Search size={16} className="absolute left-2.5 top-2 text-slate-400 pointer-events-none"/>
         </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 text-slate-500 uppercase font-bold text-xs">
            <tr>
              <th className="px-6 py-3">Funcionário</th>
              <th className="px-6 py-3">Tipo / Data</th>
              <th className="px-6 py-3">Detalhes</th>
              <th className="px-6 py-3">Status</th>
              <th className="px-6 py-3">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredRequests.map((req: LeaveRequest) => (
              <tr key={req.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4">
                  <div className="font-bold text-slate-800">{req.userName}</div>
                  <div className="text-xs text-slate-500">{req.userRole}</div>
                </td>
                <td className="px-6 py-4">
                  <span className="block font-medium text-teal-700">{req.type}</span>
                  <span className="text-slate-500">{new Date(req.dateStart).toLocaleDateString('pt-BR')}</span>
                </td>
                <td className="px-6 py-4 max-w-xs">
                  <p className="truncate text-slate-600 mb-1" title={req.description}>{req.description}</p>
                  {req.coveringEmployee && (
                    <p className="text-xs text-indigo-600 font-medium">Cobertura: {req.coveringEmployee}</p>
                  )}
                  {aiAnalysis[req.id] && (
                    <div className="mt-2 p-2 bg-indigo-50 border border-indigo-100 rounded text-xs text-indigo-800">
                      <strong>IA Assistant:</strong> {aiAnalysis[req.id]}
                    </div>
                  )}
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded text-xs font-bold
                    ${req.status === RequestStatus.APPROVED ? 'bg-green-100 text-green-700' : 
                      req.status === RequestStatus.REJECTED ? 'bg-red-100 text-red-700' : 
                      req.status === RequestStatus.WAITING_SUBSTITUTE ? 'bg-orange-100 text-orange-700' :
                      'bg-yellow-100 text-yellow-700'}`}>
                    {req.status}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex space-x-2">
                    {/* View Document Button */}
                    <button 
                         onClick={() => setViewDocument(req)}
                         className="p-1.5 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                         title="Ver Documento"
                    >
                        <FileText size={16}/>
                    </button>

                    {req.status === RequestStatus.PENDING && (
                      <>
                        <button 
                          onClick={() => handleAiCheck(req)} 
                          disabled={loadingAi === req.id}
                          className="p-1.5 bg-indigo-500 text-white rounded hover:bg-indigo-600 disabled:opacity-50" 
                          title="Analisar com IA"
                        >
                          <BrainCircuit size={16} className={loadingAi === req.id ? 'animate-pulse' : ''}/>
                        </button>
                      </>
                    )}
                    <button 
                        onClick={() => setConfirmDeleteId(req.id)}
                        className="p-1.5 bg-slate-200 text-slate-600 rounded hover:bg-slate-300" 
                        title="Excluir Solicitação"
                    >
                        <Trash2 size={16}/>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filteredRequests.length === 0 && (
              <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-400">Nenhuma solicitação encontrada.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>

    {/* Document Viewer Modal */}
    {viewDocument && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in print:block print:bg-white print:p-0">
            <div className="bg-white w-full max-w-4xl rounded-xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col print:shadow-none print:max-w-none print:max-h-none print:h-auto print:rounded-none">
                <div className="bg-slate-800 p-4 flex justify-between items-center text-white print:hidden">
                     <h3 className="font-bold flex items-center"><FileText className="mr-2"/> Revisão de Documento</h3>
                     <button onClick={() => setViewDocument(null)}><X size={24}/></button>
                </div>
                <div className="p-6 overflow-y-auto bg-slate-100 flex-1 print:p-0 print:bg-white print:overflow-visible">
                     <div id="admin-document-preview">
                        <RequestDocument request={viewDocument} settings={settings} />
                     </div>
                </div>
                
                {/* Manager Action Bar */}
                <div className="p-4 border-t border-slate-200 bg-white flex justify-between items-center gap-3 print:hidden">
                    <div className="text-sm text-slate-500 italic">
                        {viewDocument.status === RequestStatus.WAITING_SUBSTITUTE ? (
                            <span className="text-orange-600 font-bold flex items-center">
                                <AlertTriangle size={16} className="mr-2"/> Aguardando assinatura do substituto
                            </span>
                        ) : (
                            <span>Ação Gerencial</span>
                        )}
                    </div>
                    
                    {/* Only show Approve/Reject if it is PENDING (meaning substitute already signed if needed) */}
                    <div className="flex gap-3">
                         <button 
                            onClick={handleGeneratePDF}
                            className="bg-slate-100 text-slate-700 px-3 py-2 rounded font-bold hover:bg-slate-200 flex items-center border border-slate-200"
                        >
                            <Download size={16} className="mr-2"/> Baixar PDF
                        </button>

                        {viewDocument.status === RequestStatus.PENDING && (
                            <>
                                <button 
                                    onClick={handleReject}
                                    className="px-4 py-2 bg-red-100 text-red-700 font-bold rounded-lg hover:bg-red-200"
                                >
                                    Reprovar
                                </button>
                                <button 
                                    onClick={handleApprove}
                                    className="px-6 py-2 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 flex items-center"
                                >
                                    <PenTool size={18} className="mr-2"/> Assinar e Aprovar
                                </button>
                            </>
                        )}
                    </div>
                </div>
                <div className="hidden print:block text-center p-2 text-xs text-slate-400">
                     Documento de Uso Interno - {settings.systemName}
                </div>
            </div>
        </div>
    )}
    </>
  );
};

const AbsenceManager = ({ users, absences, onSave, onDelete }: any) => {
    const [form, setForm] = useState({ id: '', userId: '', date: '' });
    const [searchTerm, setSearchTerm] = useState('');
    const [confirmId, setConfirmId] = useState<string | null>(null);
    
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const user = users.find((u: User) => u.id === form.userId);
        if (!user) return;

        onSave({
            id: form.id || `abs-${Date.now()}`,
            userId: form.userId,
            userName: user.name,
            date: form.date
        });
        setForm({ id: '', userId: '', date: '' });
    };

    const handleEdit = (abs: Absence) => {
        setForm({ id: abs.id, userId: abs.userId, date: abs.date });
    };

    const filteredAbsences = useMemo(() => {
        if (!searchTerm) return absences;
        return absences.filter((a: Absence) => a.userName.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [absences, searchTerm]);

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <ConfirmModal 
                isOpen={!!confirmId}
                onClose={() => setConfirmId(null)}
                onConfirm={() => { if(confirmId) onDelete(confirmId); }}
                title="Excluir Registro de Falta"
                message="Tem certeza que deseja excluir este registro de falta? O histórico será perdido."
            />

            <div className="bg-white p-6 rounded-xl shadow-lg border border-slate-100 h-fit">
                <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center">
                    <UserX size={20} className="mr-2 text-red-500"/> 
                    {form.id ? 'Editar Falta' : 'Lançar Falta'}
                </h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="text-xs font-bold text-slate-500">Funcionário</label>
                        <select 
                            required 
                            className="w-full border border-slate-300 bg-white text-slate-900 p-2 rounded text-sm" 
                            value={form.userId} 
                            onChange={e => setForm({...form, userId: e.target.value})}
                        >
                            <option value="">Selecione...</option>
                            {users.map((u: User) => <option key={u.id} value={u.id}>{u.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="text-xs font-bold text-slate-500">Data da Falta</label>
                        <input 
                            required 
                            type="date" 
                            className="w-full border border-slate-300 bg-white text-slate-900 p-2 rounded text-sm"
                            value={form.date}
                            onChange={e => setForm({...form, date: e.target.value})}
                        />
                    </div>
                    <div className="flex space-x-2">
                        <button type="submit" className="flex-1 bg-red-600 text-white py-2 rounded font-bold hover:bg-red-700">
                            {form.id ? 'Salvar Alteração' : 'Registrar'}
                        </button>
                        {form.id && (
                            <button 
                                type="button" 
                                onClick={() => setForm({ id: '', userId: '', date: '' })}
                                className="bg-slate-200 text-slate-600 px-3 py-2 rounded hover:bg-slate-300"
                            >Cancelar</button>
                        )}
                    </div>
                </form>
            </div>
            <div className="lg:col-span-2 bg-white rounded-xl shadow-lg border border-slate-100 p-4">
                 <div className="flex justify-between items-center mb-4">
                     <h3 className="text-lg font-bold text-slate-800">Histórico de Faltas</h3>
                     <div className="relative w-1/2">
                        <input
                            type="text"
                            placeholder="Pesquisar..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-3 py-1.5 bg-white text-slate-900 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                        />
                        <Search size={16} className="absolute left-2.5 top-2 text-slate-400 pointer-events-none"/>
                     </div>
                 </div>
                 <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50">
                            <tr>
                                <th className="px-4 py-2">Funcionário</th>
                                <th className="px-4 py-2">Data</th>
                                <th className="px-4 py-2 text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredAbsences.map((abs: Absence) => (
                                <tr key={abs.id} className="border-t">
                                    <td className="px-4 py-3 font-medium">{abs.userName}</td>
                                    <td className="px-4 py-3">{new Date(abs.date).toLocaleDateString('pt-BR')}</td>
                                    <td className="px-4 py-3 text-right flex justify-end gap-2">
                                        <button onClick={() => setConfirmId(abs.id)} className="text-red-500 hover:text-red-700 bg-red-50 p-1 rounded" title="Apagar"><Trash2 size={16}/></button>
                                    </td>
                                </tr>
                            ))}
                            {filteredAbsences.length === 0 && <tr><td colSpan={3} className="text-center py-4 text-slate-400">Nenhuma falta encontrada.</td></tr>}
                        </tbody>
                    </table>
                 </div>
            </div>
        </div>
    );
};

const CertificateManager = ({ users, certificates, onSave, onDelete }: any) => {
     const [form, setForm] = useState({ id: '', userId: '', dateStart: '', days: 1 });
    const [searchTerm, setSearchTerm] = useState('');
    const [confirmId, setConfirmId] = useState<string | null>(null);
    
    // Calculate end date based on days
    const endDate = useMemo(() => {
        if (!form.dateStart || form.days < 1) return '';
        const start = new Date(form.dateStart + 'T00:00:00'); // Fix TZ issues
        const end = new Date(start);
        end.setDate(start.getDate() + (form.days - 1));
        return end.toISOString().split('T')[0];
    }, [form.dateStart, form.days]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const user = users.find((u: User) => u.id === form.userId);
        if (!user) return;

        onSave({
            id: form.id || `cert-${Date.now()}`,
            userId: form.userId,
            userName: user.name,
            dateStart: form.dateStart,
            days: form.days,
            dateEnd: endDate
        });
        setForm({ id: '', userId: '', dateStart: '', days: 1 });
    };

    const handleEdit = (cert: MedicalCertificate) => {
        setForm({ id: cert.id, userId: cert.userId, dateStart: cert.dateStart, days: cert.days });
    };

    const filteredCertificates = useMemo(() => {
        if (!searchTerm) return certificates;
        return certificates.filter((c: MedicalCertificate) => c.userName.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [certificates, searchTerm]);

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <ConfirmModal 
                isOpen={!!confirmId}
                onClose={() => setConfirmId(null)}
                onConfirm={() => { if(confirmId) onDelete(confirmId); }}
                title="Excluir Atestado"
                message="Tem certeza que deseja excluir este registro de atestado?"
            />

            <div className="bg-white p-6 rounded-xl shadow-lg border border-slate-100 h-fit">
                <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center">
                    <FilePlus size={20} className="mr-2 text-teal-600"/> 
                    {form.id ? 'Editar Atestado' : 'Lançar Atestado'}
                </h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="text-xs font-bold text-slate-500">Funcionário</label>
                        <select 
                            required 
                            className="w-full border border-slate-300 bg-white text-slate-900 p-2 rounded text-sm" 
                            value={form.userId} 
                            onChange={e => setForm({...form, userId: e.target.value})}
                        >
                            <option value="">Selecione...</option>
                            {users.map((u: User) => <option key={u.id} value={u.id}>{u.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="text-xs font-bold text-slate-500">Data de Início</label>
                        <input 
                            required 
                            type="date" 
                            className="w-full border border-slate-300 bg-white text-slate-900 p-2 rounded text-sm"
                            value={form.dateStart}
                            onChange={e => setForm({...form, dateStart: e.target.value})}
                        />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-slate-500">Qtd. Dias</label>
                        <input 
                            required 
                            type="number" 
                            min="1"
                            className="w-full border border-slate-300 bg-white text-slate-900 p-2 rounded text-sm"
                            value={form.days}
                            onChange={e => setForm({...form, days: parseInt(e.target.value) || 0})}
                        />
                    </div>
                    <div>
                         <label className="text-xs font-bold text-slate-400">Data Final Calculada</label>
                         <div className="text-sm font-medium text-slate-700 bg-slate-100 p-2 rounded">
                            {endDate ? new Date(endDate).toLocaleDateString('pt-BR') : '-'}
                         </div>
                    </div>

                    <div className="flex space-x-2">
                        <button type="submit" className="flex-1 bg-teal-600 text-white py-2 rounded font-bold hover:bg-teal-700">
                            {form.id ? 'Salvar' : 'Lançar'}
                        </button>
                        {form.id && (
                            <button 
                                type="button" 
                                onClick={() => setForm({ id: '', userId: '', dateStart: '', days: 1 })}
                                className="bg-slate-200 text-slate-600 px-3 py-2 rounded hover:bg-slate-300"
                            >Cancelar</button>
                        )}
                    </div>
                </form>
            </div>
            <div className="lg:col-span-2 bg-white rounded-xl shadow-lg border border-slate-100 p-4">
                 <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold text-slate-800">Controle de Atestados</h3>
                    <div className="relative w-1/2">
                        <input
                            type="text"
                            placeholder="Pesquisar..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-3 py-1.5 bg-white text-slate-900 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                        />
                        <Search size={16} className="absolute left-2.5 top-2 text-slate-400 pointer-events-none"/>
                     </div>
                 </div>
                 <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50">
                            <tr>
                                <th className="px-4 py-2">Funcionário</th>
                                <th className="px-4 py-2">Período</th>
                                <th className="px-4 py-2">Dias</th>
                                <th className="px-4 py-2 text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredCertificates.map((cert: MedicalCertificate) => (
                                <tr key={cert.id} className="border-t">
                                    <td className="px-4 py-3 font-medium">{cert.userName}</td>
                                    <td className="px-4 py-3">
                                        {new Date(cert.dateStart).toLocaleDateString('pt-BR')} até {new Date(cert.dateEnd).toLocaleDateString('pt-BR')}
                                    </td>
                                    <td className="px-4 py-3 font-bold text-teal-700">{cert.days}</td>
                                    <td className="px-4 py-3 text-right flex justify-end gap-2">
                                        <button onClick={() => setConfirmId(cert.id)} className="text-red-500 hover:text-red-700 bg-red-50 p-1 rounded" title="Apagar"><Trash2 size={16}/></button>
                                    </td>
                                </tr>
                            ))}
                             {filteredCertificates.length === 0 && <tr><td colSpan={4} className="text-center py-4 text-slate-400">Nenhum atestado encontrado.</td></tr>}
                        </tbody>
                    </table>
                 </div>
            </div>
        </div>
    );
};

const TREManager = ({ users, onUpdate }: any) => {
    const [edits, setEdits] = useState<Record<string, number>>({});
    const [searchTerm, setSearchTerm] = useState('');
    const [confirmResetId, setConfirmResetId] = useState<string | null>(null);

    const handleChange = (id: string, val: number) => {
        setEdits(prev => ({...prev, [id]: val}));
    };

    const handleSave = (id: string) => {
        if (edits[id] !== undefined) {
            onUpdate(id, edits[id]);
            const newEdits = {...edits};
            delete newEdits[id];
            setEdits(newEdits);
        }
    }
    
    const filteredUsers = useMemo(() => {
        if (!searchTerm) return users;
        return users.filter((u: User) => u.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [users, searchTerm]);

    return (
        <div className="bg-white rounded-xl shadow-lg border border-slate-100 p-6">
            <ConfirmModal 
                isOpen={!!confirmResetId}
                onClose={() => setConfirmResetId(null)}
                onConfirm={() => { if(confirmResetId) onUpdate(confirmResetId, 0); }}
                title="Zerar Saldo TRE"
                message="Tem certeza que deseja zerar o saldo de dias TRE deste funcionário?"
            />

            <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center">
                <Vote size={20} className="mr-2 text-yellow-500"/> Folga TRE
            </h3>
            
            <div className="flex justify-between items-center mb-4">
                <p className="text-sm text-slate-500">Gerencie aqui o saldo de dias que cada funcionário possui por serviço eleitoral.</p>
                <div className="relative w-64">
                    <input
                        type="text"
                        placeholder="Pesquisar..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-3 py-1.5 bg-white text-slate-900 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                    />
                    <Search size={16} className="absolute left-2.5 top-2 text-slate-400 pointer-events-none"/>
                </div>
            </div>
            
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50">
                        <tr>
                            <th className="px-4 py-3">Funcionário</th>
                            <th className="px-4 py-3">Saldo Atual</th>
                            <th className="px-4 py-3">Novo Saldo</th>
                            <th className="px-4 py-3">Ação</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {filteredUsers.map((u: User) => (
                            <tr key={u.id} className="hover:bg-slate-50">
                                <td className="px-4 py-3">
                                    <div className="font-medium text-slate-800">{u.name}</div>
                                    <div className="text-xs text-slate-400">{u.role}</div>
                                </td>
                                <td className="px-4 py-3 font-bold text-slate-600">{u.availableTREDays} dias</td>
                                <td className="px-4 py-3">
                                    <input 
                                        type="number" 
                                        className="w-20 border border-slate-300 bg-white text-slate-900 rounded p-1 text-center"
                                        placeholder={u.availableTREDays.toString()}
                                        onChange={(e) => handleChange(u.id, parseInt(e.target.value) || 0)}
                                        value={edits[u.id] !== undefined ? edits[u.id] : ''}
                                    />
                                </td>
                                <td className="px-4 py-3 flex gap-2">
                                    {edits[u.id] !== undefined && (
                                        <button 
                                            onClick={() => handleSave(u.id)}
                                            className="bg-teal-600 text-white px-3 py-1 rounded text-xs font-bold hover:bg-teal-700"
                                            title="Salvar Saldo"
                                        >
                                            <Save size={16} />
                                        </button>
                                    )}
                                    <button 
                                        onClick={() => setConfirmResetId(u.id)}
                                        className="bg-red-100 text-red-600 px-2 py-1 rounded text-xs font-bold hover:bg-red-200"
                                        title="Zerar Saldo (Apagar)"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

const EmployeesManager = ({ users, onAddUser, onUpdateUser, onDeleteUser }: any) => {
     // ... form state code omitted for brevity ...
     const [formData, setFormData] = useState<{
      id?: string;
      name: string;
      role: Role;
      contractType: ContractType;
      coren: string;
      matricula: string;
      shift: Shift;
      birthday: string;
      password?: string;
      availableTREDays?: number;
      availableBirthday?: boolean;
      username?: string;
      email: string;
      contact: string;
      permissions: string[];
  }>({
    name: '', 
    role: Role.NURSE, 
    contractType: ContractType.STATUTORY,
    coren: '',
    matricula: '',
    shift: Shift.DIURNO_A,
    birthday: '',
    email: '',
    contact: '',
    permissions: []
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('ALL');
  const [isEditing, setIsEditing] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const isHealthPro = [Role.NURSE, Role.TECH, Role.MANAGER].includes(formData.role);

  const handleEdit = (user: User) => {
      setFormData({
          id: user.id,
          name: user.name,
          role: user.role,
          contractType: user.contractType,
          coren: user.coren || '',
          matricula: user.matricula || '',
          shift: user.shift || Shift.DIURNO_A,
          birthday: user.birthday || '',
          // Don't populate password field for security
          password: '', 
          availableTREDays: user.availableTREDays,
          availableBirthday: user.availableBirthday,
          username: user.username,
          email: user.email || '',
          contact: user.contact || '',
          permissions: user.permissions || []
      });
      setIsEditing(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setFormData({ 
        name: '', 
        role: Role.NURSE, 
        contractType: ContractType.STATUTORY, 
        coren: '', 
        matricula: '', 
        shift: Shift.DIURNO_A, 
        birthday: '',
        email: '',
        contact: '',
        permissions: []
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Determine Login (Username) based on role
    const login = isHealthPro ? formData.coren : formData.matricula;
    
    if (!login) {
        alert("Preencha o Coren ou Matrícula para gerar o login.");
        return;
    }

    if (isEditing && formData.id) {
        const originalUser = users.find((u:User) => u.id === formData.id);
        const finalPassword = formData.password ? formData.password : (originalUser?.password || 'upajr26');

        onUpdateUser({
            ...formData,
            username: login, 
            password: finalPassword
        });
        setIsEditing(false);
    } else {
        onAddUser({
            ...formData,
            username: login,
            id: `u-${Date.now()}`,
            availableTREDays: 0,
            availableBirthday: true,
            password: formData.password || 'upajr26'
        });
    }

    setFormData({ 
        name: '', 
        role: Role.NURSE, 
        contractType: ContractType.STATUTORY, 
        coren: '', 
        matricula: '', 
        shift: Shift.DIURNO_A, 
        birthday: '',
        email: '',
        contact: '',
        password: '',
        permissions: []
    });
  };

  const togglePermission = (perm: string) => {
      setFormData(prev => {
          if (prev.permissions.includes(perm)) {
              return { ...prev, permissions: prev.permissions.filter(p => p !== perm) };
          } else {
              return { ...prev, permissions: [...prev.permissions, perm] };
          }
      });
  };

  const filteredUsers = useMemo(() => {
    return users.filter((u: User) => {
      const matchesSearch = !searchTerm || u.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesRole = filterRole === 'ALL' || u.role === filterRole;
      return matchesSearch && matchesRole;
    });
  }, [users, searchTerm, filterRole]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      
      <ConfirmModal 
        isOpen={!!confirmDeleteId}
        onClose={() => setConfirmDeleteId(null)}
        onConfirm={() => { if(confirmDeleteId) onDeleteUser(confirmDeleteId); }}
        title="Excluir Funcionário"
        message="Tem certeza que deseja excluir este funcionário? O acesso ao sistema será revogado imediatamente."
      />

      <div className="lg:col-span-1 bg-white p-6 rounded-xl shadow-lg border border-slate-100 h-fit">
        <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center">
            {isEditing ? <Edit size={20} className="mr-2 text-blue-600"/> : <Shield size={20} className="mr-2 text-teal-600"/>} 
            {isEditing ? 'Editar Funcionário' : 'Cadastrar Novo'}
        </h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-500">Nome Completo</label>
            <input 
                required 
                type="text" 
                className="w-full border border-slate-300 bg-white text-slate-900 p-2 rounded focus:ring-2 focus:ring-teal-500 outline-none" 
                value={formData.name} 
                onChange={e => setFormData({...formData, name: e.target.value})} 
            />
          </div>
          
          <div className="grid grid-cols-2 gap-2">
            <div>
                <label className="text-xs font-bold text-slate-500">Função</label>
                <select 
                    className="w-full border border-slate-300 bg-white text-slate-900 p-2 rounded text-sm focus:ring-2 focus:ring-teal-500 outline-none" 
                    value={formData.role} 
                    onChange={e => setFormData({...formData, role: e.target.value as Role})}
                >
                    {Object.values(Role).map(r => <option key={r} value={r}>{r}</option>)}
                </select>
            </div>
            <div>
                <label className="text-xs font-bold text-slate-500">Vínculo</label>
                <select 
                    className="w-full border border-slate-300 bg-white text-slate-900 p-2 rounded text-sm focus:ring-2 focus:ring-teal-500 outline-none" 
                    value={formData.contractType} 
                    onChange={e => setFormData({...formData, contractType: e.target.value as ContractType})}
                >
                    {Object.values(ContractType).map(c => <option key={c} value={c}>{c}</option>)}
                </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-500">
                {isHealthPro ? 'Número COREN' : 'Matrícula'} <span className="text-red-500">* (Login)</span>
            </label>
            <input 
                required 
                type="text" 
                placeholder={isHealthPro ? 'Ex: 123456' : 'Ex: 98765'}
                className="w-full border border-slate-300 bg-white text-slate-900 p-2 rounded focus:ring-2 focus:ring-teal-500 outline-none" 
                value={isHealthPro ? formData.coren : formData.matricula} 
                onChange={e => isHealthPro 
                    ? setFormData({...formData, coren: e.target.value}) 
                    : setFormData({...formData, matricula: e.target.value})
                } 
            />
          </div>

          <div>
             <label className="text-xs font-bold text-slate-500">Turno</label>
             <select 
                className="w-full border border-slate-300 bg-white text-slate-900 p-2 rounded text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                value={formData.shift}
                onChange={e => setFormData({...formData, shift: e.target.value as Shift})}
             >
                {Object.values(Shift).map(s => <option key={s} value={s}>{s}</option>)}
             </select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
                <label className="text-xs font-bold text-slate-500">Email (Opcional)</label>
                <input 
                    type="email" 
                    className="w-full border border-slate-300 bg-white text-slate-900 p-2 rounded text-sm focus:ring-2 focus:ring-teal-500 outline-none" 
                    value={formData.email} 
                    onChange={e => setFormData({...formData, email: e.target.value})} 
                />
            </div>
            <div>
                <label className="text-xs font-bold text-slate-500">Contato (Opcional)</label>
                <input 
                    type="text" 
                    className="w-full border border-slate-300 bg-white text-slate-900 p-2 rounded text-sm focus:ring-2 focus:ring-teal-500 outline-none" 
                    value={formData.contact} 
                    onChange={e => setFormData({...formData, contact: e.target.value})} 
                />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-500">Data de Aniversário</label>
            <input 
                required
                type="date" 
                className="w-full border border-slate-300 bg-white text-slate-900 p-2 rounded focus:ring-2 focus:ring-teal-500 outline-none" 
                value={formData.birthday} 
                onChange={e => setFormData({...formData, birthday: e.target.value})} 
            />
          </div>

          <div>
             <label className="text-xs font-bold text-slate-500 flex items-center">
                <Lock size={12} className="mr-1"/> 
                {isEditing ? 'Alterar Senha' : 'Senha Inicial'}
             </label>
             <input 
                type="text" 
                placeholder={isEditing ? 'Deixe em branco para manter' : 'upajr26 (padrão)'}
                className="w-full border border-slate-300 bg-white text-slate-900 p-2 rounded focus:ring-2 focus:ring-teal-500 outline-none" 
                value={formData.password} 
                onChange={e => setFormData({...formData, password: e.target.value})} 
             />
          </div>

          {/* Permissions Section */}
          <div className="bg-slate-50 p-3 rounded border border-slate-200">
             <label className="text-xs font-bold text-slate-700 flex items-center mb-2">
                <Key size={12} className="mr-1"/> Permissões de Acesso
             </label>
             <div className="space-y-2">
                 {[
                    Permission.MANAGE_REQUESTS,
                    Permission.MANAGE_USERS,
                    Permission.MANAGE_RECORDS,
                    Permission.MANAGE_SETTINGS
                 ].map(perm => (
                     <div key={perm} className="flex items-center">
                         <input 
                            type="checkbox"
                            id={`perm-${perm}`}
                            checked={formData.permissions.includes(perm)}
                            onChange={() => togglePermission(perm)}
                            className="w-4 h-4 text-teal-600 rounded border-slate-300 focus:ring-teal-500"
                         />
                         <label htmlFor={`perm-${perm}`} className="ml-2 text-xs text-slate-600 cursor-pointer">{perm}</label>
                     </div>
                 ))}
             </div>
          </div>

          <div className="flex gap-2">
            <button type="submit" className={`flex-1 ${isEditing ? 'bg-blue-600 hover:bg-blue-700' : 'bg-teal-600 hover:bg-teal-700'} text-white py-2 rounded font-bold transition-colors`}>
                {isEditing ? 'Salvar Alterações' : 'Cadastrar'}
            </button>
            {isEditing && (
                <button type="button" onClick={handleCancelEdit} className="bg-slate-200 text-slate-600 px-3 rounded hover:bg-slate-300 font-bold">
                    Cancelar
                </button>
            )}
          </div>
        </form>
      </div>

      <div className="lg:col-span-2 bg-white rounded-xl shadow-lg border border-slate-100 overflow-hidden">
        <div className="p-4 border-b flex flex-col sm:flex-row justify-between items-center gap-4">
            <h3 className="text-lg font-bold text-slate-800">Quadro de Funcionários</h3>
            <div className="flex gap-2 w-full sm:w-auto">
                <select
                    value={filterRole}
                    onChange={(e) => setFilterRole(e.target.value)}
                    className="bg-white border border-slate-300 text-slate-900 rounded text-sm px-2 py-1.5 focus:ring-2 focus:ring-teal-500 outline-none"
                >
                    <option value="ALL">Todas as Funções</option>
                    {Object.values(Role).map(r => <option key={r} value={r}>{r}</option>)}
                </select>
                <div className="relative w-full sm:w-64">
                    <input
                        type="text"
                        placeholder="Pesquisar..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-3 py-1.5 bg-white text-slate-900 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                    />
                    <Search size={16} className="absolute left-2.5 top-2 text-slate-400 pointer-events-none"/>
                </div>
            </div>
        </div>
        <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
            <thead className="bg-slate-50">
                <tr>
                    <th className="px-4 py-2">Nome / Login</th>
                    <th className="px-4 py-2">Função / Contato</th>
                    <th className="px-4 py-2">Vínculo</th>
                    <th className="px-4 py-2">Ação</th>
                </tr>
            </thead>
            <tbody>
                {filteredUsers.map((u: any) => (
                    <tr key={u.id} className="border-t">
                        <td className="px-4 py-3 font-medium">
                            <div className="text-slate-900">{u.name}</div>
                            <div className="text-xs text-slate-500">Login: {u.username}</div>
                            {u.permissions && u.permissions.length > 0 && (
                                <div className="mt-1 flex flex-wrap gap-1">
                                    <span className="bg-indigo-50 text-indigo-700 text-[10px] px-1 rounded border border-indigo-100">
                                        {u.permissions.length} Permissões
                                    </span>
                                </div>
                            )}
                        </td>
                        <td className="px-4 py-3">
                            <div className="text-slate-800">{u.role}</div>
                            {(u.email || u.contact) && (
                                <div className="flex flex-col gap-0.5 mt-1">
                                    {u.contact && <div className="text-xs text-teal-600 flex items-center"><Phone size={10} className="mr-1"/>{u.contact}</div>}
                                    {u.email && <div className="text-xs text-slate-500 flex items-center"><Mail size={10} className="mr-1"/>{u.email}</div>}
                                </div>
                            )}
                        </td>
                        <td className="px-4 py-3">{u.contractType}</td>
                        <td className="px-4 py-3 text-right flex justify-end gap-2">
                            <button onClick={() => handleEdit(u)} className="text-blue-500 hover:text-blue-700 bg-blue-50 p-1 rounded" title="Editar"><Edit size={16}/></button>
                            {u.role !== Role.ADMIN && (
                                <button onClick={() => setConfirmDeleteId(u.id)} className="text-red-500 hover:text-red-700 bg-red-50 p-1 rounded" title="Excluir"><Trash2 size={16}/></button>
                            )}
                        </td>
                    </tr>
                ))}
            </tbody>
            </table>
        </div>
      </div>
    </div>
  );
};

const SettingsManager = ({ rules, onUpdateRules, settings, onUpdateSettings }: any) => {
    // ... Settings manager code omitted for brevity as it was not changed ...
    // Re-implemented to keep context valid
    const [content, setContent] = useState(rules.content);
  const [localSettings, setLocalSettings] = useState<SystemSettings>(settings);
  const [aiPrompt, setAiPrompt] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  const handleSaveText = () => {
    onUpdateRules(content);
  };

  const handleSaveSettings = () => {
      onUpdateSettings(localSettings);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          const reader = new FileReader();
          reader.onload = (ev) => {
              if (ev.target?.result) {
                  setLocalSettings(prev => ({ ...prev, logoUrl: ev.target!.result as string }));
              }
          };
          reader.readAsDataURL(e.target.files[0]);
      }
  };

  const toggleBlock = () => {
      if (localSettings.globalSwapBlockUntil && new Date(localSettings.globalSwapBlockUntil) > new Date()) {
          setLocalSettings({ ...localSettings, globalSwapBlockUntil: null });
      } else {
          const d = new Date();
          d.setDate(d.getDate() + 30);
          setLocalSettings({ ...localSettings, globalSwapBlockUntil: d.toISOString() });
      }
  };

  const handleAiRefine = async () => {
    if (!aiPrompt) return;
    setLoading(true);
    const newText = await refineRulesText(content, aiPrompt);
    setContent(newText);
    setLoading(false);
    setAiPrompt('');
  }

  const updateQuota = (group: 'nurses' | 'techs', key: string, val: number) => {
      setLocalSettings(prev => ({
          ...prev,
          vacationConfig: {
              ...prev.vacationConfig,
              quotas: {
                  ...prev.vacationConfig.quotas,
                  [group]: {
                      ...prev.vacationConfig.quotas[group],
                      [key]: val
                  }
              }
          }
      }));
  }

  // Update Limits Helper
  const updateLimit = (type: 'statutory' | 'temporary', field: keyof typeof localSettings.limits.statutory, value: number) => {
      setLocalSettings(prev => ({
          ...prev,
          limits: {
              ...prev.limits,
              [type]: {
                  ...prev.limits[type],
                  [field]: value
              }
          }
      }));
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Left Column: System Parameters */}
        <div className="space-y-6">

             {/* Personalization Section */}
             <div className="bg-white rounded-xl shadow-lg border border-slate-100 p-6">
                <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center">
                    <Palette size={20} className="mr-2 text-purple-600"/> Personalização do Sistema
                </h3>
                <div className="space-y-4">
                     <div>
                        <label className="text-xs font-bold text-slate-500">Nome do Sistema</label>
                        <input 
                            type="text" 
                            className="w-full border border-slate-300 bg-white text-slate-900 p-2 rounded focus:outline-none focus:ring-2 focus:ring-teal-500"
                            value={localSettings.systemName}
                            onChange={(e) => setLocalSettings({...localSettings, systemName: e.target.value})}
                        />
                     </div>
                     <div className="flex gap-4 items-start">
                         <div className="flex-1">
                             <label className="text-xs font-bold text-slate-500">Upload de Logomarca</label>
                             <div className="flex items-center gap-2 mt-1">
                                <label className="cursor-pointer bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 rounded text-sm flex items-center border border-slate-300">
                                    <ImageIcon size={16} className="mr-2" /> Escolher Imagem
                                    <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                                </label>
                                {localSettings.logoUrl && (
                                    <button 
                                        onClick={() => setLocalSettings({...localSettings, logoUrl: null})}
                                        className="text-red-500 text-xs hover:underline"
                                    >Remover</button>
                                )}
                             </div>
                         </div>
                         <div className="w-16 h-16 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-center overflow-hidden">
                             {localSettings.logoUrl ? (
                                 <img src={localSettings.logoUrl} alt="Preview" className="w-full h-full object-contain" />
                             ) : (
                                 <span className="text-xs text-slate-400">Sem Logo</span>
                             )}
                         </div>
                     </div>
                     <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-bold text-slate-500">Contato Suporte (WhatsApp)</label>
                            <input 
                                type="text" 
                                placeholder="5592..."
                                className="w-full border border-slate-300 bg-white text-slate-900 p-2 rounded focus:outline-none focus:ring-2 focus:ring-teal-500"
                                value={localSettings.supportContact}
                                onChange={(e) => setLocalSettings({...localSettings, supportContact: e.target.value})}
                            />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500">Nome Desenvolvedor</label>
                            <input 
                                type="text" 
                                className="w-full border border-slate-300 bg-white text-slate-900 p-2 rounded focus:outline-none focus:ring-2 focus:ring-teal-500"
                                value={localSettings.developerName}
                                onChange={(e) => setLocalSettings({...localSettings, developerName: e.target.value})}
                            />
                        </div>
                     </div>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg border border-slate-100 p-6">
                <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center">
                    <CalendarClock size={20} className="mr-2 text-teal-600"/> Janela de Solicitações (Folgas)
                </h3>
                <div className="flex items-center space-x-4 mb-4">
                    <div className="flex-1">
                        <label className="text-xs font-bold text-slate-500">Dia Início</label>
                        <input 
                            type="number" 
                            min="1" max="31"
                            className="w-full border border-slate-300 bg-white text-slate-900 p-2 rounded"
                            value={localSettings.requestWindowStart}
                            onChange={(e) => setLocalSettings({...localSettings, requestWindowStart: parseInt(e.target.value)})}
                        />
                    </div>
                    <div className="flex-1">
                        <label className="text-xs font-bold text-slate-500">Dia Fim</label>
                        <input 
                            type="number" 
                            min="1" max="31"
                            className="w-full border border-slate-300 bg-white text-slate-900 p-2 rounded"
                            value={localSettings.requestWindowEnd}
                            onChange={(e) => setLocalSettings({...localSettings, requestWindowEnd: parseInt(e.target.value)})}
                        />
                    </div>
                </div>
                
                <h4 className="text-sm font-bold text-slate-700 border-t pt-4 mb-3 flex items-center">
                   <Gauge size={16} className="mr-2"/> Limites Mensais por Vínculo
                </h4>
                
                <div className="grid grid-cols-2 gap-6">
                    {/* Statutory Limits */}
                    <div className="bg-blue-50 p-3 rounded-lg space-y-2">
                        <h5 className="text-xs font-bold text-blue-800 border-b border-blue-200 pb-1 mb-2">Estatutários</h5>
                        <div>
                             <label className="text-[10px] text-slate-500 font-bold block">Max. Folgas Escala</label>
                             <input type="number" className="w-full border bg-white p-1 rounded text-sm"
                                value={localSettings.limits.statutory.maxScaleLeaves}
                                onChange={e => updateLimit('statutory', 'maxScaleLeaves', parseInt(e.target.value))}
                             />
                        </div>
                        <div>
                             <label className="text-[10px] text-slate-500 font-bold block">Max. Permutas Extras</label>
                             <input type="number" className="w-full border bg-white p-1 rounded text-sm"
                                value={localSettings.limits.statutory.maxExtraSwaps}
                                onChange={e => updateLimit('statutory', 'maxExtraSwaps', parseInt(e.target.value))}
                             />
                        </div>
                        <div>
                             <label className="text-[10px] text-slate-500 font-bold block">Max. Permutas Regulares</label>
                             <input type="number" className="w-full border bg-white p-1 rounded text-sm"
                                value={localSettings.limits.statutory.maxRegularSwaps}
                                onChange={e => updateLimit('statutory', 'maxRegularSwaps', parseInt(e.target.value))}
                             />
                        </div>
                    </div>

                    {/* Temporary Limits */}
                    <div className="bg-orange-50 p-3 rounded-lg space-y-2">
                        <h5 className="text-xs font-bold text-orange-800 border-b border-orange-200 pb-1 mb-2">Temporários</h5>
                        <div>
                             <label className="text-[10px] text-slate-500 font-bold block">Max. Folgas Escala</label>
                             <input type="number" className="w-full border bg-white p-1 rounded text-sm"
                                value={localSettings.limits.temporary.maxScaleLeaves}
                                onChange={e => updateLimit('temporary', 'maxScaleLeaves', parseInt(e.target.value))}
                             />
                        </div>
                        <div>
                             <label className="text-[10px] text-slate-500 font-bold block">Max. Permutas Extras</label>
                             <input type="number" className="w-full border bg-white p-1 rounded text-sm"
                                value={localSettings.limits.temporary.maxExtraSwaps}
                                onChange={e => updateLimit('temporary', 'maxExtraSwaps', parseInt(e.target.value))}
                             />
                        </div>
                        <div>
                             <label className="text-[10px] text-slate-500 font-bold block">Max. Permutas Regulares</label>
                             <input type="number" className="w-full border bg-white p-1 rounded text-sm"
                                value={localSettings.limits.temporary.maxRegularSwaps}
                                onChange={e => updateLimit('temporary', 'maxRegularSwaps', parseInt(e.target.value))}
                             />
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg border border-slate-100 p-6">
                <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center">
                    <Plane size={20} className="mr-2 text-blue-500"/> Regras de Férias
                </h3>
                
                {/* Vacation Window */}
                <div className="mb-6 border-b border-slate-100 pb-4">
                    <h4 className="text-sm font-bold text-slate-700 mb-3">Janela de Solicitação</h4>
                    <div className="grid grid-cols-2 gap-4">
                         <div>
                             <label className="text-xs font-bold text-slate-500">Ano</label>
                             <input type="number" className="w-full border border-slate-300 bg-white text-slate-900 p-2 rounded text-sm" 
                                value={localSettings.vacationConfig.openWindow.year}
                                onChange={e => setLocalSettings({
                                    ...localSettings, vacationConfig: { ...localSettings.vacationConfig, openWindow: { ...localSettings.vacationConfig.openWindow, year: parseInt(e.target.value)}}
                                })}
                             />
                         </div>
                         <div>
                             <label className="text-xs font-bold text-slate-500">Mês (1-12)</label>
                             <select className="w-full border border-slate-300 bg-white text-slate-900 p-2 rounded text-sm"
                                value={localSettings.vacationConfig.openWindow.month}
                                onChange={e => setLocalSettings({
                                    ...localSettings, vacationConfig: { ...localSettings.vacationConfig, openWindow: { ...localSettings.vacationConfig.openWindow, month: parseInt(e.target.value)}}
                                })}
                             >
                                {Array.from({length: 12}, (_, i) => i + 1).map(m => (
                                    <option key={m} value={m}>{new Date(2024, m-1, 1).toLocaleString('pt-BR', {month: 'long'})}</option>
                                ))}
                             </select>
                         </div>
                         <div>
                             <label className="text-xs font-bold text-slate-500">Dia Início</label>
                             <input type="number" className="w-full border border-slate-300 bg-white text-slate-900 p-2 rounded text-sm" 
                                value={localSettings.vacationConfig.openWindow.startDay}
                                onChange={e => setLocalSettings({
                                    ...localSettings, vacationConfig: { ...localSettings.vacationConfig, openWindow: { ...localSettings.vacationConfig.openWindow, startDay: parseInt(e.target.value)}}
                                })}
                             />
                         </div>
                         <div>
                             <label className="text-xs font-bold text-slate-500">Dia Final</label>
                             <input type="number" className="w-full border border-slate-300 bg-white text-slate-900 p-2 rounded text-sm" 
                                value={localSettings.vacationConfig.openWindow.endDay}
                                onChange={e => setLocalSettings({
                                    ...localSettings, vacationConfig: { ...localSettings.vacationConfig, openWindow: { ...localSettings.vacationConfig.openWindow, endDay: parseInt(e.target.value)}}
                                })}
                             />
                         </div>
                    </div>
                </div>

                {/* Quotas */}
                <div>
                    <h4 className="text-sm font-bold text-slate-700 mb-3">Limite de Funcionários por Plantão</h4>
                    <div className="grid grid-cols-2 gap-6">
                        {/* Nurses */}
                        <div className="bg-blue-50 p-3 rounded-lg">
                            <h5 className="text-xs font-bold text-blue-800 mb-2 uppercase border-b border-blue-200 pb-1">Enfermeiros</h5>
                            <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                    <span className="text-xs text-slate-600">Diurno A</span>
                                    <input type="number" className="w-12 text-center border bg-white text-slate-900 rounded p-1 text-xs" 
                                        value={localSettings.vacationConfig.quotas.nurses.diurnoA}
                                        onChange={e => updateQuota('nurses', 'diurnoA', parseInt(e.target.value))}
                                    />
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-xs text-slate-600">Noturno A</span>
                                    <input type="number" className="w-12 text-center border bg-white text-slate-900 rounded p-1 text-xs" 
                                        value={localSettings.vacationConfig.quotas.nurses.noturnoA}
                                        onChange={e => updateQuota('nurses', 'noturnoA', parseInt(e.target.value))}
                                    />
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-xs text-slate-600">Diurno B</span>
                                    <input type="number" className="w-12 text-center border bg-white text-slate-900 rounded p-1 text-xs" 
                                        value={localSettings.vacationConfig.quotas.nurses.diurnoB}
                                        onChange={e => updateQuota('nurses', 'diurnoB', parseInt(e.target.value))}
                                    />
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-xs text-slate-600">Noturno B</span>
                                    <input type="number" className="w-12 text-center border bg-white text-slate-900 rounded p-1 text-xs" 
                                        value={localSettings.vacationConfig.quotas.nurses.noturnoB}
                                        onChange={e => updateQuota('nurses', 'noturnoB', parseInt(e.target.value))}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Techs */}
                        <div className="bg-teal-50 p-3 rounded-lg">
                            <h5 className="text-xs font-bold text-teal-800 mb-2 uppercase border-b border-teal-200 pb-1">Técnicos</h5>
                            <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                    <span className="text-xs text-slate-600">Diurno A</span>
                                    <input type="number" className="w-12 text-center border bg-white text-slate-900 rounded p-1 text-xs" 
                                        value={localSettings.vacationConfig.quotas.techs.diurnoA}
                                        onChange={e => updateQuota('techs', 'diurnoA', parseInt(e.target.value))}
                                    />
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-xs text-slate-600">Noturno A</span>
                                    <input type="number" className="w-12 text-center border bg-white text-slate-900 rounded p-1 text-xs" 
                                        value={localSettings.vacationConfig.quotas.techs.noturnoA}
                                        onChange={e => updateQuota('techs', 'noturnoA', parseInt(e.target.value))}
                                    />
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-xs text-slate-600">Diurno B</span>
                                    <input type="number" className="w-12 text-center border bg-white text-slate-900 rounded p-1 text-xs" 
                                        value={localSettings.vacationConfig.quotas.techs.diurnoB}
                                        onChange={e => updateQuota('techs', 'diurnoB', parseInt(e.target.value))}
                                    />
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-xs text-slate-600">Noturno B</span>
                                    <input type="number" className="w-12 text-center border bg-white text-slate-900 rounded p-1 text-xs" 
                                        value={localSettings.vacationConfig.quotas.techs.noturnoB}
                                        onChange={e => updateQuota('techs', 'noturnoB', parseInt(e.target.value))}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

            </div>

            <div className="bg-white rounded-xl shadow-lg border border-slate-100 p-6">
                <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center">
                    <Lock size={20} className="mr-2 text-red-500"/> Bloqueio Geral de Permutas
                </h3>
                <div className="flex items-center justify-between mb-4">
                    <button 
                        onClick={toggleBlock}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${
                            localSettings.globalSwapBlockUntil && new Date(localSettings.globalSwapBlockUntil) > new Date()
                            ? 'bg-red-600 text-white hover:bg-red-700'
                            : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                        }`}
                    >
                        {localSettings.globalSwapBlockUntil && new Date(localSettings.globalSwapBlockUntil) > new Date()
                         ? 'Sistema Bloqueado (Clique para Liberar)' 
                         : 'Bloquear Permutas (30 Dias)'}
                    </button>
                </div>
                <div>
                     <label className="text-xs font-bold text-slate-500">Bloqueado Até (Personalizar)</label>
                     <input 
                        type="date"
                        className="w-full border border-slate-300 bg-white text-slate-900 p-2 rounded mt-1"
                        value={localSettings.globalSwapBlockUntil ? localSettings.globalSwapBlockUntil.split('T')[0] : ''}
                        onChange={(e) => setLocalSettings({...localSettings, globalSwapBlockUntil: e.target.value ? new Date(e.target.value).toISOString() : null})}
                     />
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg border border-slate-100 p-6">
                <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center">
                    <AlertTriangle size={20} className="mr-2 text-orange-500"/> Regras de Bloqueio Automático
                </h3>
                
                {/* ... Rules UI code omitted for brevity as it was not changed ... */}
                {/* Rest of the settings form remains identical to previous version, just re-rendering here to complete component */}
                 <div className="space-y-4">
                    <div className="p-3 bg-slate-50 rounded border border-slate-200">
                         <h4 className="text-sm font-bold text-teal-800 mb-3 border-b pb-1">Por Atestado</h4>
                         <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-slate-600">Bloquear Permutas Extras</span>
                                <input 
                                    type="checkbox" 
                                    checked={localSettings.blockExtraSwapOnCertificate}
                                    onChange={(e) => setLocalSettings({...localSettings, blockExtraSwapOnCertificate: e.target.checked})}
                                    className="w-5 h-5 text-teal-600"
                                />
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-slate-600">Bloquear Folgas</span>
                                <input 
                                    type="checkbox" 
                                    checked={localSettings.blockLeavesOnCertificate}
                                    onChange={(e) => setLocalSettings({...localSettings, blockLeavesOnCertificate: e.target.checked})}
                                    className="w-5 h-5 text-teal-600"
                                />
                            </div>
                            <div className="mt-2 flex items-center justify-end">
                                <label className="text-xs text-slate-400 mr-2">Duração Penalidade Solicitante (dias):</label>
                                <input 
                                    type="number" 
                                    value={localSettings.penaltyCertificateDays}
                                    onChange={(e) => setLocalSettings({...localSettings, penaltyCertificateDays: parseInt(e.target.value)})}
                                    className="w-16 border border-slate-300 bg-white text-slate-900 rounded p-1 text-sm"
                                />
                            </div>
                            <hr className="my-2 border-slate-200"/>
                            
                            {/* New Substitute Rule */}
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-red-600 font-bold">Proibir como Substituto (Permutas)</span>
                                <div 
                                    onClick={() => setLocalSettings({...localSettings, blockSubstituteOnCertificate: !localSettings.blockSubstituteOnCertificate})}
                                    className={`relative w-10 h-5 rounded-full cursor-pointer transition-colors ${localSettings.blockSubstituteOnCertificate ? 'bg-red-600' : 'bg-slate-300'}`}
                                >
                                    <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${localSettings.blockSubstituteOnCertificate ? 'translate-x-5' : ''}`}></div>
                                </div>
                            </div>
                            <div className="mt-2 flex items-center justify-end">
                                <label className="text-xs text-slate-400 mr-2">Duração Penalidade Substituto (dias):</label>
                                <input 
                                    type="number" 
                                    value={localSettings.penaltySubstituteCertificateDays}
                                    onChange={(e) => setLocalSettings({...localSettings, penaltySubstituteCertificateDays: parseInt(e.target.value)})}
                                    className="w-16 border border-slate-300 bg-white text-slate-900 rounded p-1 text-sm"
                                />
                            </div>
                         </div>
                    </div>

                    <div className="p-3 bg-slate-50 rounded border border-slate-200">
                         <h4 className="text-sm font-bold text-red-800 mb-3 border-b pb-1">Por Falta</h4>
                         <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-slate-600">Bloquear Permutas Regulares</span>
                                <input 
                                    type="checkbox" 
                                    checked={localSettings.blockRegularSwapOnAbsence}
                                    onChange={(e) => setLocalSettings({...localSettings, blockRegularSwapOnAbsence: e.target.checked})}
                                    className="w-5 h-5 text-teal-600"
                                />
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-slate-600">Bloquear Folgas</span>
                                <input 
                                    type="checkbox" 
                                    checked={localSettings.blockLeavesOnAbsence}
                                    onChange={(e) => setLocalSettings({...localSettings, blockLeavesOnAbsence: e.target.checked})}
                                    className="w-5 h-5 text-teal-600"
                                />
                            </div>
                            <div className="mt-2 flex items-center justify-end">
                                <label className="text-xs text-slate-400 mr-2">Duração Penalidade Solicitante (dias):</label>
                                <input 
                                    type="number" 
                                    value={localSettings.penaltyAbsenceDays}
                                    onChange={(e) => setLocalSettings({...localSettings, penaltyAbsenceDays: parseInt(e.target.value)})}
                                    className="w-16 border border-slate-300 bg-white text-slate-900 rounded p-1 text-sm"
                                />
                            </div>
                            <hr className="my-2 border-slate-200"/>
                            
                            {/* New Substitute Rule */}
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-red-600 font-bold">Proibir como Substituto (Permutas)</span>
                                <div 
                                    onClick={() => setLocalSettings({...localSettings, blockSubstituteOnAbsence: !localSettings.blockSubstituteOnAbsence})}
                                    className={`relative w-10 h-5 rounded-full cursor-pointer transition-colors ${localSettings.blockSubstituteOnAbsence ? 'bg-red-600' : 'bg-slate-300'}`}
                                >
                                    <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${localSettings.blockSubstituteOnAbsence ? 'translate-x-5' : ''}`}></div>
                                </div>
                            </div>
                            <div className="mt-2 flex items-center justify-end">
                                <label className="text-xs text-slate-400 mr-2">Duração Penalidade Substituto (dias):</label>
                                <input 
                                    type="number" 
                                    value={localSettings.penaltySubstituteAbsenceDays}
                                    onChange={(e) => setLocalSettings({...localSettings, penaltySubstituteAbsenceDays: parseInt(e.target.value)})}
                                    className="w-16 border border-slate-300 bg-white text-slate-900 rounded p-1 text-sm"
                                />
                            </div>
                         </div>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg border border-slate-100 p-6">
                <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center">
                    <History size={20} className="mr-2 text-indigo-500"/> Retroatividade
                </h3>
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-600">Bloquear Permutas Retroativas</span>
                        <input 
                            type="checkbox" 
                            checked={localSettings.blockRetroactiveSwaps}
                            onChange={(e) => setLocalSettings({...localSettings, blockRetroactiveSwaps: e.target.checked})}
                            className="w-5 h-5"
                        />
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-600">Bloquear Folgas Retroativas</span>
                        <input 
                            type="checkbox" 
                            checked={localSettings.blockRetroactiveLeaves}
                            onChange={(e) => setLocalSettings({...localSettings, blockRetroactiveLeaves: e.target.checked})}
                            className="w-5 h-5"
                        />
                    </div>
                </div>
            </div>

            <button 
                onClick={handleSaveSettings}
                className="w-full bg-teal-600 text-white py-3 rounded-lg font-bold shadow hover:bg-teal-700"
            >
                Salvar Configurações
            </button>
        </div>

        {/* Right Column: Rules Text Editor */}
        <div className="bg-white rounded-xl shadow-lg border border-slate-100 p-6 h-full flex flex-col">
            <h3 className="text-lg font-bold text-slate-800 mb-4">Texto de Regras e Normas</h3>
            
            <div className="mb-4 bg-indigo-50 p-4 rounded-lg border border-indigo-100">
                <label className="block text-sm font-bold text-indigo-800 mb-2 flex items-center">
                    <BrainCircuit size={18} className="mr-2"/> IA Assistant: Adicionar ou Refinar
                </label>
                <div className="flex gap-2">
                    <input 
                        type="text" 
                        value={aiPrompt}
                        onChange={(e) => setAiPrompt(e.target.value)}
                        placeholder="Ex: Regra sobre uso de EPIs..."
                        className="flex-1 border border-indigo-200 bg-white text-slate-900 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <button 
                        onClick={handleAiRefine}
                        disabled={loading}
                        className="bg-indigo-600 text-white px-4 py-2 rounded text-sm font-bold hover:bg-indigo-700 disabled:opacity-50"
                    >
                        {loading ? '...' : 'Gerar'}
                    </button>
                </div>
            </div>

            <textarea
                className="flex-1 w-full p-4 border border-slate-300 bg-white text-slate-900 rounded-lg font-mono text-sm focus:ring-2 focus:ring-teal-500 outline-none resize-none"
                value={content}
                onChange={(e) => setContent(e.target.value)}
            />
            <div className="mt-4 flex justify-end">
                <button 
                    onClick={handleSaveText}
                    className="flex items-center bg-teal-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-teal-700 shadow-md"
                >
                    <Save size={20} className="mr-2"/> Salvar Texto
                </button>
            </div>
        </div>
    </div>
  );
};