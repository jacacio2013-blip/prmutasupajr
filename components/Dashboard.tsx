import React, { useState, useEffect, useMemo } from 'react';
import { User, RequestType, RequestStatus, SystemSettings, Absence, MedicalCertificate, LeaveRequest, ContractType, SignatureData } from '../types';
import { Calendar as CalendarIcon, RefreshCw, Star, AlertCircle, CheckCircle2, ChevronLeft, ChevronRight, X, CalendarDays, Vote, Cake, Activity, CalendarCheck, PlusCircle, Filter, Search, UserCheck, FileText, PenTool } from 'lucide-react';
import { RequestDocument } from './RequestDocument';
import { ConfirmModal } from './ConfirmModal';

interface DashboardProps {
  currentUser: User;
  allUsers: User[];
  onRequestCreate: (type: RequestType, dateStart: string, description: string, coveringEmployee?: string) => void;
  settings: SystemSettings;
  userAbsences: Absence[];
  userCertificates: MedicalCertificate[];
  userRequests: LeaveRequest[];
  onChangeView: (view: string) => void; 
  // Global lists needed for substitute validation
  allAbsences?: Absence[];
  allCertificates?: MedicalCertificate[];
}

export const Dashboard: React.FC<DashboardProps> = ({ currentUser, allUsers, onRequestCreate, settings, userAbsences, userCertificates, userRequests, onChangeView, allAbsences = [], allCertificates = [] }) => {
  // --- View State (Filters) ---
  const [viewMonth, setViewMonth] = useState(new Date().getMonth() + 1);
  const [viewYear, setViewYear] = useState(new Date().getFullYear());
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [showDocPreview, setShowDocPreview] = useState(false);

  // --- Form State ---
  const [formData, setFormData] = useState({
    type: RequestType.REGULAR_SWAP,
    description: '',
    coveringEmployee: ''
  });
  
  // Custom Calendar State for Form
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [calendarViewDate, setCalendarViewDate] = useState(new Date()); 
  
  // Vacation State for Form
  const [vacationMonth, setVacationMonth] = useState(new Date().getMonth() + 1);
  const [vacationYear, setVacationYear] = useState(new Date().getFullYear());

  // Substitute Search State
  const [substituteSearchOpen, setSubstituteSearchOpen] = useState(false);
  
  const [successMsg, setSuccessMsg] = useState('');

  // Signature Validation State
  const [showSignatureAlert, setShowSignatureAlert] = useState(false);

  const months = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];

  // Logic: Check Birthday Eligibility
  const checkBirthdayEligibility = () => {
      if (!currentUser.birthday) return false;
      const today = new Date();
      const birthDate = new Date(currentUser.birthday + 'T00:00:00');
      const birthMonth = birthDate.getMonth(); // 0-11
      
      // Eligibility: Current Month must be ONE MONTH BEFORE Birthday Month
      // Handle January (0) -> Previous is December (11)
      const eligibleMonth = birthMonth === 0 ? 11 : birthMonth - 1;
      
      return today.getMonth() === eligibleMonth;
  };
  
  const isBirthdayEligible = checkBirthdayEligibility();

  // Determine Limits based on Contract Type
  const currentLimits = currentUser.contractType === ContractType.TEMPORARY 
    ? settings.limits.temporary 
    : settings.limits.statutory;

  // Filter Substitute Candidates
  const eligibleSubstitutes = useMemo(() => {
    // Current date normalized to midnight
    const today = new Date();
    today.setHours(0,0,0,0);

    return allUsers.filter(u => {
        // Basic Checks
        if (u.id === currentUser.id) return false;
        if (u.role !== currentUser.role) return false;

        // Rule: Block if recent Certificate (Substitute)
        if (settings.blockSubstituteOnCertificate) {
             const userCerts = allCertificates.filter(c => c.userId === u.id);
             // Sort by dateEnd desc
             const latestCert = userCerts.sort((a, b) => new Date(b.dateEnd).getTime() - new Date(a.dateEnd).getTime())[0];
             
             if (latestCert) {
                 // Force parsing in local time or specific date without TZ issues
                 const certEndDate = new Date(latestCert.dateEnd + 'T00:00:00');
                 const releaseDate = new Date(certEndDate);
                 releaseDate.setDate(releaseDate.getDate() + settings.penaltySubstituteCertificateDays);
                 
                 // If Today is BEFORE Release Date, user is still blocked
                 if (today < releaseDate) return false; 
             }
        }

        // Rule: Block if recent Absence (Substitute)
        if (settings.blockSubstituteOnAbsence) {
            const userAbsences = allAbsences.filter(a => a.userId === u.id);
            // Sort by date desc
            const latestAbsence = userAbsences.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
            
            if (latestAbsence) {
                const absDate = new Date(latestAbsence.date + 'T00:00:00');
                const releaseDate = new Date(absDate);
                releaseDate.setDate(releaseDate.getDate() + settings.penaltySubstituteAbsenceDays);
                
                if (today < releaseDate) return false; // Blocked
            }
        }

        return true;
    });
  }, [allUsers, currentUser, settings, allCertificates, allAbsences]);

  const filteredSubstitutes = useMemo(() => {
     if (!formData.coveringEmployee) return eligibleSubstitutes;
     return eligibleSubstitutes.filter(u => 
        u.name.toLowerCase().includes(formData.coveringEmployee.toLowerCase())
     );
  }, [eligibleSubstitutes, formData.coveringEmployee]);

  // Helper: Get usage count for a specific type in a specific month/year
  const getUsageForMonth = (type: RequestType, month: number, year: number) => {
      const activeRequests = userRequests.filter(r => r.status !== RequestStatus.REJECTED);
      return activeRequests.filter(r => {
          const rDate = new Date(r.dateStart);
          return r.type === type && rDate.getMonth() === (month - 1) && rDate.getFullYear() === year;
      }).length;
  };

  // Usage Calculation based on VIEW filters (for cards)
  const usageStats = useMemo(() => {
      return {
          scaleLeaves: getUsageForMonth(RequestType.SCALE_LEAVE, viewMonth, viewYear),
          regularSwaps: getUsageForMonth(RequestType.REGULAR_SWAP, viewMonth, viewYear),
          extraSwaps: getUsageForMonth(RequestType.EXTRA_SWAP, viewMonth, viewYear)
      };
  }, [userRequests, viewMonth, viewYear]);


  // Helper to generate calendar grid for the FORM
  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month, 1).getDay();
  };

  // CALENDAR RENDERER for Form
  const renderFormCalendar = () => {
    const year = calendarViewDate.getFullYear();
    const month = calendarViewDate.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    const days = [];
    const today = new Date();
    today.setHours(0,0,0,0);

    const toggleDate = (dateStr: string) => {
        // Enforce Monthly Limits Check BEFORE selecting
        if (!selectedDates.includes(dateStr)) {
            // Check Month of Selection
            const selDate = new Date(dateStr);
            const selMonth = selDate.getMonth() + 1;
            const selYear = selDate.getFullYear();

            // Usage so far in DB
            let currentUsage = getUsageForMonth(formData.type, selMonth, selYear);
            
            // + Usage currently selected in this session for the same month
            const selectedInSameMonth = selectedDates.filter(d => {
                const dObj = new Date(d);
                return dObj.getMonth() + 1 === selMonth && dObj.getFullYear() === selYear;
            }).length;

            const totalProjected = currentUsage + selectedInSameMonth + 1;

            let limit = 999;
            if (formData.type === RequestType.SCALE_LEAVE) limit = currentLimits.maxScaleLeaves;
            if (formData.type === RequestType.REGULAR_SWAP) limit = currentLimits.maxRegularSwaps;
            if (formData.type === RequestType.EXTRA_SWAP) limit = currentLimits.maxExtraSwaps;

            if (totalProjected > limit) {
                alert(`Limite mensal atingido para ${selMonth}/${selYear}!\n\nVocê já usou: ${currentUsage}\nSelecionados agora: ${selectedInSameMonth}\nLimite: ${limit}`);
                return;
            }
        }

        // Logic: Only allow dates from same month if multiple
        if (selectedDates.length > 0) {
            const firstDate = new Date(selectedDates[0]);
            const newDate = new Date(dateStr);
            if (firstDate.getMonth() !== newDate.getMonth()) {
                alert("Selecione apenas dias do mesmo mês para um único pedido.");
                return;
            }
        }
        
        if (selectedDates.includes(dateStr)) {
            setSelectedDates(selectedDates.filter(d => d !== dateStr));
        } else {
            setSelectedDates([...selectedDates, dateStr].sort());
        }
    };

    // Blanks before 1st
    for (let i = 0; i < firstDay; i++) {
        days.push(<div key={`empty-${i}`} className="h-10"></div>);
    }

    // Days
    for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month, day);
        const dateStr = date.toISOString().split('T')[0];
        const isSelected = selectedDates.includes(dateStr);
        const isPast = date < today;
        
        // Retroactive Check
        const isSwap = formData.type === RequestType.REGULAR_SWAP || formData.type === RequestType.EXTRA_SWAP;
        const isBlockedRetro = isSwap ? settings.blockRetroactiveSwaps : settings.blockRetroactiveLeaves;
        const isDisabled = isPast && isBlockedRetro;

        days.push(
            <button
                key={day}
                type="button"
                disabled={isDisabled}
                onClick={() => toggleDate(dateStr)}
                className={`h-10 w-10 rounded-full flex items-center justify-center text-sm font-medium transition-all
                    ${isDisabled ? 'opacity-25 cursor-not-allowed bg-slate-100 text-slate-400' : 'hover:bg-teal-50'}
                    ${isSelected ? 'bg-teal-600 text-white hover:bg-teal-700 shadow-md transform scale-105' : 'text-slate-700'}
                    ${!isDisabled && !isSelected && isPast ? 'text-slate-400' : ''}
                `}
            >
                {day}
            </button>
        );
    }
    return days;
  };

  // Real-time Rule Check
  const getBlockingReason = () => {
      const today = new Date();
      const currentDay = today.getDate();

      // 1. Check Window (Only for Leaves, Swaps are exempt)
      const isSwap = formData.type === RequestType.REGULAR_SWAP || formData.type === RequestType.EXTRA_SWAP;
      if (!isSwap) {
          if (formData.type === RequestType.VACATION) {
             const vConfig = settings.vacationConfig.openWindow;
             if (vConfig.year !== vacationYear || vConfig.month !== vacationMonth || 
                 currentDay < vConfig.startDay || currentDay > vConfig.endDay) {
                 return `Solicitação de férias bloqueada. Janela aberta apenas de ${vConfig.startDay} a ${vConfig.endDay} de ${new Date(vConfig.year, vConfig.month-1).toLocaleString('default', {month:'long'})}/${vConfig.year}.`;
             }
          } else {
             // Normal Leaves Window
             if (currentDay < settings.requestWindowStart || currentDay > settings.requestWindowEnd) {
                 return `Solicitações de folga permitidas apenas entre os dias ${settings.requestWindowStart} e ${settings.requestWindowEnd} de cada mês.`;
             }
          }
      }

      // 2. Check Global Swap Block
      if (isSwap && settings.globalSwapBlockUntil) {
          const blockDate = new Date(settings.globalSwapBlockUntil);
          if (today < blockDate) {
              return `Permutas bloqueadas temporariamente pela administração até ${blockDate.toLocaleDateString()}.`;
          }
      }

      // 3. Check Penalties (Certificates)
      if (settings.blockExtraSwapOnCertificate && formData.type === RequestType.EXTRA_SWAP) {
           const latestCert = userCertificates.sort((a,b) => new Date(b.dateEnd).getTime() - new Date(a.dateEnd).getTime())[0];
           if (latestCert) {
               const release = new Date(latestCert.dateEnd);
               release.setDate(release.getDate() + settings.penaltyCertificateDays);
               if (today < release) return `Permuta Extra bloqueada devido a atestado recente. Liberado em: ${release.toLocaleDateString()}.`;
           }
      }
      if (settings.blockLeavesOnCertificate && !isSwap) {
            const latestCert = userCertificates.sort((a,b) => new Date(b.dateEnd).getTime() - new Date(a.dateEnd).getTime())[0];
            if (latestCert) {
                const release = new Date(latestCert.dateEnd);
                release.setDate(release.getDate() + settings.penaltyCertificateDays);
                if (today < release) return `Folgas bloqueadas devido a atestado recente. Liberado em: ${release.toLocaleDateString()}.`;
            }
      }

      // 4. Check Penalties (Absence)
      if (settings.blockRegularSwapOnAbsence && formData.type === RequestType.REGULAR_SWAP) {
            const latestAbs = userAbsences.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
            if (latestAbs) {
                const release = new Date(latestAbs.date);
                release.setDate(release.getDate() + settings.penaltyAbsenceDays);
                if (today < release) return `Permuta Regular bloqueada devido a falta recente. Liberado em: ${release.toLocaleDateString()}.`;
            }
      }
      if (settings.blockLeavesOnAbsence && !isSwap) {
            const latestAbs = userAbsences.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
            if (latestAbs) {
                const release = new Date(latestAbs.date);
                release.setDate(release.getDate() + settings.penaltyAbsenceDays);
                if (today < release) return `Folgas bloqueadas devido a falta recente. Liberado em: ${release.toLocaleDateString()}.`;
            }
      }

      return null;
  };

  const blockingReason = getBlockingReason();

  const handleOpenForm = () => {
      setIsFormOpen(true);
      setSuccessMsg('');
      setFormData({ type: RequestType.REGULAR_SWAP, description: '', coveringEmployee: '' });
      setSelectedDates([]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Signature Check
    if (!currentUser.signatureUrl) {
        setShowSignatureAlert(true);
        return;
    }

    if (!blockingReason) {
        // Show Preview Document First
        setShowDocPreview(true);
    }
  };

  const handleRedirectSignature = () => {
      setShowSignatureAlert(false);
      setIsFormOpen(false);
      onChangeView('signature');
  };

  const confirmSubmission = () => {
    if (formData.type === RequestType.VACATION) {
        // Single request for the whole month block (conceptually)
        // Usually vacation is a range, but simplified here to Month/Year start
        const dateStr = `${vacationYear}-${String(vacationMonth).padStart(2, '0')}-01`;
        onRequestCreate(formData.type, dateStr, formData.description, formData.coveringEmployee);
    } else {
        // Create INDIVIDUAL requests for each selected date to properly consume quota
        selectedDates.forEach(date => {
            onRequestCreate(formData.type, date, formData.description, formData.coveringEmployee);
        });
    }

    setShowDocPreview(false);
    setIsFormOpen(false);
    setSuccessMsg('Solicitação enviada com sucesso! Aguarde a aprovação.');
    setTimeout(() => setSuccessMsg(''), 5000);
  };

  // Quick Stats for Cards
  const statCards = [
      { 
        label: 'Permutas Extras', 
        used: usageStats.extraSwaps, 
        limit: currentLimits.maxExtraSwaps, 
        icon: RefreshCw, 
        color: 'text-blue-600', 
        bg: 'bg-blue-50' 
      },
      { 
        label: 'Permutas Regulares', 
        used: usageStats.regularSwaps, 
        limit: currentLimits.maxRegularSwaps, 
        icon: RefreshCw, 
        color: 'text-teal-600', 
        bg: 'bg-teal-50' 
      },
      { 
        label: 'Folgas da Escala', 
        used: usageStats.scaleLeaves, 
        limit: currentLimits.maxScaleLeaves, 
        icon: CalendarCheck, 
        color: 'text-indigo-600', 
        bg: 'bg-indigo-50' 
      },
      { 
        label: 'Folga TRE', 
        text: `${currentUser.availableTREDays} dias`, 
        subtext: 'Disponíveis', 
        icon: Vote, 
        color: 'text-yellow-600', 
        bg: 'bg-yellow-50' 
      },
      { 
        label: 'Aniversário', 
        text: isBirthdayEligible ? 'Elegível' : 'Não Elegível', 
        subtext: currentUser.birthday ? new Date(currentUser.birthday + 'T00:00:00').toLocaleDateString('pt-BR') : '--', 
        icon: Cake, 
        color: isBirthdayEligible ? 'text-pink-600' : 'text-slate-400', 
        bg: isBirthdayEligible ? 'bg-pink-50' : 'bg-slate-50' 
      },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      <ConfirmModal 
         isOpen={showSignatureAlert}
         onClose={() => setShowSignatureAlert(false)}
         onConfirm={handleRedirectSignature}
         title="Assinatura Digital Obrigatória"
         message="Para prosseguir com a solicitação, você precisa cadastrar sua assinatura digital. Deseja ir para a tela de cadastro agora?"
      />

      {/* Header & Filter */}
      <div className="flex flex-col md:flex-row justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-slate-100">
          <div>
              <h2 className="text-2xl font-bold text-slate-800">Olá, {currentUser.name.split(' ')[0]}</h2>
              <p className="text-slate-500">Painel de Controle e Solicitações</p>
          </div>
          
          <div className="flex items-center gap-4 mt-4 md:mt-0 bg-slate-50 p-2 rounded-lg border border-slate-200">
              <div className="flex items-center text-slate-600 text-sm font-bold mr-2">
                  <Filter size={16} className="mr-1"/> Filtrar Saldos:
              </div>
              <select 
                value={viewMonth}
                onChange={(e) => setViewMonth(parseInt(e.target.value))}
                className="bg-white border border-slate-300 text-slate-900 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                  {months.map((m, i) => (
                      <option key={i} value={i+1} disabled={new Date(viewYear, i) < new Date(new Date().getFullYear(), new Date().getMonth() - 1)}>{m}</option>
                  ))}
              </select>
              <select 
                value={viewYear}
                onChange={(e) => setViewYear(parseInt(e.target.value))}
                className="bg-white border border-slate-300 text-slate-900 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                  <option value={2024}>2024</option>
                  <option value={2025}>2025</option>
              </select>
          </div>
      </div>

      {successMsg && (
        <div className="bg-green-100 border border-green-200 text-green-800 p-4 rounded-lg flex items-center shadow-sm">
          <CheckCircle2 size={20} className="mr-2" />
          {successMsg}
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {statCards.map((stat, index) => (
            <div key={index} className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-3 ${stat.bg} ${stat.color}`}>
                    <stat.icon size={20} />
                </div>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">{stat.label}</h3>
                {stat.text ? (
                    <div>
                        <p className={`text-lg font-bold ${stat.color}`}>{stat.text}</p>
                        <p className="text-xs text-slate-400">{stat.subtext}</p>
                    </div>
                ) : (
                    <div>
                        <div className="flex items-end gap-1">
                            <span className={`text-2xl font-bold ${stat.used! >= stat.limit! ? 'text-red-500' : 'text-slate-800'}`}>{stat.used}</span>
                            <span className="text-sm text-slate-400 mb-1">/ {stat.limit}</span>
                        </div>
                        <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2 overflow-hidden">
                            <div 
                                className={`h-full rounded-full ${stat.used! >= stat.limit! ? 'bg-red-500' : stat.color.replace('text', 'bg')}`} 
                                style={{ width: `${Math.min((stat.used! / stat.limit!) * 100, 100)}%` }}
                            ></div>
                        </div>
                    </div>
                )}
            </div>
        ))}
      </div>

      {/* Main Action Area */}
      <div className="bg-gradient-to-r from-teal-800 to-teal-600 rounded-2xl shadow-xl p-8 text-white flex flex-col md:flex-row items-center justify-between">
          <div>
              <h2 className="text-2xl font-bold mb-2">Precisa solicitar folga ou permuta?</h2>
              <p className="text-teal-100 max-w-lg">
                  Utilize nosso formulário digital para enviar sua solicitação diretamente para a gerência e coordenação.
                  Lembre-se de verificar seus saldos acima antes de solicitar.
              </p>
          </div>
          <button 
            onClick={handleOpenForm}
            className="mt-6 md:mt-0 bg-white text-teal-800 px-8 py-4 rounded-xl font-bold shadow-lg hover:bg-teal-50 transition-transform transform hover:scale-105 flex items-center"
          >
              <PlusCircle size={24} className="mr-2"/> Nova Solicitação
          </button>
      </div>

      {/* Request Form Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
                <div className="bg-teal-600 p-6 flex justify-between items-center text-white sticky top-0 z-10">
                    <h3 className="text-xl font-bold flex items-center"><FileText className="mr-2"/> Nova Solicitação</h3>
                    <button onClick={() => setIsFormOpen(false)} className="hover:bg-teal-700 p-1 rounded-full"><X size={24}/></button>
                </div>
                
                <form onSubmit={handleSubmit} className="p-8 space-y-6">
                    
                    {blockingReason && (
                        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded text-red-700 font-medium flex items-start">
                            <AlertCircle size={20} className="mr-2 mt-0.5 flex-shrink-0"/>
                            <p>{blockingReason}</p>
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Tipo de Solicitação</label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {Object.values(RequestType).filter(t => t !== RequestType.OTHER).map((t) => (
                                <button
                                    key={t}
                                    type="button"
                                    onClick={() => {
                                        setFormData({...formData, type: t});
                                        setSelectedDates([]); // Reset dates on type change
                                    }}
                                    className={`p-3 rounded-lg border text-sm font-medium transition-all text-left flex items-center
                                        ${formData.type === t 
                                            ? 'border-teal-500 bg-teal-50 text-teal-800 ring-1 ring-teal-500' 
                                            : 'border-slate-200 text-slate-600 hover:border-teal-300'
                                        }`}
                                >
                                    <div className={`w-3 h-3 rounded-full mr-3 ${formData.type === t ? 'bg-teal-500' : 'bg-slate-300'}`}></div>
                                    {t}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Date Selection Area */}
                    <div>
                         <label className="block text-sm font-bold text-slate-700 mb-2">
                             {formData.type === RequestType.VACATION ? 'Período de Férias' : 'Datas Desejadas'}
                         </label>
                         
                         {formData.type === RequestType.VACATION ? (
                             <div className="grid grid-cols-2 gap-4">
                                 <div>
                                     <label className="text-xs text-slate-500 font-bold mb-1 block">Mês</label>
                                     <select 
                                        className="w-full border border-slate-300 bg-white text-slate-900 p-3 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none"
                                        value={vacationMonth}
                                        onChange={(e) => setVacationMonth(parseInt(e.target.value))}
                                     >
                                        {months.map((m, i) => <option key={i} value={i+1}>{m}</option>)}
                                     </select>
                                 </div>
                                 <div>
                                     <label className="text-xs text-slate-500 font-bold mb-1 block">Ano</label>
                                     <select 
                                        className="w-full border border-slate-300 bg-white text-slate-900 p-3 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none"
                                        value={vacationYear}
                                        onChange={(e) => setVacationYear(parseInt(e.target.value))}
                                     >
                                        <option value={2024}>2024</option>
                                        <option value={2025}>2025</option>
                                     </select>
                                 </div>
                             </div>
                         ) : (
                             // Multi-Date Picker Trigger
                             <div className="relative">
                                 <button 
                                    type="button"
                                    onClick={() => setIsCalendarOpen(!isCalendarOpen)}
                                    className="w-full border border-slate-300 bg-white text-slate-900 p-3 rounded-lg flex justify-between items-center hover:bg-slate-50"
                                 >
                                     <span className={selectedDates.length === 0 ? 'text-slate-400' : 'text-slate-900 font-medium'}>
                                         {selectedDates.length === 0 
                                            ? 'Selecionar dias no calendário...' 
                                            : `${selectedDates.length} dia(s) selecionado(s)`}
                                     </span>
                                     <CalendarDays className="text-teal-600"/>
                                 </button>
                                 
                                 {/* Calendar Popover */}
                                 {isCalendarOpen && (
                                     <div className="absolute top-full left-0 mt-2 w-full bg-white shadow-2xl rounded-xl border border-slate-200 z-20 p-4">
                                         <div className="flex justify-between items-center mb-4">
                                             <button type="button" onClick={() => setCalendarViewDate(new Date(calendarViewDate.setMonth(calendarViewDate.getMonth() - 1)))}><ChevronLeft size={20}/></button>
                                             <span className="font-bold text-slate-800 capitalize">
                                                 {calendarViewDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                                             </span>
                                             <button type="button" onClick={() => setCalendarViewDate(new Date(calendarViewDate.setMonth(calendarViewDate.getMonth() + 1)))}><ChevronRight size={20}/></button>
                                         </div>
                                         <div className="grid grid-cols-7 gap-1 text-center mb-2">
                                             {['D','S','T','Q','Q','S','S'].map(d => <span key={d} className="text-xs font-bold text-slate-400">{d}</span>)}
                                         </div>
                                         <div className="grid grid-cols-7 gap-1">
                                             {renderFormCalendar()}
                                         </div>
                                         <div className="mt-4 flex justify-end">
                                             <button 
                                                type="button" 
                                                onClick={() => setIsCalendarOpen(false)}
                                                className="bg-teal-600 text-white px-4 py-2 rounded-lg text-sm font-bold"
                                             >
                                                 Confirmar Datas
                                             </button>
                                         </div>
                                     </div>
                                 )}
                                 
                                 {selectedDates.length > 0 && (
                                     <div className="flex flex-wrap gap-2 mt-3">
                                         {selectedDates.map(d => (
                                             <span key={d} className="bg-teal-50 text-teal-800 text-xs font-bold px-2 py-1 rounded flex items-center">
                                                 {new Date(d).toLocaleDateString('pt-BR')}
                                                 <button type="button" onClick={() => setSelectedDates(selectedDates.filter(x => x !== d))} className="ml-1 hover:text-red-500"><X size={12}/></button>
                                             </span>
                                         ))}
                                     </div>
                                 )}
                             </div>
                         )}
                    </div>

                    {/* Conditional Fields based on Type */}
                    {(formData.type === RequestType.REGULAR_SWAP || formData.type === RequestType.EXTRA_SWAP) && (
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">Substituto (Quem irá cobrir?)</label>
                            <div className="relative">
                                <div 
                                    className="w-full border border-slate-300 bg-white text-slate-900 p-3 rounded-lg flex items-center justify-between cursor-pointer"
                                    onClick={() => setSubstituteSearchOpen(!substituteSearchOpen)}
                                >
                                    <span className={formData.coveringEmployee ? 'text-slate-900 font-bold' : 'text-slate-400'}>
                                        {formData.coveringEmployee || 'Buscar funcionário...'}
                                    </span>
                                    <Search size={18} className="text-slate-400"/>
                                </div>
                                
                                {substituteSearchOpen && (
                                    <div className="absolute top-full left-0 w-full bg-white shadow-xl rounded-xl border border-slate-200 mt-1 z-20 max-h-60 overflow-y-auto">
                                        <input 
                                            autoFocus
                                            type="text" 
                                            placeholder="Digite o nome..." 
                                            className="w-full p-3 border-b border-slate-100 outline-none text-sm sticky top-0 bg-white"
                                            value={formData.coveringEmployee}
                                            onChange={(e) => setFormData({...formData, coveringEmployee: e.target.value})}
                                        />
                                        {filteredSubstitutes.map(u => (
                                            <div 
                                                key={u.id} 
                                                onClick={() => {
                                                    setFormData({...formData, coveringEmployee: u.name});
                                                    setSubstituteSearchOpen(false);
                                                }}
                                                className="p-3 hover:bg-slate-50 cursor-pointer border-b border-slate-50 last:border-0"
                                            >
                                                <p className="font-bold text-slate-800 text-sm">{u.name}</p>
                                                <p className="text-xs text-slate-500">{u.shift} • {u.contractType}</p>
                                            </div>
                                        ))}
                                        {filteredSubstitutes.length === 0 && (
                                            <div className="p-4 text-center text-slate-400 text-xs">Nenhum substituto elegível encontrado.</div>
                                        )}
                                    </div>
                                )}
                            </div>
                            <p className="text-[10px] text-slate-400 mt-1">
                                * Apenas funcionários do mesmo cargo ({currentUser.role}) e sem restrições de bloqueio são mostrados.
                            </p>
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Justificativa / Observação</label>
                        <textarea
                            required
                            rows={3}
                            value={formData.description}
                            onChange={(e) => setFormData({...formData, description: e.target.value})}
                            className="w-full border border-slate-300 bg-white text-slate-900 p-3 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none resize-none"
                            placeholder="Descreva o motivo da solicitação..."
                        />
                    </div>

                    <div className="pt-4 border-t border-slate-100 flex justify-end">
                         <button 
                            type="submit"
                            disabled={!!blockingReason || (formData.type !== RequestType.VACATION && selectedDates.length === 0) || ( (formData.type === RequestType.REGULAR_SWAP || formData.type === RequestType.EXTRA_SWAP) && !formData.coveringEmployee )}
                            className="bg-teal-600 text-white px-8 py-3 rounded-xl font-bold shadow-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                         >
                             <CheckCircle2 size={20} className="mr-2"/> 
                             Revisar e Assinar
                         </button>
                    </div>
                </form>
            </div>
        </div>
      )}

      {/* Document Preview Modal */}
      {showDocPreview && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in zoom-in-95">
              <div className="bg-white w-full max-w-4xl rounded-xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
                  <div className="bg-slate-800 p-4 flex justify-between items-center text-white">
                      <h3 className="font-bold flex items-center"><FileText className="mr-2"/> Pré-visualização do Documento</h3>
                      <button onClick={() => setShowDocPreview(false)}><X size={24}/></button>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto bg-slate-100 p-6">
                      <RequestDocument 
                          settings={settings}
                          batchDates={selectedDates}
                          request={{
                              id: 'PREVIEW',
                              userId: currentUser.id,
                              userName: currentUser.name,
                              userRole: currentUser.role,
                              type: formData.type,
                              dateStart: formData.type === RequestType.VACATION ? `${vacationYear}-${String(vacationMonth).padStart(2,'0')}` : selectedDates[0] || new Date().toISOString(),
                              description: formData.description,
                              status: RequestStatus.PENDING,
                              createdAt: new Date().toISOString(),
                              coveringEmployee: formData.coveringEmployee,
                              signatures: {
                                  requester: {
                                      name: currentUser.name,
                                      role: currentUser.role,
                                      corenOrMatricula: currentUser.coren || currentUser.matricula || '',
                                      date: new Date().toISOString(),
                                      signatureUrl: currentUser.signatureUrl || ''
                                  }
                              }
                          }}
                      />
                  </div>

                  <div className="p-4 border-t border-slate-200 bg-white flex justify-end gap-3">
                      <button 
                          onClick={() => setShowDocPreview(false)}
                          className="px-4 py-2 text-slate-600 font-bold hover:bg-slate-100 rounded-lg"
                      >
                          Voltar e Editar
                      </button>
                      <button 
                          onClick={confirmSubmission}
                          className="px-6 py-2 bg-teal-600 text-white font-bold rounded-lg hover:bg-teal-700 shadow-lg flex items-center"
                      >
                          <PenTool size={18} className="mr-2"/> Assinar e Enviar
                      </button>
                  </div>
              </div>
          </div>
      )}

    </div>
  );
};