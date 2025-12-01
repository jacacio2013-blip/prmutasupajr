import React, { useState, useEffect } from 'react';
import { Login } from './components/Login';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { AdminPanel } from './components/AdminPanel';
import { UserProfile } from './components/UserProfile';
import { SignatureManager } from './components/SignatureManager';
import { RequestDocument } from './components/RequestDocument';
import { ConfirmModal } from './components/ConfirmModal';
import { AppState, RequestStatus, RequestType, Role, User, LeaveRequest, Absence, MedicalCertificate, SystemSettings, SignatureData } from './types';
import { DEFAULT_RULES, DEFAULT_SETTINGS } from './constants';
import { FileText, List, Trash2, PenTool, X, Check, AlertCircle, Download, Loader2 } from 'lucide-react';
import { requestNotificationPermission, sendNotification } from './services/notificationService';
import { 
  fetchAppState, 
  dbAddUser, dbUpdateUser, dbDeleteUser,
  dbAddRequest, dbUpdateRequest, dbDeleteRequest,
  dbAddAbsence, dbDeleteAbsence,
  dbAddCertificate, dbDeleteCertificate,
  dbUpdateSettings, dbUpdateRules
} from './services/dataService';

function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [appState, setAppState] = useState<AppState>({
      currentUser: null,
      users: [],
      requests: [],
      absences: [],
      medicalCertificates: [],
      rules: DEFAULT_RULES,
      settings: DEFAULT_SETTINGS
  });

  const [currentView, setCurrentView] = useState('dashboard');

  // Load Data from Supabase on Mount
  useEffect(() => {
    const loadData = async () => {
        setIsLoading(true);
        const data = await fetchAppState();
        setAppState(prev => ({
            ...prev,
            ...data,
            currentUser: null // Always logout on refresh/load for security in this model
        }));
        setIsLoading(false);
    };
    loadData();
    requestNotificationPermission();
  }, []);

  // Actions
  const handleLogin = (user: User) => {
    setAppState(prev => ({ ...prev, currentUser: user }));
    setCurrentView('dashboard');
    
    // Check pending swaps
    const pendingSwaps = appState.requests.filter(r => 
        r.status === RequestStatus.WAITING_SUBSTITUTE && 
        r.coveringEmployee && 
        r.coveringEmployee.toLowerCase() === user.name.toLowerCase()
    );

    if (pendingSwaps.length > 0) {
        setTimeout(() => {
            const count = pendingSwaps.length;
            sendNotification(
                count === 1 ? "Nova Solicitação de Cobertura" : `${count} Solicitações Pendentes`, 
                `Você tem pedidos de permuta aguardando sua aprovação.`,
                appState.settings.logoUrl || undefined
            );
        }, 1500);
    }
  };

  const handleLogout = () => {
    setAppState(prev => ({ ...prev, currentUser: null }));
  };

  // --- Wrapper Helpers to update Local State AND Database ---

  const handleCreateRequest = async (type: RequestType, dateStart: string, description: string, coveringEmployee?: string) => {
    const requester = appState.currentUser!;
    
    const requesterSignature: SignatureData = {
        name: requester.name,
        role: requester.role,
        corenOrMatricula: requester.coren || requester.matricula || '',
        date: new Date().toISOString(),
        signatureUrl: requester.signatureUrl!
    };

    const isSwap = type === RequestType.REGULAR_SWAP || type === RequestType.EXTRA_SWAP;
    const initialStatus = isSwap ? RequestStatus.WAITING_SUBSTITUTE : RequestStatus.PENDING;

    const newRequest: LeaveRequest = {
      // Supabase generates UUID, but we need one for UI immediately. 
      // Ideally we let DB generate, but for "Keep Logic" we generate here.
      id: crypto.randomUUID(), 
      userId: requester.id,
      userName: requester.name,
      userRole: requester.role,
      type,
      dateStart,
      description,
      coveringEmployee,
      status: initialStatus,
      createdAt: new Date().toISOString(),
      signatures: { requester: requesterSignature }
    };

    // Optimistic Update
    setAppState(prev => ({ ...prev, requests: [newRequest, ...prev.requests] }));
    
    // DB Update
    await dbAddRequest(newRequest);

    sendNotification("Solicitação Criada", `Sua solicitação de ${type} foi registrada.`, appState.settings.logoUrl || undefined);
  };

  const handleUpdateStatus = async (id: string, status: RequestStatus, note?: string) => {
    const updatedRequest = appState.requests.find(r => r.id === id);
    if (!updatedRequest || !appState.currentUser) return;
    
    const currentUser = appState.currentUser;
    const signatures = { ...updatedRequest.signatures };

    // Logic for attaching signatures
    if (status === RequestStatus.APPROVED) {
        signatures.manager = {
             name: currentUser.name,
             role: currentUser.role,
             corenOrMatricula: currentUser.coren || currentUser.matricula || '',
             date: new Date().toISOString(),
             signatureUrl: currentUser.signatureUrl!
        };
    } else if (updatedRequest.status === RequestStatus.WAITING_SUBSTITUTE && status === RequestStatus.PENDING) {
        signatures.substitute = {
            name: currentUser.name,
            role: currentUser.role,
            corenOrMatricula: currentUser.coren || currentUser.matricula || '',
            date: new Date().toISOString(),
            signatureUrl: currentUser.signatureUrl!
        };
    }

    const newReqData = { ...updatedRequest, status, adminNote: note, signatures };

    setAppState(prev => ({
        ...prev,
        requests: prev.requests.map(r => r.id === id ? newReqData : r)
    }));

    await dbUpdateRequest(newReqData);
  };

  const handleDeleteRequest = async (id: string) => {
      setAppState(prev => ({ ...prev, requests: prev.requests.filter(r => r.id !== id) }));
      await dbDeleteRequest(id);
  };

  const handleAddUser = async (user: User) => {
    // Generate ID if not present (though our form does it)
    const newUser = { ...user, id: user.id || crypto.randomUUID() };
    setAppState(prev => ({ ...prev, users: [...prev.users, newUser] }));
    await dbAddUser(newUser);
  };

  const handleUpdateUser = async (updatedUser: User) => {
    setAppState(prev => {
        const newUsers = prev.users.map(u => u.id === updatedUser.id ? updatedUser : u);
        let newCurrentUser = prev.currentUser;
        if (prev.currentUser?.id === updatedUser.id) newCurrentUser = updatedUser;
        return { ...prev, users: newUsers, currentUser: newCurrentUser };
    });
    await dbUpdateUser(updatedUser);
  };

  const handleDeleteUser = async (id: string) => {
      setAppState(prev => ({ ...prev, users: prev.users.filter(u => u.id !== id) }));
      await dbDeleteUser(id);
  };

  const handleUpdateUserTRE = async (userId: string, newAmount: number) => {
      const user = appState.users.find(u => u.id === userId);
      if (user) {
          const updated = { ...user, availableTREDays: newAmount };
          handleUpdateUser(updated); // Reuses DB call
      }
  };

  const handleUpdateRules = async (newContent: string) => {
    const newRules = { content: newContent, lastUpdated: new Date().toISOString() };
    setAppState(prev => ({ ...prev, rules: newRules }));
    await dbUpdateRules(newContent);
  };

  const handleUpdateSettings = async (newSettings: SystemSettings) => {
    setAppState(prev => ({ ...prev, settings: newSettings }));
    await dbUpdateSettings(newSettings);
  };

  const handleSaveAbsence = async (absence: Absence) => {
    const isNew = !appState.absences.find(a => a.id === absence.id);
    setAppState(prev => {
        if (!isNew) return { ...prev, absences: prev.absences.map(a => a.id === absence.id ? absence : a) };
        return { ...prev, absences: [absence, ...prev.absences] };
    });
    
    // Simple logic: we only support Add in DB wrapper for now in this rapid refactor
    // Real implementation would split Update/Insert or use Upsert
    await dbAddAbsence(absence);
  };

  const handleDeleteAbsence = async (id: string) => {
      setAppState(prev => ({ ...prev, absences: prev.absences.filter(a => a.id !== id) }));
      await dbDeleteAbsence(id);
  };

  const handleSaveCertificate = async (cert: MedicalCertificate) => {
      // Optimistic only for add
       setAppState(prev => ({ ...prev, medicalCertificates: [cert, ...prev.medicalCertificates] }));
       await dbAddCertificate(cert);
  };

  const handleDeleteCertificate = async (id: string) => {
      setAppState(prev => ({ ...prev, medicalCertificates: prev.medicalCertificates.filter(c => c.id !== id) }));
      await dbDeleteCertificate(id);
  };

  const handleSaveSignature = (url: string) => {
      if (appState.currentUser) {
          const updatedUser = { ...appState.currentUser, signatureUrl: url };
          handleUpdateUser(updatedUser);
      }
  };

  // Loading Screen
  if (isLoading) {
      return (
          <div className="h-screen w-full flex flex-col items-center justify-center bg-teal-800 text-white">
              <Loader2 size={48} className="animate-spin mb-4"/>
              <p className="text-xl font-bold">Carregando Sistema...</p>
              <p className="text-sm opacity-75">Sincronizando com Banco de Dados</p>
          </div>
      );
  }

  // Auth Guard
  if (!appState.currentUser) {
    return <Login users={appState.users} onLogin={handleLogin} settings={appState.settings} />;
  }

  // Render Views (Same as before)
  const renderContent = () => {
    switch (currentView) {
      case 'dashboard':
        return (
          <Dashboard 
            currentUser={appState.currentUser!} 
            allUsers={appState.users}
            onRequestCreate={handleCreateRequest} 
            settings={appState.settings}
            userAbsences={appState.absences.filter(a => a.userId === appState.currentUser!.id)}
            userCertificates={appState.medicalCertificates.filter(c => c.userId === appState.currentUser!.id)}
            userRequests={appState.requests.filter(r => r.userId === appState.currentUser!.id)}
            onChangeView={setCurrentView}
            allAbsences={appState.absences}
            allCertificates={appState.medicalCertificates}
          />
        );
      case 'my_requests':
        return (
            <MyRequests 
                requests={appState.requests} 
                currentUser={appState.currentUser!}
                onDelete={handleDeleteRequest} 
                onUpdateStatus={handleUpdateStatus}
                settings={appState.settings}
                onChangeView={setCurrentView}
            />
        );
      case 'signature':
        return <SignatureManager currentUser={appState.currentUser!} onSaveSignature={handleSaveSignature} />;
      case 'rules':
        return <RulesView rules={appState.rules} />;
      case 'profile':
        return <UserProfile currentUser={appState.currentUser!} onUpdateUser={handleUpdateUser} />;
      case 'admin_requests':
      case 'admin_employees':
      case 'admin_settings':
        return (
          <AdminPanel 
            appState={appState} 
            onUpdateStatus={handleUpdateStatus} 
            onAddUser={handleAddUser}
            onUpdateUser={handleUpdateUser}
            onDeleteUser={handleDeleteUser}
            onUpdateRules={handleUpdateRules}
            onSaveAbsence={handleSaveAbsence}
            onDeleteAbsence={handleDeleteAbsence}
            onSaveCertificate={handleSaveCertificate}
            onDeleteCertificate={handleDeleteCertificate}
            onUpdateUserTRE={handleUpdateUserTRE}
            onUpdateSettings={handleUpdateSettings}
            onDeleteRequest={handleDeleteRequest}
          />
        );
      default:
        return (
          <Dashboard 
            currentUser={appState.currentUser!} 
            allUsers={appState.users}
            onRequestCreate={handleCreateRequest}
            settings={appState.settings}
            userAbsences={appState.absences.filter(a => a.userId === appState.currentUser!.id)}
            userCertificates={appState.medicalCertificates.filter(c => c.userId === appState.currentUser!.id)}
            userRequests={appState.requests.filter(r => r.userId === appState.currentUser!.id)}
            onChangeView={setCurrentView}
            allAbsences={appState.absences}
            allCertificates={appState.medicalCertificates}
          />
        );
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-900">
      <Sidebar 
        currentUser={appState.currentUser} 
        currentView={currentView} 
        onChangeView={setCurrentView} 
        onLogout={handleLogout}
        settings={appState.settings} 
      />
      
      <main className="flex-1 ml-64 p-8 overflow-y-auto print:ml-0 print:p-0 print:overflow-visible">
        <div className="max-w-7xl mx-auto print:max-w-none">
          {renderContent()}
        </div>
      </main>
    </div>
  );
}

// Simple Sub-views (Copied to ensure scope consistency)
const MyRequests = ({ requests, currentUser, onDelete, onUpdateStatus, settings, onChangeView }: { 
    requests: LeaveRequest[], 
    currentUser: User, 
    onDelete: (id: string) => void,
    onUpdateStatus: (id: string, status: RequestStatus, note?: string) => void,
    settings: SystemSettings,
    onChangeView: (view: string) => void
}) => {
    const [activeTab, setActiveTab] = useState<'mine' | 'substitute'>('mine');
    const [viewDocument, setViewDocument] = useState<LeaveRequest | null>(null);
    const [filterDate, setFilterDate] = useState('');
    const [filterType, setFilterType] = useState('ALL');
    
    // Confirmation State
    const [confirmId, setConfirmId] = useState<string | null>(null);
    const [showSignatureAlert, setShowSignatureAlert] = useState(false);

    const myRequests = requests
        .filter(r => r.userId === currentUser.id)
        .filter(r => filterDate ? r.dateStart === filterDate : true)
        .filter(r => filterType !== 'ALL' ? r.type === filterType : true)
        .sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const substituteRequests = requests
        .filter(r => r.coveringEmployee === currentUser.name)
        .filter(r => filterDate ? r.dateStart === filterDate : true)
        .filter(r => filterType !== 'ALL' ? r.type === filterType : true)
        .sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const handleSubstituteSign = () => {
        if (!viewDocument) return;
        if (!currentUser.signatureUrl) {
            setShowSignatureAlert(true);
            return;
        }
        onUpdateStatus(viewDocument.id, RequestStatus.PENDING); 
        setViewDocument(null);
    };

    const handleRedirectSignature = () => {
        setShowSignatureAlert(false);
        setViewDocument(null);
        onChangeView('signature');
    };

    const handleSubstituteReject = () => {
        if (!viewDocument) return;
        const reason = prompt("Motivo da Recusa:");
        if (reason) {
            onUpdateStatus(viewDocument.id, RequestStatus.REJECTED, `Recusado pelo substituto: ${reason}`);
            setViewDocument(null);
        }
    };

    const generatePDF = () => {
        const element = document.getElementById('document-preview-area');
        if (!element) return;
        const opt = { margin: 10, filename: `documento_${viewDocument?.id}.pdf`, image: { type: 'jpeg', quality: 0.98 }, html2canvas: { scale: 2 }, jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' } };
        // @ts-ignore
        if (window.html2pdf) { window.html2pdf().set(opt).from(element).save(); } else { alert("Biblioteca PDF não carregada. Tente imprimir com Ctrl+P."); window.print(); }
    };

    return (
        <div className="bg-white rounded-xl shadow-lg border border-slate-100 overflow-hidden">
             <ConfirmModal isOpen={!!confirmId} onClose={() => setConfirmId(null)} onConfirm={() => { if(confirmId) onDelete(confirmId); }} title="Cancelar Solicitação" message="Tem certeza que deseja cancelar esta solicitação? Ao confirmar, o registro será apagado e sua cota mensal será restaurada automaticamente." />
             <ConfirmModal isOpen={showSignatureAlert} onClose={() => setShowSignatureAlert(false)} onConfirm={handleRedirectSignature} title="Assinatura Digital Obrigatória" message="Para assinar e aceitar esta substituição, você precisa cadastrar sua assinatura digital. Deseja ir para a tela de cadastro agora?" />
             <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row gap-4 justify-between items-center bg-slate-50 print:hidden">
                  <div className="flex gap-2">
                    <button onClick={() => setActiveTab('mine')} className={`px-4 py-2 text-sm font-bold rounded-lg transition-colors ${activeTab === 'mine' ? 'bg-teal-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'}`}>Minhas Solicitações</button>
                    <button onClick={() => setActiveTab('substitute')} className={`px-4 py-2 text-sm font-bold rounded-lg transition-colors flex items-center ${activeTab === 'substitute' ? 'bg-teal-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'}`}>
                        Solicitações de Cobertura
                        {requests.filter(r => r.coveringEmployee === currentUser.name && r.status === RequestStatus.WAITING_SUBSTITUTE).length > 0 && (<span className="ml-2 bg-red-500 text-white text-[10px] px-1.5 rounded-full">{requests.filter(r => r.coveringEmployee === currentUser.name && r.status === RequestStatus.WAITING_SUBSTITUTE).length}</span>)}
                    </button>
                  </div>
                  <div className="flex gap-2 items-center">
                      <div className="flex items-center gap-1 bg-white border border-slate-300 rounded-md px-2 py-1">
                          <List size={14} className="text-slate-400"/>
                          <select className="text-sm bg-transparent outline-none text-slate-700" value={filterType} onChange={(e) => setFilterType(e.target.value)}>
                              <option value="ALL">Todos os Tipos</option>
                              {Object.values(RequestType).filter(t => t !== RequestType.OTHER).map(t => (<option key={t} value={t}>{t}</option>))}
                          </select>
                      </div>
                      <input type="date" className="text-sm bg-white border border-slate-300 rounded-md px-2 py-1 outline-none text-slate-700" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} />
                      {filterDate && <button onClick={() => setFilterDate('')} className="text-red-500 hover:text-red-700"><X size={16}/></button>}
                  </div>
             </div>
             <div className="p-6">
                 {activeTab === 'mine' ? (
                     myRequests.length === 0 ? (<p className="text-slate-500 text-center py-8">Nenhuma solicitação encontrada.</p>) : (
                         <div className="space-y-4">
                             {myRequests.map(req => (
                                 <div key={req.id} className="p-4 rounded-lg border border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center hover:bg-slate-50 transition-colors gap-4">
                                     <div>
                                         <p className="font-bold text-teal-800">{req.type}</p>
                                         <p className="text-sm text-slate-600 font-medium">Data: {new Date(req.dateStart).toLocaleDateString('pt-BR')}</p>
                                         <p className="text-xs text-slate-500 mt-1 max-w-lg">{req.description}</p>
                                     </div>
                                     <div className="text-right flex flex-col items-end gap-2 w-full md:w-auto">
                                         <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${req.status === RequestStatus.APPROVED ? 'bg-green-100 text-green-700' : req.status === RequestStatus.REJECTED ? 'bg-red-100 text-red-700' : req.status === RequestStatus.WAITING_SUBSTITUTE ? 'bg-orange-100 text-orange-700' : 'bg-yellow-100 text-yellow-700'}`}>{req.status}</span>
                                         <div className="flex items-center gap-2 print:hidden">
                                             <button onClick={() => setViewDocument(req)} className="px-3 py-1 text-xs bg-blue-50 text-blue-600 hover:bg-blue-100 rounded font-bold border border-blue-200 flex items-center" title="Ver Documento"><FileText size={14} className="mr-1"/> Documento</button>
                                             {(req.status === RequestStatus.WAITING_SUBSTITUTE || req.status === RequestStatus.PENDING) && (<button onClick={() => setConfirmId(req.id)} className="p-1.5 text-slate-400 hover:text-red-600 rounded-full hover:bg-red-50 transition-colors" title="Excluir e Restaurar Saldo"><Trash2 size={16} /></button>)}
                                         </div>
                                     </div>
                                 </div>
                             ))}
                         </div>
                     )
                 ) : (
                     substituteRequests.length === 0 ? (<p className="text-slate-500 text-center py-8">Nenhuma solicitação de cobertura encontrada.</p>) : (
                         <div className="space-y-4">
                             {substituteRequests.map(req => (
                                 <div key={req.id} className="p-4 rounded-lg border border-slate-200 flex justify-between items-center hover:bg-slate-50 transition-colors relative">
                                     {req.status === RequestStatus.WAITING_SUBSTITUTE && (<div className="absolute top-2 right-2 flex h-3 w-3"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span><span className="relative inline-flex rounded-full h-3 w-3 bg-orange-500"></span></div>)}
                                     <div>
                                         <p className="font-bold text-slate-800">Solicitante: {req.userName}</p>
                                         <p className="text-sm text-teal-700 font-medium">{req.type}</p>
                                         <p className="text-sm text-slate-600">Data: {new Date(req.dateStart).toLocaleDateString('pt-BR')}</p>
                                     </div>
                                     <div className="text-right">
                                         <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase mb-2 block ${req.status === RequestStatus.APPROVED ? 'bg-green-100 text-green-700' : req.status === RequestStatus.REJECTED ? 'bg-red-100 text-red-700' : req.status === RequestStatus.WAITING_SUBSTITUTE ? 'bg-orange-100 text-orange-700' : 'bg-yellow-100 text-yellow-700'}`}>{req.status}</span>
                                         <button onClick={() => setViewDocument(req)} className="text-sm bg-blue-100 text-blue-700 px-3 py-1 rounded hover:bg-blue-200 font-medium flex items-center justify-end w-full print:hidden"><FileText size={14} className="mr-1"/> {req.status === RequestStatus.WAITING_SUBSTITUTE ? 'Revisar & Assinar' : 'Ver Documento'}</button>
                                     </div>
                                 </div>
                             ))}
                         </div>
                     )
                 )}
             </div>
             {viewDocument && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in print:block print:bg-white print:p-0">
                    <div className="bg-white w-full max-w-4xl rounded-xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col print:shadow-none print:max-w-none print:max-h-none print:h-auto print:rounded-none">
                        <div className="bg-slate-800 p-4 flex justify-between items-center text-white print:hidden"><h3 className="font-bold flex items-center"><FileText className="mr-2"/> Revisão de Documento</h3><button onClick={() => setViewDocument(null)}><X size={24}/></button></div>
                        <div className="p-6 overflow-y-auto bg-slate-100 flex-1 print:p-0 print:bg-white print:overflow-visible"><div id="document-preview-area"><RequestDocument request={viewDocument} settings={settings} /></div></div>
                        <div className="p-4 border-t border-slate-200 bg-white flex justify-between gap-3 print:hidden">
                             <div className="flex gap-3"><button onClick={generatePDF} className="px-4 py-2 bg-slate-800 text-white font-bold rounded hover:bg-slate-900 flex items-center"><Download size={18} className="mr-2"/> Baixar PDF</button></div>
                             {activeTab === 'substitute' && viewDocument.status === RequestStatus.WAITING_SUBSTITUTE && (
                                <div className="flex gap-3"><button onClick={handleSubstituteReject} className="px-4 py-2 bg-red-100 text-red-700 font-bold rounded-lg hover:bg-red-200 flex items-center"><X size={18} className="mr-2"/> Recusar</button><button onClick={handleSubstituteSign} className="px-6 py-2 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 flex items-center"><PenTool size={18} className="mr-2"/> Assinar e Aceitar</button></div>
                             )}
                        </div>
                    </div>
                </div>
             )}
        </div>
    );
};

const RulesView = ({ rules }: { rules: any }) => (
  <div className="bg-white rounded-xl shadow-lg border border-slate-100 p-8 print:shadow-none print:border-none">
     <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center border-b pb-4 print:hidden"><FileText className="mr-2"/> Normas e Regras - UPA José Rodrigues</h2>
    <div className="prose prose-teal max-w-none text-slate-700 whitespace-pre-wrap leading-relaxed">{rules.content}</div>
    <div className="mt-8 text-xs text-slate-400 italic">Última atualização: {new Date(rules.lastUpdated).toLocaleString()}</div>
  </div>
);

export default App;